from rest_framework import serializers
from league.models import AllStarSelection


class AllStarSelectionSerializer(serializers.ModelSerializer):
    # Computed
    paperwork_complete = serializers.ReadOnlyField()
    docs_required = serializers.ReadOnlyField()
    docs_complete = serializers.ReadOnlyField()

    # Player info (read)
    player_first_name = serializers.CharField(source="player.first_name", read_only=True)
    player_last_name = serializers.CharField(source="player.last_name", read_only=True)
    player_dob = serializers.CharField(source="player.date_of_birth", read_only=True)
    player_school = serializers.CharField(source="player.school_name", read_only=True)
    player_is_eligible = serializers.BooleanField(source="player.is_eligible", read_only=True)
    player_sport = serializers.CharField(source="player.sport", read_only=True)

    # Division info (read)
    division_name = serializers.SerializerMethodField()

    class Meta:
        model = AllStarSelection
        fields = [
            "id",
            "player",
            "player_first_name",
            "player_last_name",
            "player_dob",
            "player_school",
            "player_is_eligible",
            "player_sport",
            "division",
            "division_name",
            "season_year",
            "is_returning",
            # Paperwork
            "doc_tournament_verification",
            "doc_team_affidavit",
            "doc_uniforms_ordered",
            "doc_ll_patches",
            "doc_drivers_license",
            "doc_birth_certificate",
            "doc_residency_proof",
            "residency_type",
            # Computed
            "paperwork_complete",
            "docs_required",
            "docs_complete",
            "notes",
            "selected_at",
            "updated_at",
        ]
        read_only_fields = ["selected_at", "updated_at"]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None
