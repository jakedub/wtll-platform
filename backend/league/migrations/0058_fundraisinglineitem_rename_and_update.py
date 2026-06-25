"""
Migration 0058 — Rename FacilitiesLineItem → FundraisingLineItem,
add plan FK, make phase nullable, add quoted_price.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0057_fundraisingplan"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="FacilitiesLineItem",
            new_name="FundraisingLineItem",
        ),
        migrations.AddField(
            model_name="fundraisinglineitem",
            name="plan",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="line_items",
                to="league.fundraisingplan",
            ),
        ),
        migrations.AlterField(
            model_name="fundraisinglineitem",
            name="phase",
            field=models.PositiveSmallIntegerField(
                blank=True, null=True,
                choices=[(1, "Phase 1"), (2, "Phase 2"), (3, "Phase 3")],
                help_text="Only used when the plan has uses_phases=True.",
            ),
        ),
        migrations.AddField(
            model_name="fundraisinglineitem",
            name="quoted_price",
            field=models.DecimalField(
                blank=True, null=True,
                max_digits=10, decimal_places=2,
                help_text="Contractor quote. Null = not yet quoted.",
            ),
        ),
        migrations.AlterModelOptions(
            name="fundraisinglineitem",
            options={"ordering": ["plan", "phase", "sort_order", "id"]},
        ),
    ]
