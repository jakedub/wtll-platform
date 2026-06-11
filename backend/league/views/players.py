from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView

from league.models.players import Player
from league.models.pitch_count import PitchCount
from league.models.player_program_enrollment import PlayerProgramEnrollment

from league.serializers.player_serializer import PlayerSerializer
from league.serializers.pitch_count_serializer import PitchCountSerializer
from league.serializers.player_program_enrollment_serializer import PlayerProgramEnrollmentSerializer

from league.services.pitching_engine import get_player_pitch_status
from .helpers import success, error


class PlayerListView(generics.ListAPIView):
    """
    GET /api/players/

    Query params:
      division  (int)   — filter by enrollment division
      team      (int)   — filter by enrollment team
      is_eligible (bool) — filter by eligibility flag
    """
    serializer_class = PlayerSerializer

    def get_queryset(self):
        qs = Player.objects.prefetch_related(
            "enrollments__division",
            "enrollments__team",
            "enrollments__program",
        )

        division_id = self.request.query_params.get("division")
        if division_id:
            qs = qs.filter(enrollments__division_id=division_id)

        team_id = self.request.query_params.get("team")
        if team_id:
            qs = qs.filter(enrollments__team_id=team_id)

        is_eligible = self.request.query_params.get("is_eligible")
        if is_eligible is not None:
            qs = qs.filter(is_eligible=is_eligible.lower() == "true")

        sport = self.request.query_params.get("sport")
        if sport:
            if sport.lower() == "baseball":
                # Treat blank/null sport as baseball (legacy imports)
                qs = qs.filter(sport__in=["baseball", "", None])
            else:
                qs = qs.filter(sport__iexact=sport)

        # By default hide archived players; pass ?archived=true to see them
        archived = self.request.query_params.get("archived", "false")
        qs = qs.filter(is_archived=(archived.lower() == "true"))

        # By default show only active players; pass ?active=false to see inactive
        active_param = self.request.query_params.get("active", "true")
        if active_param.lower() != "all":
            qs = qs.filter(is_active=(active_param.lower() != "false"))

        return qs.distinct()


class PlayerDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/players/<player_id>/"""
    serializer_class = PlayerSerializer
    lookup_url_kwarg = "player_id"
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return Player.objects.prefetch_related(
            "enrollments__division",
            "enrollments__team",
            "enrollments__program",
        )

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)


class PlayerEnrollmentsView(generics.ListAPIView):
    """
    GET /api/players/<player_id>/enrollments/

    Returns all enrollments for a player.
    Used by the PitchCount admin AJAX dropdown.
    """
    serializer_class = PlayerProgramEnrollmentSerializer

    def get_queryset(self):
        player_id = self.kwargs["player_id"]
        get_object_or_404(Player, pk=player_id)
        return (
            PlayerProgramEnrollment.objects
            .filter(player_id=player_id)
            .select_related("program", "division", "team")
            .order_by("division__name", "team__name")
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return success(serializer.data)


class PlayerPitchStatusView(APIView):
    """
    GET /api/players/<player_id>/pitch-status/

    Runs the pitching engine and returns current rest status,
    risk level, next available date, and warnings.
    """
    def get(self, request, player_id):
        get_object_or_404(Player, pk=player_id)
        try:
            result = get_player_pitch_status(player_id)
            return success(result)
        except Exception as e:
            return error(
                f"Could not compute pitch status: {e}",
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PlayerPitchHistoryView(generics.ListAPIView):
    """
    GET /api/players/<player_id>/pitch-history/

    Returns all pitch log entries for a player, most recent first.
    Each entry includes enrollment context (division, team, program).
    """
    serializer_class = PitchCountSerializer

    def get_queryset(self):
        player_id = self.kwargs["player_id"]
        get_object_or_404(Player, pk=player_id)
        return (
            PitchCount.objects
            .filter(player_id=player_id)
            .select_related(
                "player_enrollment__division",
                "player_enrollment__team",
                "player_enrollment__program",
            )
            .order_by("-game_date")
        )

# ── Archive / Restore / Delete ────────────────────────────────────────────────

from django.utils import timezone as tz
from rest_framework.views import APIView as _APIView
from rest_framework.response import Response as _Response
from rest_framework import status as _status


class PlayerArchiveView(_APIView):
    """POST /api/players/<id>/archive/  — soft-delete a player."""
    def post(self, request, player_id):
        player = get_object_or_404(Player, pk=player_id)
        player.is_archived = True
        player.archived_at = tz.now()
        player.save(update_fields=["is_archived", "archived_at"])
        return _Response({"archived": True, "id": player.id})


class PlayerRestoreView(_APIView):
    """POST /api/players/<id>/restore/  — restore a player from the recycling bin."""
    def post(self, request, player_id):
        player = get_object_or_404(Player, pk=player_id)
        player.is_archived = False
        player.archived_at = None
        player.save(update_fields=["is_archived", "archived_at"])
        return _Response({"restored": True, "id": player.id})


class PlayerPermanentDeleteView(_APIView):
    """DELETE /api/players/<id>/  — permanently delete (only if already archived)."""
    def delete(self, request, player_id):
        player = get_object_or_404(Player, pk=player_id)
        if not player.is_archived:
            return _Response(
                {"error": "Player must be archived before permanent deletion."},
                status=_status.HTTP_400_BAD_REQUEST,
            )
        player.delete()
        return _Response(status=_status.HTTP_204_NO_CONTENT)
