"""
Migration 0071 — Set secondary_color to #C41230 (WTLL red) on the existing
LeagueIdentity singleton row.  The field default was previously #1565c0 (blue);
secondary_color is now used for active nav states and toggle indicators so it
should match the primary brand color until a tenant sets their own value.
"""
from django.db import migrations


def set_secondary_red(apps, schema_editor):
    LeagueIdentity = apps.get_model("league", "LeagueIdentity")
    LeagueIdentity.objects.filter(pk=1).update(secondary_color="#C41230")


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0070_alter_sitesettings_module_involvement_enabled_and_more"),
    ]

    operations = [
        migrations.RunPython(set_secondary_red, migrations.RunPython.noop),
    ]
