"""Migration 0065 — Add little_league_id to LeagueIdentity."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0064_boardcalendarevent_boardchecklistitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="leagueidentity",
            name="little_league_id",
            field=models.CharField(
                max_length=30, blank=True, default="1140814",
                help_text="Official Little League ID number (e.g. 1140814). Used on OOB waiver forms.",
            ),
        ),
    ]
