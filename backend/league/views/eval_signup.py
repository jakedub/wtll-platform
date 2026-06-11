"""
Evaluation sign-up views.
Admin manages windows (open/close); parents submit sign-ups.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from league.models import EvaluationSignup, EvaluationSignupWindow, Division


# ── Serializers ───────────────────────────────────────────────────────────────

class EvalWindowSerializer(serializers.ModelSerializer):
    division_name = serializers.SerializerMethodField()
    signup_count = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationSignupWindow
        fields = ["id", "season_year", "division", "division_name",
                  "eval_date", "eval_location", "eval_time",
                  "is_open", "notes", "signup_count", "created_at", "updated_at"]
        read_only_fields = ["created_at", "updated_at"]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else "All Divisions"

    def get_signup_count(self, obj):
        return EvaluationSignup.objects.filter(
            season_year=obj.season_year,
            division=obj.division,
        ).count()


class EvalSignupSerializer(serializers.ModelSerializer):
    division_name = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationSignup
        fields = ["id", "season_year", "division", "division_name",
                  "player_first_name", "player_last_name", "player_dob",
                  "parent_name", "parent_email", "parent_phone",
                  "notes", "signed_up_at"]
        read_only_fields = ["signed_up_at"]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None


# ── Window management (admin) ─────────────────────────────────────────────────

class EvalWindowListCreateView(APIView):
    def get(self, request):
        year = request.query_params.get("year")
        qs = EvaluationSignupWindow.objects.select_related("division")
        if year:
            qs = qs.filter(season_year=year)
        return Response(EvalWindowSerializer(qs, many=True).data)

    def post(self, request):
        s = EvalWindowSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=400)


class EvalWindowDetailView(APIView):
    def _get(self, pk):
        try:
            return EvaluationSignupWindow.objects.select_related("division").get(pk=pk)
        except EvaluationSignupWindow.DoesNotExist:
            return None

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        s = EvalWindowSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=400)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Sign-up submissions ───────────────────────────────────────────────────────

class EvalSignupListCreateView(APIView):
    def get(self, request):
        year = request.query_params.get("year")
        division = request.query_params.get("division")
        qs = EvaluationSignup.objects.select_related("division")
        if year:
            qs = qs.filter(season_year=year)
        if division:
            qs = qs.filter(division_id=division)
        return Response(EvalSignupSerializer(qs, many=True).data)

    def post(self, request):
        s = EvalSignupSerializer(data=request.data)
        if s.is_valid():
            s.save()
            return Response(s.data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=400)


class EvalSignupDeleteView(APIView):
    def delete(self, request, pk):
        try:
            EvaluationSignup.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except EvaluationSignup.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
