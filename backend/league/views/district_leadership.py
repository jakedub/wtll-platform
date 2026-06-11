"""
District Leadership API — CRUD for district and HQ contacts.
"""
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response

from league.models.district_leader import DistrictLeader, DISTRICT_POSITIONS


class DistrictLeaderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistrictLeader
        fields = [
            "id", "district_number", "is_hq",
            "name", "position", "contact_phone", "contact_email",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_district_number(self, value):
        if value is None:
            raise serializers.ValidationError("District number is required.")
        return value


class DistrictLeaderListView(APIView):
    """GET /api/district-leaders/   — list all
       POST /api/district-leaders/  — create
    """

    def get(self, request):
        qs = DistrictLeader.objects.all()
        return Response(DistrictLeaderSerializer(qs, many=True).data)

    def post(self, request):
        s = DistrictLeaderSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = s.save()
        return Response(DistrictLeaderSerializer(obj).data, status=status.HTTP_201_CREATED)


class DistrictLeaderDetailView(APIView):
    """GET /api/district-leaders/<pk>/
       PATCH /api/district-leaders/<pk>/
       DELETE /api/district-leaders/<pk>/
    """

    def _get(self, pk):
        try:
            return DistrictLeader.objects.get(pk=pk)
        except DistrictLeader.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        return Response(DistrictLeaderSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        s = DistrictLeaderSerializer(obj, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = s.save()
        return Response(DistrictLeaderSerializer(updated).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DistrictLeaderPositionsView(APIView):
    """GET /api/district-leaders/positions/  — list available position choices"""

    def get(self, request):
        return Response([{"value": v, "label": l} for v, l in DISTRICT_POSITIONS])
