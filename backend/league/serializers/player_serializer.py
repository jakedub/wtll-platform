from rest_framework import serializers
from league.models.players import Player
from league.utils.district import eligibility_reason as _eligibility_reason


class PlayerSerializer(serializers.ModelSerializer):
    full_name      = serializers.SerializerMethodField()
    tier_spot      = serializers.SerializerMethodField()
    overall_total  = serializers.SerializerMethodField()
    pitcher_tier   = serializers.SerializerMethodField()
    catcher_tier   = serializers.SerializerMethodField()
    # Roster display helpers
    division_name      = serializers.SerializerMethodField()
    division_id        = serializers.SerializerMethodField()
    team_name          = serializers.SerializerMethodField()
    eligibility_reason = serializers.SerializerMethodField()

    # Explicitly declare choice fields as CharField so blank strings are accepted.
    # DRF's auto-generated ChoiceField rejects "" even when blank=True on the model.
    batting_hand  = serializers.CharField(allow_blank=True, required=False)
    throwing_hand = serializers.CharField(allow_blank=True, required=False)
    sport         = serializers.CharField(allow_blank=True, required=False)
    program       = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = Player
        fields = [
            "id", "first_name", "last_name", "full_name", "date_of_birth",
            "batting_hand", "throwing_hand",
            "is_eligible", "is_allstar", "is_showcase", "interested_showcase", "residency_same",
            "is_pitcher", "is_catcher",
            "is_archived", "archived_at",
            "program", "sport",
            "address_line_1", "address_line_2", "city", "state", "zip_code",
            "latitude", "longitude", "in_district", "district_checked_at",
            "school_name", "teammate_request", "coach_request", "jersey_size",
            "tier", "tier_spot", "overall_total", "pitcher_tier", "catcher_tier",
            "division_name", "division_id", "team_name", "eligibility_reason",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at", "full_name",
            "tier_spot", "overall_total", "pitcher_tier", "catcher_tier",
            "division_name", "division_id", "team_name", "eligibility_reason",
            "is_eligible", "in_district", "district_checked_at", "latitude", "longitude",
            "archived_at",
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_tier_spot(self, obj):
        return obj.tier_spot

    def get_overall_total(self, obj):
        return obj.overall_total

    def get_pitcher_tier(self, obj):
        return obj.pitcher_tier_computed

    def get_catcher_tier(self, obj):
        return obj.catcher_tier_computed

    def _latest_enrollment(self, obj):
        return obj.enrollments.select_related("division", "team").order_by("-id").first()

    def get_division_name(self, obj):
        """Return division name from the most recent active enrollment."""
        e = self._latest_enrollment(obj)
        return e.division.name if e and e.division else None

    def get_division_id(self, obj):
        """Return division PK from the most recent active enrollment."""
        e = self._latest_enrollment(obj)
        return e.division_id if e else None

    def get_team_name(self, obj):
        """Return team name from the most recent active enrollment."""
        e = self._latest_enrollment(obj)
        return e.team.name if e and e.team else None

    def get_eligibility_reason(self, obj):
        """Why this player is (or isn't) eligible."""
        return _eligibility_reason(obj)
