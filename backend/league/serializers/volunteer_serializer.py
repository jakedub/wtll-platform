from rest_framework import serializers
from league.models import VolunteerSignup, Event


class VolunteerSignupSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = VolunteerSignup
        fields = ["id", "volunteer_name", "volunteer_email", "volunteer_phone", "role", "role_display", "notes", "signed_up_at"]
        read_only_fields = ["signed_up_at"]


class VolunteerGameSerializer(serializers.ModelSerializer):
    """Event with its volunteer signups embedded."""
    grounds_crew = serializers.SerializerMethodField()
    concessions = serializers.SerializerMethodField()
    grounds_count = serializers.SerializerMethodField()
    concessions_count = serializers.SerializerMethodField()
    team_name = serializers.SerializerMethodField()
    division_name = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "start_time", "end_time", "location",
            "team_name", "division_name", "opponent",
            "grounds_crew", "concessions",
            "grounds_count", "concessions_count",
            "concessions_closed",
        ]

    def get_team_name(self, obj):
        return obj.team.name if obj.team else None

    def get_division_name(self, obj):
        return obj.team.division.name if obj.team and obj.team.division else None

    def get_grounds_crew(self, obj):
        sups = obj.volunteer_signups.filter(role="GROUNDS")
        return VolunteerSignupSerializer(sups, many=True).data

    def get_concessions(self, obj):
        sups = obj.volunteer_signups.filter(role="CONCESSIONS")
        return VolunteerSignupSerializer(sups, many=True).data

    def get_grounds_count(self, obj):
        return obj.volunteer_signups.filter(role="GROUNDS").count()

    def get_concessions_count(self, obj):
        return obj.volunteer_signups.filter(role="CONCESSIONS").count()
