"""
Team management views — edit coaches, assign/remove players, update home location.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from league.models import Team, Player
from league.models.player_program_enrollment import PlayerProgramEnrollment
from league.models.program import Program


# ── Serializers ───────────────────────────────────────────────────────────────

class TeamRosterPlayerSerializer(serializers.ModelSerializer):
    is_pitcher = serializers.SerializerMethodField()
    is_catcher  = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = ["id", "first_name", "last_name", "date_of_birth", "jersey_size", "sport", "is_pitcher", "is_catcher"]

    def get_is_pitcher(self, obj):
        if obj.pitch_counts.exists():
            return True
        ev = obj.evaluations.filter(evaluation_type="pre").order_by("-season_year").first()
        return bool(ev and (ev.total_pitching or 0) > 0)

    def get_is_catcher(self, obj):
        ev = obj.evaluations.filter(evaluation_type="pre").order_by("-season_year").first()
        return bool(ev and (ev.total_catcher or 0) > 0)


class TeamManageSerializer(serializers.ModelSerializer):
    division_name  = serializers.SerializerMethodField()
    roster         = serializers.SerializerMethodField()
    sport          = serializers.SerializerMethodField()
    program_type   = serializers.SerializerMethodField()
    program_label  = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            "id", "name", "year", "division", "division_name",
            "coach", "assistant_coach", "jersey_color", "home_location",
            "is_active", "sport", "program_type", "program_label", "roster",
        ]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None

    def get_sport(self, obj):
        if obj.division:
            name = obj.division.name.lower()
            if "softball" in name:
                return "softball"
        return "baseball"

    def get_program_type(self, obj):
        if obj.division and obj.division.program:
            return obj.division.program.program_type
        return None

    def get_program_label(self, obj):
        from league.models.program import PROGRAM_TYPES
        labels = dict(PROGRAM_TYPES)
        if obj.division and obj.division.program:
            return labels.get(obj.division.program.program_type, obj.division.program.program_type)
        return None

    def get_roster(self, obj):
        players = Player.objects.filter(
            enrollments__team=obj,
            is_archived=False,
        ).distinct().order_by("last_name", "first_name")
        return TeamRosterPlayerSerializer(players, many=True).data


# ── Views ─────────────────────────────────────────────────────────────────────

class TeamManageListView(APIView):
    """
    GET /api/team-manage/?year=<year>&sport=<baseball|softball>&program_type=<type>
    Returns all teams with coach info and roster.
    """

    def get(self, request):
        qs = Team.objects.select_related("division__program").filter(is_active=True)

        year = request.query_params.get("year")
        if year:
            qs = qs.filter(year=year)

        sport = request.query_params.get("sport", "").lower()
        if sport == "softball":
            qs = qs.filter(division__name__icontains="softball")
        elif sport == "baseball":
            qs = qs.exclude(division__name__icontains="softball")

        # Filter by program type via division → program
        program_type = request.query_params.get("program_type", "").upper()
        if program_type and program_type != "ALL":
            qs = qs.filter(division__program__program_type=program_type)

        # Hide teams whose program is closed (default: hide)
        hide_closed = request.query_params.get("hide_closed", "true").lower()
        if hide_closed == "true":
            qs = qs.exclude(division__program__season_closed=True)

        return Response(TeamManageSerializer(qs.order_by("division__name", "name"), many=True).data)


class TeamManageDetailView(APIView):
    """
    GET  /api/team-manage/<id>/  — team detail + roster
    PATCH /api/team-manage/<id>/ — update coach, assistant_coach, home_location, jersey_color
    """

    def get(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        return Response(TeamManageSerializer(team).data)

    def patch(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        allowed = {"coach", "assistant_coach", "home_location", "jersey_color", "name"}
        for field in allowed:
            if field in request.data:
                setattr(team, field, request.data[field])
        # Division FK — accept null or a division ID
        if "division" in request.data:
            div_val = request.data["division"]
            team.division_id = int(div_val) if div_val else None
        team.save()
        return Response(TeamManageSerializer(team).data)


class TeamPlayerAssignView(APIView):
    """
    POST /api/team-manage/<id>/assign/  { player_id }
    Assign a player to this team by updating their enrollment.
    """

    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        player_id = request.data.get("player_id")
        if not player_id:
            return Response({"error": "player_id required."}, status=400)

        player = get_object_or_404(Player, pk=player_id)
        program = Program.objects.filter(is_active=True).first()

        # Find existing enrollment for this division, or create one
        enrollment, _ = PlayerProgramEnrollment.objects.update_or_create(
            player=player,
            program=program,
            defaults={"division": team.division, "team": team},
        )
        return Response({
            "player_id": player.id,
            "player_name": player.full_name,
            "team_id": team.id,
            "team_name": team.name,
        }, status=status.HTTP_201_CREATED)


class TeamPlayerRemoveView(APIView):
    """
    DELETE /api/team-manage/<id>/players/<player_id>/
    Remove a player from this team (set team=None on their enrollment).
    """

    def delete(self, request, pk, player_id):
        team = get_object_or_404(Team, pk=pk)
        player = get_object_or_404(Player, pk=player_id)

        updated = PlayerProgramEnrollment.objects.filter(
            player=player, team=team
        ).update(team=None)

        if updated == 0:
            return Response({"error": "Player is not on this team."}, status=404)

        return Response({"removed": True, "player_id": player_id})


class FreeAgentsView(APIView):
    """
    GET /api/team-manage/free-agents/?division=<id>&year=<year>
    Players enrolled in a division but not assigned to a team.
    """

    def get(self, request):
        division_id = request.query_params.get("division")
        year = request.query_params.get("year")

        qs = Player.objects.filter(
            enrollments__team__isnull=True,
            is_archived=False,
        ).distinct()

        if division_id:
            qs = qs.filter(enrollments__division_id=division_id)

        if year:
            qs = qs.filter(enrollments__program__isnull=False)

        return Response([
            {"id": p.id, "first_name": p.first_name, "last_name": p.last_name,
             "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None}
            for p in qs.order_by("last_name", "first_name")
        ])
