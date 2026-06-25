"""
Migration 0062 — Add quantity and unit_cost to BudgetLine.

When both are set: effective_estimate = quantity × unit_cost.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0061_merge_20260625_1051"),
    ]

    operations = [
        migrations.AddField(
            model_name="budgetline",
            name="quantity",
            field=models.PositiveIntegerField(
                blank=True, null=True,
                help_text="Number of units (e.g. 44 teams × $10 = $440).",
            ),
        ),
        migrations.AddField(
            model_name="budgetline",
            name="unit_cost",
            field=models.DecimalField(
                blank=True, null=True,
                max_digits=10, decimal_places=2,
                help_text="Cost per unit. Total = quantity × unit_cost.",
            ),
        ),
    ]
