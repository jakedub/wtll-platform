"""
Views for the Board Operations Hub — calendar events and checklist items.

Endpoints:
  GET  /board-hub/calendar/            list events (optional ?year= filter)
  POST /board-hub/calendar/            create event
  PATCH/DELETE /board-hub/calendar/<pk>/  update/delete event

  GET  /board-hub/checklist/           list items (optional ?group= filter)
  POST /board-hub/checklist/           create item
  PATCH/DELETE /board-hub/checklist/<pk>/ update/delete item
"""
from rest_framework.views      import APIView
from rest_framework.response   import Response
from rest_framework            import status
from django.shortcuts          import get_object_or_404

from league.models import BoardCalendarEvent, BoardChecklistItem
from league.serializers.board_hub_serializer import (
    BoardCalendarEventSerializer,
    BoardChecklistItemSerializer,
)


class CalendarEventListCreateView(APIView):
    def get(self, request):
        qs = BoardCalendarEvent.objects.all()
        year = request.query_params.get("year")
        if year:
            qs = qs.filter(year=year)
        return Response(BoardCalendarEventSerializer(qs, many=True).data)

    def post(self, request):
        ser = BoardCalendarEventSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class CalendarEventDetailView(APIView):
    def get_object(self, pk):
        return get_object_or_404(BoardCalendarEvent, pk=pk)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        ser = BoardCalendarEventSerializer(obj, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChecklistItemListCreateView(APIView):
    def get(self, request):
        qs = BoardChecklistItem.objects.all()
        group = request.query_params.get("group")
        if group:
            qs = qs.filter(group=group)
        return Response(BoardChecklistItemSerializer(qs, many=True).data)

    def post(self, request):
        ser = BoardChecklistItemSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response(ser.data, status=status.HTTP_201_CREATED)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


class ChecklistItemDetailView(APIView):
    def get_object(self, pk):
        return get_object_or_404(BoardChecklistItem, pk=pk)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        ser = BoardChecklistItemSerializer(obj, data=request.data, partial=True)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        self.get_object(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
