from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0030_program_season_closed"),
    ]

    operations = [
        migrations.AddField(
            model_name="player",
            name="is_pitcher",
            field=models.BooleanField(
                default=False,
                help_text="Manually flagged as a pitcher. Shows pitch count tracking on the player profile.",
            ),
        ),
        migrations.AddField(
            model_name="player",
            name="is_catcher",
            field=models.BooleanField(
                default=False,
                help_text="Manually flagged as a catcher. Shown in draft and evaluation views.",
            ),
        ),
    ]
