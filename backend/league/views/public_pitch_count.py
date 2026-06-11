"""
Public pitch-count summary endpoint.
Returns all flagged pitchers (is_pitcher=True, baseball, not archived)
with their current rest status.  No authentication required.
"""
from datetime import date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from league.models.players import Player
from league.models.pitch_count import PitchCount
from league.services.pitching_engine import get_player_pitch_status


class PublicPitchCountView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = date.today()

        # All active, non-archived pitchers
        pitchers = (
            Player.objects
            .filter(is_pitcher=True, is_archived=False, is_active=True)
            .filter(sport__in=["baseball", "", None])
            .prefetch_related("enrollments__division", "enrollments__team")
            .order_by("last_name", "first_name")
        )

        # Pitches thrown today keyed by player id
        today_entries = (
            PitchCount.objects
            .filter(game_date=today, player__is_pitcher=True)
            .values("player_id", "pitches_thrown")
        )
        today_totals: dict[int, int] = {}
        for entry in today_entries:
            today_totals[entry["player_id"]] = (
                today_totals.get(entry["player_id"], 0) + entry["pitches_thrown"]
            )

        results = []
        for p in pitchers:
            # Most recent active enrollment → division name
            enrollment = (
                p.enrollments
                .select_related("division")
                .order_by("-id")
                .first()
            )
            division_name = (
                enrollment.division.name if enrollment and enrollment.division else "Unassigned"
            )

            try:
                status = get_player_pitch_status(p.id, as_of=today)
            except Exception:
                status = None

            results.append({
                "id": p.id,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "full_name": p.full_name,
                "division_name": division_name,
                "is_showcase": p.is_showcase,
                "pitches_today": today_totals.get(p.id, 0),
                "pitch_status": status,
            })

        return Response({"results": results})
