from rest_framework import serializers
from league.models.pitch_count import PitchCount


class PitchCountSerializer(serializers.ModelSerializer):
    """
    Read and write pitch count entries.

    days_rest_required is intentionally excluded from writes —
    PitchCount.save() computes it from pitches_thrown automatically.

    Enrollment context (division, team) is returned as nested read-only
    fields so the frontend can display "Majors > Yankees" without a
    second request.
    """

    # Read-only enrollment context — pulled from the FK chain
    division_name = serializers.CharField(
        source="player_enrollment.division.name",
        read_only=True,
        default=None,
    )
    team_name = serializers.CharField(
        source="player_enrollment.team.name",
        read_only=True,
        default=None,
    )
    program_name = serializers.CharField(
        source="player_enrollment.program.name",
        read_only=True,
        default=None,
    )
    player_name = serializers.CharField(
        source="player.full_name",
        read_only=True,
    )

    class Meta:
        model = PitchCount
        fields = [
            "id",
            "player",
            "player_name",
            "player_enrollment",
            "division_name",
            "team_name",
            "program_name",
            "game_date",
            "pitches_thrown",
            "days_rest_required",
            "notes",
            "created_at",
        ]
        read_only_fields = ["days_rest_required", "created_at"]