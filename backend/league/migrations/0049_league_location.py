"""
Migration 0049 — LeagueLocation + LocationField models
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0048_boundaryleague_league_id_to_charfield"),
    ]

    operations = [
        migrations.CreateModel(
            name="LeagueLocation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name",       models.CharField(max_length=200)),
                ("short_name", models.CharField(blank=True, default="", max_length=80)),
                ("address",    models.CharField(blank=True, default="", max_length=255)),
                ("city",       models.CharField(blank=True, default="", max_length=100)),
                ("state",      models.CharField(blank=True, default="OH", max_length=50)),
                ("zip_code",   models.CharField(blank=True, default="", max_length=20)),
                ("district",   models.CharField(blank=True, default="", help_text="e.g. 'District 8'", max_length=50)),
                ("is_home",    models.BooleanField(default=False, help_text="True = WTLL home field")),
                ("notes",      models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "League Location",
                "verbose_name_plural": "League Locations",
                "ordering": ["-is_home", "name"],
            },
        ),
        migrations.CreateModel(
            name="LocationField",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("location",     models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="fields", to="league.leaguelocation")),
                ("name",         models.CharField(help_text="e.g. 'Field 7', 'Main Diamond'", max_length=100)),
                ("division_tag", models.CharField(blank=True, default="", help_text="Optional: which division typically uses this field", max_length=100)),
                ("sort_order",   models.PositiveSmallIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Location Field",
                "verbose_name_plural": "Location Fields",
                "ordering": ["sort_order", "name"],
            },
        ),
    ]
