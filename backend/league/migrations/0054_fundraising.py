"""
Migration 0054 — Add fundraising models:
  FacilitiesLineItem, FundraisingCampaign, FundraisingDeposit
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0053_sitesettings_leagueidentity"),
        ("league", "0053_merge_20260624_1102"),
    ]

    operations = [
        migrations.CreateModel(
            name="FacilitiesLineItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phase", models.PositiveSmallIntegerField(
                    choices=[(1, "Phase 1"), (2, "Phase 2"), (3, "Phase 3")],
                    db_index=True,
                )),
                ("location", models.CharField(max_length=100)),
                ("description", models.CharField(max_length=200)),
                ("category", models.CharField(
                    max_length=20,
                    choices=[
                        ("INFRA", "Infrastructure"),
                        ("SAFETY", "Safety"),
                        ("AMENITY", "Amenity"),
                        ("FULL", "Full Build"),
                        ("ELECTRICAL", "Electrical"),
                    ],
                    default="INFRA",
                )),
                ("estimate_low",  models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ("estimate_high", models.DecimalField(max_digits=10, decimal_places=2, default=0)),
                ("notes",       models.TextField(blank=True, default="")),
                ("sort_order",  models.PositiveIntegerField(default=0)),
                ("is_complete", models.BooleanField(default=False)),
            ],
            options={"ordering": ["phase", "sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="FundraisingCampaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",        models.CharField(max_length=150)),
                ("description", models.TextField(blank=True, default="")),
                ("goal",        models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)),
                ("is_active",   models.BooleanField(default=True)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FundraisingDeposit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("campaign", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="deposits",
                    to="league.fundraisingcampaign",
                )),
                ("line_item", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="deposits",
                    to="league.facilitieslineitem",
                )),
                ("amount", models.DecimalField(max_digits=10, decimal_places=2)),
                ("date",   models.DateField()),
                ("notes",  models.TextField(blank=True, default="")),
            ],
            options={"ordering": ["-date", "-id"]},
        ),
    ]
