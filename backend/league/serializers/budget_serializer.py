from rest_framework import serializers
from league.models import BudgetLine, BudgetApproval


class BudgetLineSerializer(serializers.ModelSerializer):
    effective_estimate = serializers.ReadOnlyField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = BudgetLine
        fields = [
            "id", "year", "category", "category_display",
            "item", "sub_group", "owner_role", "is_revenue",
            "actual", "estimate", "estimate_override",
            "effective_estimate", "notes", "sort_order",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class BudgetApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetApproval
        fields = ["id", "year", "approved_by", "approved_at", "notes"]
        read_only_fields = ["approved_at"]
