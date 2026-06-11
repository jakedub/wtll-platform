"""
TeamCalendar management — add, edit, delete ICS subscriptions from the app UI.
"""
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from league.models.team_calendar import TeamCalendar
from league.models import Team


class TeamCalendarSerializer(serializers.ModelSerializer):
    team_name = serializers.SerializerMethodField()
    division_name = serializers.SerializerMethodField()
    last_synced_display = serializers.SerializerMethodField()

    class Meta:
        model = TeamCalendar
        fields = [
            "id", "team", "team_name", "division_name",
            "ics_url", "source", "is_active",
            "last_synced_at", "last_synced_display", "created_at",
        ]
        read_only_fields = ["created_at", "last_synced_at"]

    def get_team_name(self, obj):
        return obj.team.name if obj.team else None

    def get_division_name(self, obj):
        return obj.team.division.name if obj.team and obj.team.division else None

    def get_last_synced_display(self, obj):
        if not obj.last_synced_at:
            return "Never synced"
        from django.utils.timezone import localtime
        import datetime
        now = datetime.datetime.now(obj.last_synced_at.tzinfo)
        diff = now - obj.last_synced_at
        if diff.days == 0:
            hours = diff.seconds // 3600
            if hours == 0:
                return f"{diff.seconds // 60}m ago"
            return f"{hours}h ago"
        return f"{diff.days}d ago"


class TeamCalendarListCreateView(APIView):
    """
    GET  /api/team-calendars-manage/          — list all
    POST /api/team-calendars-manage/          — add new subscription
    """

    def get(self, request):
        qs = TeamCalendar.objects.select_related("team__division").order_by(
            "team__division__name", "team__name"
        )
        return Response(TeamCalendarSerializer(qs, many=True).data)

    def post(self, request):
        s = TeamCalendarSerializer(data=request.data)
        if s.is_valid():
            cal = s.save()
            return Response(TeamCalendarSerializer(cal).data, status=status.HTTP_201_CREATED)
        return Response(s.errors, status=400)


class TeamCalendarDetailView(APIView):
    """
    PATCH  /api/team-calendars-manage/<pk>/   — edit ICS URL, source, or is_active
    DELETE /api/team-calendars-manage/<pk>/   — remove subscription
    """

    def patch(self, request, pk):
        cal = get_object_or_404(TeamCalendar, pk=pk)
        s = TeamCalendarSerializer(cal, data=request.data, partial=True)
        if s.is_valid():
            return Response(TeamCalendarSerializer(s.save()).data)
        return Response(s.errors, status=400)

    def delete(self, request, pk):
        get_object_or_404(TeamCalendar, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
