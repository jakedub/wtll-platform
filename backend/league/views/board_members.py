"""
Board Members API — CRUD for the league board roster.
"""
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response

from league.models.board_member import BoardMember, BOARD_ROLES, SPORT_ROLES


class BoardMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    sport     = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = BoardMember
        fields = [
            "id", "first_name", "last_name", "full_name",
            "role", "sport", "email", "phone", "notes",
            "is_active", "sort_order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "full_name", "created_at", "updated_at"]


class BoardMemberListView(APIView):
    """GET /api/board-members/   — list all (active by default)
       POST /api/board-members/  — create
    """

    def get(self, request):
        include_inactive = request.query_params.get("all", "false").lower() == "true"
        qs = BoardMember.objects.all()
        if not include_inactive:
            qs = qs.filter(is_active=True)
        return Response(BoardMemberSerializer(qs, many=True).data)

    def post(self, request):
        s = BoardMemberSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        member = s.save()
        return Response(BoardMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class BoardMemberDetailView(APIView):
    """GET /api/board-members/<pk>/
       PATCH /api/board-members/<pk>/
       DELETE /api/board-members/<pk>/
    """

    def _get(self, pk):
        try:
            return BoardMember.objects.get(pk=pk)
        except BoardMember.DoesNotExist:
            return None

    def get(self, request, pk):
        m = self._get(pk)
        if not m:
            return Response({"error": "Not found."}, status=404)
        return Response(BoardMemberSerializer(m).data)

    def patch(self, request, pk):
        m = self._get(pk)
        if not m:
            return Response({"error": "Not found."}, status=404)
        s = BoardMemberSerializer(m, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = s.save()
        return Response(BoardMemberSerializer(updated).data)

    def delete(self, request, pk):
        m = self._get(pk)
        if not m:
            return Response({"error": "Not found."}, status=404)
        m.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BoardRolesView(APIView):
    """GET /api/board-members/roles/  — list available role choices"""

    def get(self, request):
        return Response([{"value": v, "label": l} for v, l in BOARD_ROLES])
