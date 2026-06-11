from rest_framework import serializers
from league.models import Draft, DraftSelection, Team


class DraftSerializer(serializers.ModelSerializer):
    division_name = serializers.SerializerMethodField(read_only=True)
    selection_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Draft
        fields = ["id", "name", "year", "division", "division_name", "is_complete", "created_at", "selection_count"]
        read_only_fields = ["created_at"]

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None

    def get_selection_count(self, obj):
        return obj.selections.count()


class DraftSelectionSerializer(serializers.ModelSerializer):
    player_name = serializers.SerializerMethodField(read_only=True)
    team_name = serializers.SerializerMethodField(read_only=True)
    division_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DraftSelection
        fields = ["id", "player", "player_name", "team", "team_name", "division", "division_name", "selected_at"]
        read_only_fields = ["selected_at"]

    def get_player_name(self, obj):
        return f"{obj.player.first_name} {obj.player.last_name}"

    def get_team_name(self, obj):
        return obj.team.name if obj.team else None

    def get_division_name(self, obj):
        return obj.division.name if obj.division else None
