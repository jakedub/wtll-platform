"""
Migration 0050 — Add nullable BoundaryLeague FK to LeagueLocation.
This links a physical location (park, complex) to the LL organisation it belongs to.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0049_league_location"),
    ]

    operations = [
        migrations.AddField(
            model_name="leaguelocation",
            name="league",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="locations",
                to="league.boundaryleague",
                help_text="The Little League organisation this facility belongs to",
            ),
        ),
    ]
