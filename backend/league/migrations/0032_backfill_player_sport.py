"""
Backfill players with blank/null sport to "baseball" (the default).
This fixes players imported before sport auto-detection was added.
"""
from django.db import migrations


def backfill_sport(apps, schema_editor):
    Player = apps.get_model("league", "Player")
    Player.objects.filter(sport__in=["", None]).update(sport="baseball")


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0031_player_is_pitcher_is_catcher"),
    ]

    operations = [
        migrations.RunPython(backfill_sport, migrations.RunPython.noop),
    ]
