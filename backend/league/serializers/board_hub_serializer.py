from rest_framework import serializers
from league.models import BoardCalendarEvent, BoardChecklistItem


class BoardCalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BoardCalendarEvent
        fields = ["id", "month_year", "phase", "text", "owner", "color", "year", "sort_order"]


class BoardChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = BoardChecklistItem
        fields = ["id", "date_window", "item", "owner", "item_type", "group", "sort_order"]
