"""
Migration 0057 — Add FundraisingPlan model.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0056_sitesettings_evaluation_signups"),
    ]

    operations = [
        migrations.CreateModel(
            name="FundraisingPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",        models.CharField(max_length=150)),
                ("description", models.TextField(blank=True, default="")),
                ("uses_phases", models.BooleanField(default=False,
                    help_text="When True, line items are grouped by phase (1/2/3).")),
                ("color",       models.CharField(max_length=7, blank=True, default="",
                    help_text="Hex color code. If blank, a random color is assigned on first save.")),
                ("is_active",   models.BooleanField(default=True)),
                ("sort_order",  models.PositiveIntegerField(default=0)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["sort_order", "created_at"]},
        ),
    ]
