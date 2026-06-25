from rest_framework import generics
from league.models.divisions import Division
from league.serializers.division_serializer import DivisionSerializer


class DivisionListView(generics.ListAPIView):
    """
    GET /api/divisions/
    Query params:
      include_calendar=true  – include is_calendar_only divisions (Field Rental etc.)
      sport=baseball|softball – filter by program sport
    """
    serializer_class = DivisionSerializer

    def get_queryset(self):
        qs = Division.objects.select_related("program")
        if self.request.query_params.get("include_calendar", "").lower() != "true":
            qs = qs.filter(is_calendar_only=False)
        sport = self.request.query_params.get("sport", "")
        if sport:
            qs = qs.filter(program__sport__iexact=sport)
        return qs
