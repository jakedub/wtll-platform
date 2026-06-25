"""
Migration 0051 — Add address field to BoundaryLeague.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0050_leaguelocation_league_fk"),
    ]

    operations = [
        migrations.AddField(
            model_name="boundaryleague",
            name="address",
            field=models.CharField(
                blank=True,
                default="",
                max_length=255,
                help_text="Full street address for this league's home facility",
            ),
        ),
    ]
