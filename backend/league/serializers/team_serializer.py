from rest_framework import serializers
from league.serializers.division_serializer import DivisionSerializer
from league.models.teams import Team

class TeamSerializer(serializers.ModelSerializer):
    division = DivisionSerializer(read_only=True)
    class Meta:
        model = Team
        fields = ['id', 'name', 'coach', 'year', 'division', 'assistant_coach', 'jersey_color', 'jersey_code', 'team_type', 'is_active', 'created_at']
    year = serializers.IntegerField()
