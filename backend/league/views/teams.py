from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404

from league.models.teams import Team
from league.models.player_program_enrollment import PlayerProgramEnrollment

from league.models.pitch_count import PitchCount
from league.models.players import Player
from league.services.pitching_engine import get_player_pitch_status
from league.serializers.team_serializer import TeamSerializer


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/teams/          — list all teams
    GET /api/teams/<id>/     — team detail

    Query params (list only):
      division  (int)  — filter by division ID
      is_active (bool) — filter by active status
    """

    serializer_class = TeamSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "year"]
    ordering = ["division__name", "name"]

    def get_queryset(self):
        qs = Team.objects.select_related("division").all()

        division_id = self.request.query_params.get("division")
        if division_id:
            qs = qs.filter(division_id=division_id)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")

        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "data": serializer.data})

    @action(detail=False, url_path=r"by-division/(?P<division_id>\d+)")
    def by_division(self, request, division_id=None):
        """
        GET /api/teams/by-division/<division_id>/
        Returns active teams for a specific division.
        """
        qs = Team.objects.select_related("division").filter(
            division_id=division_id, is_active=True
        )
        serializer = self.get_serializer(qs, many=True)
        return Response({"success": True, "data": serializer.data})
    
class TeamRostersView(APIView):
    def get(self, request, team_id):
        team = get_object_or_404(Team, pk=team_id)
        enrollments = (
            PlayerProgramEnrollment.objects
            .filter(team_id=team_id)
            .select_related("player")
        )
        data = []
        for enrollment in enrollments:
            player = enrollment.player
            last_pitch = (
                PitchCount.objects
                .filter(player_id=player.id)
                .order_by("-game_date")
                .first()
            )
            status = get_player_pitch_status(player.id)
            data.append({
                "player_id": player.id,
                "player_name": player.full_name,
                "last_pitch_count": last_pitch.pitches_thrown if last_pitch else None,
                "last_game_date": last_pitch.game_date if last_pitch else None,
                "status": status.get("status"),
            })
        return Response({"success": True, "data": data})
    
class TeamRosterWithPitchSummaryView(APIView):
    """
    GET /api/teams/<team_id>/roster-with-pitch-summary
    """

    def get(self, request, team_id):
        team = get_object_or_404(Team, pk=team_id)

        enrollments = (
            PlayerProgramEnrollment.objects
            .filter(team=team)
            .select_related("player", "division", "team")
        )

        roster = []

        for enrollment in enrollments:
            player = enrollment.player

            try:
                status = get_player_pitch_status(player.id)
            except Exception:
                status = None

            roster.append({
                "id": player.id,
                "player_name": f"{player.first_name} {player.last_name}",
                "division": enrollment.division.name if enrollment.division else None,
                "team": enrollment.team.name if enrollment.team else None,
                "pitch_status": status
            })

        return Response({
            "team_id": team.id,
            "team_name": team.name,
            "roster": roster
        })