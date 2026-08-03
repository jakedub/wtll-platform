"""
Program Year management.
"Starting a year" creates all programs + default divisions at once,
and sets existing active players to inactive pending re-import.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from league.models import Player, Division
from league.models.program import Program, PROGRAM_TYPES, DEFAULT_DIVISIONS, SOFTBALL_PROGRAM_TYPES


PROGRAM_TYPE_LABELS = dict(PROGRAM_TYPES)


class ProgramYearSerializer(serializers.ModelSerializer):
    program_type_label = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ["id", "name", "program_type", "program_type_label", "season_year", "sport", "is_active", "season_closed", "closed_at"]

    def get_program_type_label(self, obj):
        return PROGRAM_TYPE_LABELS.get(obj.program_type, obj.program_type)


class ProgramYearListView(APIView):
    """
    GET  /api/program-years/             — all programs grouped by year
    GET  /api/program-years/?year=2026   — programs for a specific year
    """

    def get(self, request):
        qs = Program.objects.all().order_by("-season_year", "program_type")
        year = request.query_params.get("year")
        if year:
            qs = qs.filter(season_year=year)

        # Group by year
        by_year: dict = {}
        for p in qs:
            yr = p.season_year
            if yr not in by_year:
                by_year[yr] = []
            by_year[yr].append(ProgramYearSerializer(p).data)

        return Response([
            {"year": yr, "programs": progs}
            for yr, progs in sorted(by_year.items(), reverse=True)
        ])


class StartProgramYearView(APIView):
    """
    POST /api/program-years/start/
    Body: { year: int, program_types: ["RECREATION", "ALL_STARS", ...] }

    Creates Program records + default divisions for each program type.
    Sets all existing active players to is_active=False (they become inactive
    until re-imported via the CSV import for the new year).

    Returns a summary of what was created.
    """

    def post(self, request):
        year = request.data.get("year")
        types_requested = request.data.get("program_types", list(PROGRAM_TYPE_LABELS.keys()))

        if not year:
            return Response({"error": "year is required."}, status=400)
        year = int(year)

        created_programs = []
        created_divisions = []
        skipped = []

        for ptype in types_requested:
            if ptype not in PROGRAM_TYPE_LABELS:
                skipped.append({"type": ptype, "reason": "Unknown program type"})
                continue

            # Fall Ball is multi-sport; all others use a single sport
            if ptype == "FALL_BALL":
                sport = "both"
            elif ptype in SOFTBALL_PROGRAM_TYPES:
                sport = "softball"
            else:
                sport = "baseball"
            name  = f"{year} {PROGRAM_TYPE_LABELS[ptype]}"

            prog, was_created = Program.objects.get_or_create(
                season_year=year,
                program_type=ptype,
                defaults={"name": name, "sport": sport, "is_active": True},
            )

            if not was_created:
                skipped.append({"type": ptype, "reason": f"Already exists: {prog.name}"})
                continue

            created_programs.append(prog.name)

            # Create default divisions and link them to this program
            for div_name, div_sport in DEFAULT_DIVISIONS.get(ptype, []):
                division, div_created = Division.objects.get_or_create(name=div_name)
                if div_created:
                    created_divisions.append(div_name)
                # Always ensure the program FK is set (backfills existing unlinked divisions too)
                if division.program_id != prog.pk:
                    division.program = prog
                    division.save(update_fields=["program"])

        # Deactivate all currently active players
        deactivated = Player.objects.filter(is_active=True, is_archived=False).update(is_active=False)

        return Response({
            "year": year,
            "programs_created": created_programs,
            "divisions_created": created_divisions,
            "skipped": skipped,
            "players_deactivated": deactivated,
            "message": (
                f"Started {year} program year. "
                f"{len(created_programs)} programs created, "
                f"{deactivated} players set to inactive (will reactivate on import)."
            ),
        }, status=status.HTTP_201_CREATED)


class ProgramYearAvailableTypesView(APIView):
    """GET /api/program-years/types/ — returns all available program types."""

    def get(self, request):
        return Response([
            {"value": v, "label": l}
            for v, l in PROGRAM_TYPES
        ])


class ProgramCloseView(APIView):
    """
    POST /api/program-years/<pk>/close/
    Marks a program's season as closed (read-only). Players remain active.

    POST /api/program-years/<pk>/reopen/
    Re-opens a previously closed program season.
    """

    def post(self, request, pk, action):
        import django.utils.timezone as tz
        try:
            program = Program.objects.get(pk=pk)
        except Program.DoesNotExist:
            return Response({"error": "Program not found."}, status=404)

        if action == "close":
            program.season_closed = True
            program.closed_at = tz.now()
            program.save(update_fields=["season_closed", "closed_at"])
            return Response({
                "id": program.id,
                "name": program.name,
                "season_closed": True,
                "closed_at": program.closed_at.isoformat(),
                "message": f"Season '{program.name}' has been closed.",
            })
        elif action == "reopen":
            program.season_closed = False
            program.closed_at = None
            program.save(update_fields=["season_closed", "closed_at"])
            return Response({
                "id": program.id,
                "name": program.name,
                "season_closed": False,
                "message": f"Season '{program.name}' has been re-opened.",
            })
        else:
            return Response({"error": "Invalid action."}, status=400)
