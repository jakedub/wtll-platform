from rest_framework import serializers
from league.models import Evaluation


class EvaluationSerializer(serializers.ModelSerializer):
    # Computed read-only fields
    total_hitting = serializers.ReadOnlyField()
    total_fielding = serializers.ReadOnlyField()
    total_throwing = serializers.ReadOnlyField()
    total_pitching = serializers.ReadOnlyField()
    total_catcher = serializers.ReadOnlyField()
    overall_total = serializers.ReadOnlyField()
    tier_spot = serializers.ReadOnlyField()

    # Inline player summary (read)
    player_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Evaluation
        fields = [
            "id",
            "player",
            "player_detail",
            "season_year",
            "evaluation_type",
            # Hitting
            "hitting_power",
            "hitting_contact",
            "hitting_form",
            # Fielding
            "fielding_form",
            "fielding_glove",
            "fielding_hustle",
            # Throwing
            "throwing_form",
            "throwing_speed",
            "throwing_accuracy",
            # Pitching
            "pitching_speed",
            "pitching_accuracy",
            # Catcher
            "catcher_receiving",
            "catcher_blocking",
            # Computed
            "total_hitting",
            "total_fielding",
            "total_throwing",
            "total_pitching",
            "total_catcher",
            "overall_total",
            "tier_spot",
            "created_at",
        ]

    def get_player_detail(self, obj):
        player = obj.player
        # Get division via latest enrollment
        enrollment = player.enrollments.order_by("-id").first()
        division_name = enrollment.division.name if enrollment and enrollment.division else None
        return {
            "id": player.id,
            "first_name": player.first_name,
            "last_name": player.last_name,
            "full_name": player.full_name,
            "division": division_name,
            "program": player.program,
            "sport": player.sport,
        }
