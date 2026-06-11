from rest_framework import generics
from rest_framework.response import Response
from league.models.divisions import Division
from league.serializers.division_serializer import DivisionSerializer


class DivisionListView(generics.ListAPIView):
    """
    GET /api/divisions/
    By default excludes calendar-only divisions (e.g. Field Rental).
    Pass ?include_calendar=true to include them (used by calendar/schedule views).
    """
    serializer_class = DivisionSerializer

    def get_queryset(self):
        qs = Division.objects.all()
        if self.request.query_params.get("include_calendar", "").lower() != "true":
            qs = qs.filter(is_calendar_only=False)
        return qs
