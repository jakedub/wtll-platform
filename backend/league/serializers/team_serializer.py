from rest_framework import serializers
from league.serializers.division_serializer import DivisionSerializer
from league.models.teams import Team
from league.models.event import Event
from league.serializers.event_serializer import EventSerializer

class TeamSerializer(serializers.ModelSerializer):
    division = DivisionSerializer(read_only=True)
    events = serializers.SerializerMethodField()
    year = serializers.IntegerField()

    def get_events(self, obj):
        """
        Prefetch-aware event resolver.
        Uses TeamCalendar -> Event reverse relation when prefetched.
        Falls back to direct Team-based query if needed.
        """

        calendars = obj.calendars.all()

        events = []
        for cal in calendars:
            # Uses related_name="events" from Event.calendar FK
            events.extend(list(cal.events.all()))

        # If prefetched path produced results, return sorted
        if events:
            events.sort(key=lambda e: e.start_time or 0)
            return EventSerializer(events, many=True).data

        # Fallback: direct team lookup (safe, but slightly less precise)
        events = (
            Event.objects
            .filter(team=obj)
            .order_by("start_time")
        )

        return EventSerializer(events, many=True).data

    class Meta:
        model = Team
        fields = ['id', 'name', 'coach', 'year', 'division', 'assistant_coach', 'jersey_color', 'jersey_code', 'team_type', 'is_active', 'created_at', 'events']
