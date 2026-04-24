from rest_framework import serializers
from league.models.player_program_enrollment import PlayerProgramEnrollment
from league.models.players import Player
from league.models.program import Program


class PlayerProgramEnrollmentSerializer(serializers.ModelSerializer):
    """
    Read/write serializer for PlayerProgramEnrollment.

    Read: returns nested player/program/division/team detail.
    Write: accepts player_id, program_id, division, team as IDs.

    label is a computed field used by the admin AJAX dropdown —
    returns "Division > Team (Program)" for display in the select.
    """

    # Nested read-only detail
    player_name = serializers.CharField(source="player.full_name", read_only=True)
    program_name = serializers.CharField(source="program.name", read_only=True)
    division_name = serializers.CharField(source="division.name", read_only=True)
    team_name = serializers.CharField(source="team.name", read_only=True)

    # Write-only ID fields
    player_id = serializers.PrimaryKeyRelatedField(
        queryset=Player.objects.all(),
        source="player",
        write_only=True,
    )
    program_id = serializers.PrimaryKeyRelatedField(
        queryset=Program.objects.all(),
        source="program",
        write_only=True,
    )

    # Computed label for admin dropdown
    label = serializers.SerializerMethodField()

    class Meta:
        model = PlayerProgramEnrollment
        fields = [
            "id",
            # Read
            "player_name",
            "program_name",
            "division_name",
            "team_name",
            # Write
            "player_id",
            "program_id",
            "division",
            "team",
            # Admin dropdown
            "label",
        ]

    def get_label(self, obj):
        division = obj.division.name if obj.division else "No Division"
        team = obj.team.name if obj.team else "No Team"
        program = obj.program.name if obj.program else ""
        return f"{division} > {team}" + (f" ({program})" if program else "")