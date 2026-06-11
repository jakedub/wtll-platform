import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Makes PlayerProgramEnrollment.team nullable so that imported players
    can be assigned to a division before a team is known (i.e. before the draft).
    The draft process fills in the team once players are assigned.
    """

    dependencies = [
        ("league", "0010_draft_draftselection"),
    ]

    operations = [
        migrations.AlterField(
            model_name="playerprogramenrollment",
            name="team",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                to="league.team",
                null=True,
                blank=True,
            ),
        ),
    ]
