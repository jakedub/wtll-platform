"""
February (mid-season) eligibility re-check.
Re-runs district boundary + school enrollment validation for a registration
date window and returns a before/after diff of eligibility status changes.
"""
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from league.models import Player
from league.utils.district import is_player_eligible, check_all_players_in_district, ELIGIBLE_SCHOOLS


class EligibilityRecheckView(APIView):
    """
    POST /api/eligibility/recheck/
    Body (all optional):
      registered_after:  ISO date string — only recheck players registered on/after this date
      registered_before: ISO date string — only recheck players registered on/before this date
      dry_run: bool — if true, return diff without saving changes

    Returns:
      {
        total_checked: int,
        changed: int,
        newly_eligible: [...player summaries],
        newly_ineligible: [...player summaries],
        unchanged_eligible: int,
        unchanged_ineligible: int,
        dry_run: bool,
      }
    """

    def post(self, request):
        registered_after  = request.data.get("registered_after")
        registered_before = request.data.get("registered_before")
        dry_run = bool(request.data.get("dry_run", False))

        # Build queryset — only players with lat/lng (already geocoded)
        qs = Player.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False,
        )

        if registered_after:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(registered_after)
                qs = qs.filter(created_at__date__gte=dt.date())
            except ValueError:
                return Response({"error": f"Invalid registered_after: {registered_after}"}, status=400)

        if registered_before:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(registered_before)
                qs = qs.filter(created_at__date__lte=dt.date())
            except ValueError:
                return Response({"error": f"Invalid registered_before: {registered_before}"}, status=400)

        players = list(qs)
        total_checked = len(players)

        newly_eligible   = []
        newly_ineligible = []
        unchanged_eligible   = 0
        unchanged_ineligible = 0
        to_update = []
        now = timezone.now()

        for player in players:
            old_eligible = player.is_eligible

            # Re-run district check
            from league.utils.district import is_point_in_district
            in_district = is_point_in_district(player.latitude, player.longitude)
            player.in_district = in_district
            player.district_checked_at = now

            # Re-run eligibility (district OR feeder school)
            new_eligible = is_player_eligible(player)
            player.is_eligible = new_eligible

            summary = {
                "id": player.id,
                "name": f"{player.first_name} {player.last_name}",
                "school": player.school_name or "",
                "address": ", ".join(filter(None, [player.address_line_1, player.city, player.state])),
                "in_district": in_district,
                "school_eligible": (player.school_name or "").strip() in ELIGIBLE_SCHOOLS,
            }

            if old_eligible and not new_eligible:
                newly_ineligible.append(summary)
            elif not old_eligible and new_eligible:
                newly_eligible.append(summary)
            elif new_eligible:
                unchanged_eligible += 1
            else:
                unchanged_ineligible += 1

            to_update.append(player)

        if not dry_run and to_update:
            Player.objects.bulk_update(
                to_update,
                ["in_district", "district_checked_at", "is_eligible"],
            )

        changed = len(newly_eligible) + len(newly_ineligible)

        return Response({
            "total_checked": total_checked,
            "changed": changed,
            "newly_eligible": newly_eligible,
            "newly_ineligible": newly_ineligible,
            "unchanged_eligible": unchanged_eligible,
            "unchanged_ineligible": unchanged_ineligible,
            "dry_run": dry_run,
            "filters": {
                "registered_after": registered_after,
                "registered_before": registered_before,
            },
        })
