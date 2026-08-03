"""
Team CRUD views — create, update, delete teams from the app UI.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from league.models import Team, Division


class TeamCRUDSerializer(serializers.ModelSerializer):
    division_name = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = [
            "id", "name", "year", "division", "division_name",
            "coach", "assistant_coach", "jersey_color", "home_location",
            "is_active",
        ]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None


class TeamCreateView(APIView):
    """POST /api/teams-manage/  — create a new team."""

    def post(self, request):
        s = TeamCRUDSerializer(data=request.data)
        if s.is_valid():
            team = s.save()
            return Response(TeamCRUDSerializer(team).data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=400)


class TeamUpdateDeleteView(APIView):
    """PATCH/DELETE /api/teams-manage/<pk>/"""

    def patch(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        s = TeamCRUDSerializer(team, data=request.data, partial=True)
        if s.is_valid():
            return Response(TeamCRUDSerializer(s.save()).data)
        return Response(s.errors, status=400)

    def delete(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        # Safety: don't delete if players are assigned
        from league.models.player_program_enrollment import PlayerProgramEnrollment
        if PlayerProgramEnrollment.objects.filter(team=team).exists():
            return Response(
                {"error": f"Cannot delete '{team.name}' — players are assigned. Remove all players from the team first."},
                status=400,
            )
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
