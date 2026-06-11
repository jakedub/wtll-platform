"""
Vendors API — CRUD for league vendor/supplier contacts.
"""
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response

from league.models.vendor import Vendor, VENDOR_CATEGORIES, BOARD_ROLES


class VendorSerializer(serializers.ModelSerializer):
    category_display   = serializers.CharField(source="get_category_display",  read_only=True)
    board_role_display = serializers.CharField(source="get_board_role_display", read_only=True)

    class Meta:
        model = Vendor
        fields = [
            "id", "name", "category", "category_display",
            "contact_name", "contact_phone", "contact_email",
            "website", "notes", "board_role", "board_role_display",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "category_display", "board_role_display", "created_at", "updated_at"]


class VendorListView(APIView):
    """GET /api/vendors/   — list all (optionally filtered by ?category=)
       POST /api/vendors/  — create
    """

    def get(self, request):
        qs = Vendor.objects.all()
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(category=cat)
        return Response(VendorSerializer(qs, many=True).data)

    def post(self, request):
        s = VendorSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        obj = s.save()
        return Response(VendorSerializer(obj).data, status=status.HTTP_201_CREATED)


class VendorDetailView(APIView):
    """GET /api/vendors/<pk>/
       PATCH /api/vendors/<pk>/
       DELETE /api/vendors/<pk>/
    """

    def _get(self, pk):
        try:
            return Vendor.objects.get(pk=pk)
        except Vendor.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        return Response(VendorSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        s = VendorSerializer(obj, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        updated = s.save()
        return Response(VendorSerializer(updated).data)

    def delete(self, request, pk):
        obj = self._get(pk)
        if not obj:
            return Response({"error": "Not found."}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorCategoriesView(APIView):
    """GET /api/vendors/categories/  — list available category choices"""

    def get(self, request):
        return Response([{"value": v, "label": l} for v, l in VENDOR_CATEGORIES])


class VendorBoardRolesView(APIView):
    """GET /api/vendors/board-roles/  — list available board role choices"""

    def get(self, request):
        return Response([{"value": v, "label": l} for v, l in BOARD_ROLES])
