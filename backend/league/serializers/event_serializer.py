from rest_framework import serializers
from league.models.event import Event


class EventSerializer(serializers.ModelSerializer):
    calendar = serializers.CharField(source="calendar.team.name", read_only=True)
    team_id = serializers.IntegerField(source="team.id", read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "team",
            "team_id",
            "team_name",
            "calendar",
            "title",
            "description",
            "event_type",
            "location",
            "field",
            "field_id",
            "start_time",
            "end_time",
            "opponent",
            "is_cancelled",
        ]