"""
Calendar sync endpoint — triggers ICS feed refresh for all active TeamCalendars.
"""
from rest_framework.views import APIView
from rest_framework.response import Response

from league.models.team_calendar import TeamCalendar
from league.services.calendar_ingestion import sync_team_calendar


class CalendarSyncView(APIView):
    """
    POST /api/calendars/sync/?sport=<baseball|softball>
    Syncs all active team calendars and returns a summary.
    """

    def post(self, request):
        sport = request.query_params.get("sport", "").lower()

        qs = TeamCalendar.objects.filter(is_active=True).select_related("team__division")

        if sport == "softball":
            qs = qs.filter(team__division__name__icontains="softball")
        elif sport == "baseball":
            qs = qs.exclude(team__division__name__icontains="softball")

        results = []
        total_created = total_updated = 0

        for cal in qs:
            try:
                r = sync_team_calendar(cal)
                results.append({
                    "team": cal.team.name,
                    "created": r["created"],
                    "updated": r["updated"],
                    "status": "ok",
                })
                total_created += r["created"]
                total_updated += r["updated"]
            except Exception as e:
                results.append({
                    "team": cal.team.name,
                    "error": str(e),
                    "status": "error",
                })

        return Response({
            "synced": len(results),
            "total_created": total_created,
            "total_updated": total_updated,
            "results": results,
        })
