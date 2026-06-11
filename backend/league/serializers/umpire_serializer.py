# league/serializers/umpire_serializer.py

from rest_framework import serializers
from league.models.umpire_signup import UmpireSignup
from league.models.event import Event


class UmpireSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = UmpireSignup
        fields = ["id", "event", "umpire_name", "umpire_email", "umpire_phone", "role", "signed_up_at"]
        read_only_fields = ["id", "signed_up_at"]

    def validate(self, data):
        event = data.get("event")
        role = data.get("role")

        # Check slot is not already taken (excluding current instance on update)
        qs = UmpireSignup.objects.filter(event=event, role=role)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"role": f"The {role} slot for this game is already taken."}
            )
        return data


class UmpireSignupInlineSerializer(serializers.ModelSerializer):
    """Compact version embedded inside a game listing."""
    class Meta:
        model = UmpireSignup
        fields = ["id", "umpire_name", "umpire_email", "umpire_phone", "role", "signed_up_at"]
        read_only_fields = ["id", "signed_up_at"]


class UmpireGameSerializer(serializers.ModelSerializer):
    """
    Event serializer enriched with umpire signup slots.
    Only used for the umpire-games list endpoint.
    """
    team_name = serializers.CharField(source="team.name", read_only=True)
    division_name = serializers.CharField(source="team.division.name", read_only=True)
    umpire_signups = UmpireSignupInlineSerializer(many=True, read_only=True)

    plate_filled = serializers.SerializerMethodField()
    base_filled = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "team_name",
            "division_name",
            "opponent",
            "start_time",
            "end_time",
            "location",
            "field",
            "field_id",
            "is_cancelled",
            "umpire_signups",
            "plate_filled",
            "base_filled",
        ]

    def get_plate_filled(self, obj) -> bool:
        return any(s.role == "PLATE" for s in obj.umpire_signups.all())

    def get_base_filled(self, obj) -> bool:
        return any(s.role == "BASE" for s in obj.umpire_signups.all())
