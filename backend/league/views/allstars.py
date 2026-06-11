"""
All Star selection and paperwork tracking views.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from league.models import AllStarSelection, Player
from league.serializers.allstar_serializer import AllStarSelectionSerializer


class AllStarListCreateView(APIView):
    """
    GET  /api/allstars/          — list selections (filter by year, division)
    POST /api/allstars/          — add a player to All Stars
    """

    def get(self, request):
        qs = AllStarSelection.objects.select_related("player", "division")

        year = request.query_params.get("year")
        if year:
            qs = qs.filter(season_year=year)

        division = request.query_params.get("division")
        if division:
            qs = qs.filter(division_id=division)

        sport = request.query_params.get("sport")
        if sport:
            qs = qs.filter(player__sport__iexact=sport)

        complete = request.query_params.get("paperwork_complete")
        if complete == "true":
            ids = [s.id for s in qs if s.paperwork_complete]
            qs = qs.filter(id__in=ids)
        elif complete == "false":
            ids = [s.id for s in qs if not s.paperwork_complete]
            qs = qs.filter(id__in=ids)

        return Response(AllStarSelectionSerializer(qs, many=True).data)

    def post(self, request):
        serializer = AllStarSelectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllStarDetailView(APIView):
    """
    GET    /api/allstars/<id>/   — retrieve
    PATCH  /api/allstars/<id>/   — update (paperwork fields, notes, returning status)
    DELETE /api/allstars/<id>/   — remove from All Stars
    """

    def _get(self, pk):
        try:
            return AllStarSelection.objects.select_related("player", "division").get(pk=pk)
        except AllStarSelection.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        return Response(AllStarSelectionSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        serializer = AllStarSelectionSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AllStarSummaryView(APIView):
    """
    GET /api/allstars/summary/?year=<year>
    Returns counts: total selected, paperwork complete, incomplete, by division.
    """

    def get(self, request):
        year = request.query_params.get("year")
        qs = AllStarSelection.objects.select_related("player", "division")
        if year:
            qs = qs.filter(season_year=year)

        selections = list(qs)
        complete = sum(1 for s in selections if s.paperwork_complete)
        by_division: dict = {}
        for s in selections:
            div = s.division.name if s.division else "Unknown"
            if div not in by_division:
                by_division[div] = {"total": 0, "complete": 0, "incomplete": 0}
            by_division[div]["total"] += 1
            if s.paperwork_complete:
                by_division[div]["complete"] += 1
            else:
                by_division[div]["incomplete"] += 1

        return Response({
            "total": len(selections),
            "complete": complete,
            "incomplete": len(selections) - complete,
            "by_division": by_division,
        })
