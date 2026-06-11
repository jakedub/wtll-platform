"""
Evaluation views: CRUD, list-by-division, CSV import, CSV export.
"""
import csv
import io
from datetime import date

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse

from league.models import Evaluation, Division
from league.serializers.evaluation_serializer import EvaluationSerializer
from league.services.evaluation_import import import_evaluations_from_file


# ── CRUD ──────────────────────────────────────────────────────────────────────

class EvaluationListCreateView(APIView):
    """
    GET  /api/evaluations/           — list all (optionally filter by division, year, type)
    POST /api/evaluations/           — create a single evaluation
    """

    def get(self, request):
        qs = Evaluation.objects.select_related("player").order_by("-season_year", "evaluation_type")

        division_id = request.query_params.get("division")
        if division_id:
            qs = qs.filter(player__enrollments__division_id=division_id)

        year = request.query_params.get("year")
        if year:
            qs = qs.filter(season_year=year)

        eval_type = request.query_params.get("type")
        if eval_type:
            qs = qs.filter(evaluation_type=eval_type)

        sport = request.query_params.get("sport")
        if sport:
            qs = qs.filter(player__sport__iexact=sport)

        serializer = EvaluationSerializer(qs.distinct(), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EvaluationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EvaluationDetailView(APIView):
    """
    GET    /api/evaluations/<id>/   — retrieve
    PUT    /api/evaluations/<id>/   — full update
    PATCH  /api/evaluations/<id>/   — partial update
    DELETE /api/evaluations/<id>/   — delete
    """

    def _get_object(self, pk):
        try:
            return Evaluation.objects.select_related("player").get(pk=pk)
        except Evaluation.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(EvaluationSerializer(obj).data)

    def put(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EvaluationSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EvaluationSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        obj = self._get_object(pk)
        if not obj:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── CSV Import ─────────────────────────────────────────────────────────────────

class EvaluationImportView(APIView):
    """
    POST /api/evaluations/import/
    Upload a CSV file to bulk-import evaluations.
    """

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.endswith(".csv"):
            return Response({"error": "File must be a CSV."}, status=status.HTTP_400_BAD_REQUEST)

        year = request.data.get("year", date.today().year)
        eval_type = request.data.get("evaluation_type", "pre")

        result = import_evaluations_from_file(file, default_year=int(year), default_type=eval_type)
        return Response(result)


# ── CSV Export ─────────────────────────────────────────────────────────────────

class EvaluationExportView(APIView):
    """
    GET /api/evaluations/export/?division=<id>&year=<year>
    Download evaluations as CSV (sorted by tier_spot, then overall_total desc).
    """

    def get(self, request):
        qs = Evaluation.objects.select_related("player").order_by("-season_year")

        division_id = request.query_params.get("division")
        if division_id:
            qs = qs.filter(player__enrollments__division_id=division_id)

        year = request.query_params.get("year", date.today().year)
        qs = qs.filter(season_year=year).distinct()

        # Sort by tier_spot, overall_total
        evals = sorted(qs, key=lambda e: (e.tier_spot or 99, -(e.overall_total or 0)))

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Tier", "Overall", "Last Name", "First Name", "Division",
            "Hit Power", "Hit Contact", "Hit Form", "Total Hitting",
            "Field Form", "Field Glove", "Field Hustle", "Total Fielding",
            "Throw Form", "Throw Speed", "Throw Acc", "Total Throwing",
            "Pitch Speed", "Pitch Acc", "Total Pitching",
            "Catch Recv", "Catch Block", "Total Catcher",
            "Year", "Type",
        ])

        for e in evals:
            enrollment = e.player.enrollments.order_by("-id").first()
            division_name = enrollment.division.name if enrollment and enrollment.division else ""
            writer.writerow([
                e.tier_spot or "",
                e.overall_total or "",
                e.player.last_name,
                e.player.first_name,
                division_name,
                e.hitting_power or "",
                e.hitting_contact or "",
                e.hitting_form or "",
                e.total_hitting,
                e.fielding_form or "",
                e.fielding_glove or "",
                e.fielding_hustle or "",
                e.total_fielding,
                e.throwing_form or "",
                e.throwing_speed or "",
                e.throwing_accuracy or "",
                e.total_throwing,
                e.pitching_speed or "",
                e.pitching_accuracy or "",
                e.total_pitching,
                e.catcher_receiving or "",
                e.catcher_blocking or "",
                e.total_catcher,
                e.season_year,
                e.evaluation_type,
            ])

        filename = f"evaluations_{year}.csv"
        resp = HttpResponse(output.getvalue(), content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp
