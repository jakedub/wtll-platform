from django.db.models import Max, F, Subquery, OuterRef
from rest_framework.views import APIView

from league.models.players import Player
from league.models.pitch_count import PitchCount
from .helpers import success
from league.services.pitching_engine import get_player_pitch_status

class PlayerPitchSummaryView(APIView):
    """
    Returns 1 row per player with their latest pitch entry.
    """

    def get(self, request):
        latest_pitch = PitchCount.objects.filter(
            player_id=OuterRef("pk")
        ).order_by("-game_date", "-created_at")

        qs = Player.objects.annotate(
            last_game_date=Subquery(latest_pitch.values("game_date")[:1]),
            last_pitches=Subquery(latest_pitch.values("pitches_thrown")[:1]),
            team_name=Subquery(
                latest_pitch.values("player_enrollment__team__name")[:1]
            ),
            division_name=Subquery(
                latest_pitch.values("player_enrollment__division__name")[:1]
            ),
        ).values(
            "id",
            "first_name",
            "last_name",
            "last_game_date",
            "last_pitches",
            "team_name",
            "division_name",
        )

        results = list(qs)

        enriched = []
        for p in results:
            try:
                status = get_player_pitch_status(p["id"])
            except Exception:
                status = None

            enriched.append({
                **p,
                "pitch_status": status,
            })

        return success(enriched)