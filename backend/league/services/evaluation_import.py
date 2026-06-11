"""
Evaluation CSV import service.
Expected columns: Player (or First Name + Last Name), Season Year, Evaluation Type,
Hitting Form/Power/Contact, Fielding Form/Glove/Hustle,
Throwing Form/Speed/Accuracy, Pitching Speed/Accuracy,
Catcher Receiving/Catcher Blocking.
"""
import csv
import io
from typing import Optional
from django.db import transaction
from league.models import Player, Evaluation


def _safe_int(value) -> Optional[int]:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        v = int(s)
        return v if 1 <= v <= 5 else None
    except (ValueError, TypeError):
        return None


CSV_TO_FIELD = {
    "Hitting Form": "hitting_form",
    "Hitting Power": "hitting_power",
    "Hitting Contact": "hitting_contact",
    "Fielding Form": "fielding_form",
    "Fielding Glove": "fielding_glove",
    "Fielding Hustle": "fielding_hustle",
    "Throwing Form": "throwing_form",
    "Throwing Speed": "throwing_speed",
    "Throwing Accuracy": "throwing_accuracy",
    "Pitching Speed": "pitching_speed",
    "Pitching Accuracy": "pitching_accuracy",
    "Catcher Receiving": "catcher_receiving",
    "Catcher Blocking": "catcher_blocking",
}

REQUIRED_COLUMNS = [
    "Hitting Form", "Hitting Power", "Hitting Contact",
    "Fielding Form", "Fielding Glove", "Fielding Hustle",
    "Throwing Form", "Throwing Speed", "Throwing Accuracy",
]


def import_evaluations_from_file(file, default_year: int = 2026, default_type: str = "pre") -> dict:
    text = file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    # Normalize headers
    rows = list(reader)
    if not rows:
        return {"processed": 0, "failures": [{"row": 1, "error": "Empty file"}]}

    # Validate required columns
    headers = set(rows[0].keys()) if rows else set()
    missing = [c for c in REQUIRED_COLUMNS if c not in headers]
    if missing:
        return {
            "processed": 0,
            "failures": [{"row": "header", "error": f"Missing columns: {', '.join(missing)}"}],
        }

    processed = 0
    failures = []
    seen_players: set[int] = set()

    for i, row in enumerate(rows, start=2):
        try:
            # Resolve player name
            full_name = (row.get("Player") or "").strip()
            if not full_name:
                first = (row.get("First Name") or "").strip()
                last = (row.get("Last Name") or "").strip()
                full_name = f"{first} {last}".strip()

            if not full_name:
                failures.append({"row": i, "error": "Missing player name"})
                continue

            parts = full_name.split(None, 1)
            if len(parts) < 2:
                failures.append({"row": i, "player": full_name, "error": "Need first and last name"})
                continue

            first_name, last_name = parts[0], parts[1]

            try:
                player = Player.objects.get(
                    first_name__iexact=first_name,
                    last_name__iexact=last_name,
                )
            except Player.DoesNotExist:
                failures.append({"row": i, "player": full_name, "error": "Player not found"})
                continue
            except Player.MultipleObjectsReturned:
                failures.append({"row": i, "player": full_name, "error": "Multiple players matched"})
                continue

            if player.id in seen_players:
                continue
            seen_players.add(player.id)

            season_year = _safe_int(row.get("Season Year")) or default_year
            eval_type = (row.get("Evaluation Type") or default_type).strip().lower()
            if eval_type not in ("pre", "post"):
                eval_type = default_type

            with transaction.atomic():
                evaluation, _ = Evaluation.objects.get_or_create(
                    player=player,
                    season_year=season_year,
                    evaluation_type=eval_type,
                )
                for csv_col, model_field in CSV_TO_FIELD.items():
                    setattr(evaluation, model_field, _safe_int(row.get(csv_col)))
                evaluation.save()

            processed += 1

        except Exception as e:
            failures.append({"row": i, "player": full_name if "full_name" in dir() else None, "error": str(e)})

    return {"processed": processed, "failure_count": len(failures), "failures": failures}
