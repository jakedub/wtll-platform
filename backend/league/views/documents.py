"""
Document upload and listing views.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from league.models import UploadedDocument


class UploadedDocumentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    extension = serializers.ReadOnlyField()
    filename = serializers.ReadOnlyField()

    class Meta:
        model = UploadedDocument
        fields = [
            "id", "folder_name", "display_name", "description", "tag",
            "url", "filename", "extension", "file_size", "uploaded_at",
        ]
        read_only_fields = ["uploaded_at", "file_size"]

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class DocumentListView(APIView):
    """GET /api/documents/?folder=<name>"""

    def get(self, request):
        qs = UploadedDocument.objects.all()
        folder = request.query_params.get("folder")
        if folder:
            qs = qs.filter(folder_name=folder)
        serializer = UploadedDocumentSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


class DocumentUploadView(APIView):
    """POST /api/documents/upload/  (multipart: folder_name, display_name, file, description, tag)"""
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        folder_name = request.data.get("folder_name", "").strip()
        display_name = request.data.get("display_name", file.name).strip()
        description = request.data.get("description", "").strip()
        tag = request.data.get("tag", "").strip()

        if not folder_name:
            return Response({"error": "folder_name required."}, status=400)

        doc = UploadedDocument.objects.create(
            folder_name=folder_name,
            display_name=display_name,
            file=file,
            description=description,
            tag=tag,
        )
        serializer = UploadedDocumentSerializer(doc, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    """PATCH /api/documents/<pk>/  — update display_name, description, tag, folder_name
       DELETE /api/documents/<pk>/ — delete document + file from disk
    """

    def patch(self, request, pk):
        try:
            doc = UploadedDocument.objects.get(pk=pk)
        except UploadedDocument.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        for field in ("display_name", "description", "tag", "folder_name"):
            if field in request.data:
                setattr(doc, field, request.data[field])
        doc.save()
        serializer = UploadedDocumentSerializer(doc, context={"request": request})
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            doc = UploadedDocument.objects.get(pk=pk)
        except UploadedDocument.DoesNotExist:
            return Response({"error": "Not found."}, status=404)
        # Remove file from disk
        if doc.file:
            try:
                import os
                if os.path.isfile(doc.file.path):
                    os.remove(doc.file.path)
            except Exception:
                pass
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
