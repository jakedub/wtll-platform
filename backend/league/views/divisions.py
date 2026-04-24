from rest_framework import generics
from league.models.divisions import Division
from league.serializers.division_serializer import DivisionSerializer


class DivisionListView(generics.ListAPIView):
    """GET /api/divisions/"""
    serializer_class = DivisionSerializer
    queryset = Division.objects.all()