# league/views/player_uploads.py

import logging
from datetime import datetime

import pandas as pd
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from league.models.player_program_enrollment import PlayerProgramEnrollment
from league.models.players import Player
from league.models.program import Program
from league.serializers.player_serializer import PlayerSerializer
from league.services.boolean_parser import parse_yes_no
from league.services.division_mapper import map_division
from league.services.jersey_normalizer import normalize_jersey_size

logger = logging.getLogger(__name__)

# Minimum columns the CSV must contain
REQUIRED_COLUMNS = [
    "Player First Name",
    "Player Last Name",
    "Player Birth Date",
]

DATE_FORMATS = ["%m/%d/%y", "%m/%d/%Y", "%Y-%m-%d"]


def _parse_date(raw: str, row_num: int):
    raw = str(raw).replace("“", "").replace("”", "").replace('"', "").replace("'", "").strip()
    if not raw:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format at row {row_num}: '{raw}'")


def _col(row, *names, default=""):
    """Return the first non-empty value found across the given column names."""
    for name in names:
        try:
            val = str(row.get(name, "") or "").strip()
            if val:
                return val
        except Exception:
            pass
    return default


class UploadPlayersView(APIView):
    """
    POST /api/players/import/

    Accepts a SportsConnect enrollment CSV (multipart/form-data, field = 'file').

    Handles both the legacy column layout and the 2026 extended layout which adds:
      Program Name, Division Name, Account First/Last Name, Player Gender,
      Player Unit, User Email, Cellphone, Little League School Name (duplicate),
      Years of Experience, Little League Eligibility, Player Id, Player Age.

    For each row:
      - Upserts a Player matched on first_name + last_name + date_of_birth.
      - Sets player.sport based on Division Name (softball divisions → "softball").
      - Creates/updates a PlayerProgramEnrollment with the resolved division.

    Returns:
        { inserted, updated, failures, summary }
    """

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.lower().endswith(".csv"):
            return Response({"error": "File must be a .csv"}, status=status.HTTP_400_BAD_REQUEST)

        # Optional explicit sport override from the frontend selector.
        # When provided, ALL players in the CSV are tagged with this sport
        # (overrides division/program-name inference).
        sport_override = request.data.get("sport", "").lower()
        if sport_override not in ("baseball", "softball"):
            sport_override = None  # ignore invalid values, fall back to inference

        # ── Parse CSV ─────────────────────────────────────────────────────────
        try:
            df = pd.read_csv(file, dtype=str, encoding="utf-8-sig")
        except Exception as exc:
            logger.error("Failed to parse CSV: %s", exc)
            return Response({"error": "Invalid CSV file."}, status=status.HTTP_400_BAD_REQUEST)

        # Normalise headers: strip whitespace + smart quotes
        df.columns = [
            col.strip()
               .replace("‘", "'").replace("’", "'")
               .replace("“", '"').replace("”", '"')
            for col in df.columns
        ]
        df = df.fillna("")

        # Validate required columns
        missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
        if missing:
            return Response(
                {"error": f"Missing required columns: {', '.join(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # pandas renames duplicate columns: "Little League School Name" →
        # "Little League School Name" and "Little League School Name.1"
        # We capture both so _col() picks whichever has a value.

        # Find or create the Recreation program for the current season year
        # (CSV imports are always for the Recreation program)
        import datetime as _dt
        current_year = _dt.date.today().year
        default_program = (
            Program.objects.filter(is_active=True, program_type="RECREATION").order_by("-season_year").first()
            or Program.objects.filter(is_active=True).order_by("-season_year").first()
        )

        inserted_ids, updated_ids, failures = [], [], []

        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                # ── Names ─────────────────────────────────────────────────────
                first_name = _col(row, "Player First Name")
                last_name  = _col(row, "Player Last Name")
                if not first_name or not last_name:
                    failures.append({"row": row_num, "error": "First or last name is blank."})
                    continue

                # ── Date of birth ─────────────────────────────────────────────
                dob = _parse_date(_col(row, "Player Birth Date"), row_num)

                # ── Address ───────────────────────────────────────────────────
                address_line_1 = _col(row, "Player Street")
                address_line_2 = _col(row, "Player Unit")   # new column
                city           = _col(row, "Player City")
                state_val      = _col(row, "Player State")
                zip_code       = _col(row, "Player Postal Code")

                # ── Contact ───────────────────────────────────────────────────
                email          = _col(row, "User Email")     # new column

                # ── Requests / preferences ────────────────────────────────────
                teammate_request = _col(row, "Teammate Request")
                coach_request    = _col(row, "Coach Request")

                # ── School (handles duplicate column pandas renames to .1) ────
                school_name = _col(
                    row,
                    "Little League School Name",
                    "Little League School Name.1",
                )

                # ── Booleans ──────────────────────────────────────────────────
                residency_raw  = _col(row,
                    "Is this player's residency eligibility address the same as the primary account holder's address?",
                    "Is this player's residency eligibility address the same as the primary account holder's address?",
                )
                showcase_raw   = _col(row,
                    "Is the player interested in trying out for Showcase (supplemental competitive games during the spring / summer season)?",
                    "Is the player interested in trying out for Showcase (supplemental competitive games during the spring / summer season)?",
                )
                residency_same       = parse_yes_no(residency_raw)
                interested_showcase  = parse_yes_no(showcase_raw)

                # ── Jersey ────────────────────────────────────────────────────
                jersey_raw  = _col(row, "Jersey Size")
                jersey_size = normalize_jersey_size(jersey_raw) if jersey_raw else ""

                # ── Division + sport ──────────────────────────────────────────
                division_raw = _col(row, "Division Name")
                division_obj = None
                sport        = "baseball"   # default

                if division_raw:
                    try:
                        division_obj, sport = map_division(division_raw)
                    except ValueError as div_err:
                        logger.warning("Row %s division error: %s", row_num, div_err)
                        failures.append({
                            "row": row_num,
                            "error": f"Division not mapped: {div_err} — player imported without division.",
                        })
                        # Non-fatal: player is still created, just without enrollment

                # Also infer sport from Program Name if division didn't set it
                program_name = _col(row, "Program Name").lower()
                if "softball" in program_name:
                    sport = "softball"

                # Frontend selector always wins — override whatever was inferred
                if sport_override:
                    sport = sport_override

                # ── Upsert Player ─────────────────────────────────────────────
                # Always set is_active=True on import — reactivates players
                # who were deactivated when the previous program year ended.
                player_defaults = {
                    "is_active": True,
                    "address_line_1":      address_line_1,
                    "address_line_2":      address_line_2,
                    "city":                city,
                    "state":               state_val,
                    "zip_code":            zip_code,
                    "email":               email,
                    "teammate_request":    teammate_request,
                    "coach_request":       coach_request,
                    "school_name":         school_name,
                    "residency_same":      residency_same,
                    "interested_showcase": interested_showcase,
                    "jersey_size":         jersey_size,
                    "sport":               sport,
                }

                qs = Player.objects.filter(
                    first_name=first_name,
                    last_name=last_name,
                    date_of_birth=dob,
                )

                if qs.count() > 1:
                    failures.append({
                        "row": row_num,
                        "error": f"Multiple players match {first_name} {last_name} ({dob}) — skipped.",
                    })
                    continue
                elif qs.exists():
                    player = qs.first()
                    for field, value in player_defaults.items():
                        setattr(player, field, value)
                    player.save()
                    updated_ids.append(player.id)
                else:
                    player = Player.objects.create(
                        first_name=first_name,
                        last_name=last_name,
                        date_of_birth=dob,
                        **player_defaults,
                    )
                    inserted_ids.append(player.id)

                # ── Upsert Enrollment ─────────────────────────────────────────
                if division_obj and default_program:
                    PlayerProgramEnrollment.objects.update_or_create(
                        player=player,
                        program=default_program,
                        defaults={"division": division_obj, "team": None},
                    )

            except Exception as exc:
                logger.error("Row %s failed: %s", row_num, exc, exc_info=True)
                failures.append({"row": row_num, "error": str(exc)})

        return Response(
            {
                "inserted": PlayerSerializer(Player.objects.filter(id__in=inserted_ids), many=True).data,
                "updated":  PlayerSerializer(Player.objects.filter(id__in=updated_ids), many=True).data,
                "failures": failures,
                "summary": {
                    "inserted_count": len(inserted_ids),
                    "updated_count":  len(updated_ids),
                    "failure_count":  len(failures),
                },
            },
            status=status.HTTP_200_OK,
        )
