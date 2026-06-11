"""
Migration: add BoundaryLeague and GeneratedKML tables.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0043_seed_district7_contacts"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoundaryLeague",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("league_id", models.IntegerField(unique=True)),
                ("league_name", models.CharField(max_length=200)),
                ("league_location", models.CharField(blank=True, max_length=200)),
                ("official_name", models.CharField(blank=True, max_length=200)),
                ("district", models.IntegerField(blank=True, null=True)),
                ("is_district_league", models.BooleanField(default=True)),
                ("shape_components", models.JSONField(default=list)),
                ("shared_boundary_with", models.CharField(blank=True, max_length=200)),
            ],
            options={"ordering": ["district", "league_name"]},
        ),
        migrations.CreateModel(
            name="GeneratedKML",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("district_key", models.CharField(
                    choices=[
                        ("wtll", "WTLL"),
                        ("8", "District 8"),
                        ("7", "District 7"),
                        ("combined", "D7 + D8 Combined"),
                    ],
                    max_length=10,
                    unique=True,
                )),
                ("kml_content", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("note", models.CharField(blank=True, max_length=200)),
            ],
            options={"verbose_name": "Generated KML", "verbose_name_plural": "Generated KMLs"},
        ),
    ]
