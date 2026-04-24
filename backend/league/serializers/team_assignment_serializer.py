from rest_framework import serializers
from league.models.team_assignment import TeamAssignment


class TeamAssignmentSerializer(serializers.ModelSerializer):
    team_id = serializers.IntegerField(source="team.id")
    team_name = serializers.CharField(source="team.name")
    division = serializers.CharField(source="team.division.name", allow_null=True)
    year = serializers.IntegerField(source="team.year")

    class Meta:
        model = TeamAssignment
        fields = [
            "id",
            "team_id",
            "team_name",
            "division",
            "year",
            "role",
        ]