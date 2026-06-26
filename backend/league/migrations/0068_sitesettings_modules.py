"""
Migration 0068 — Add module-enable flags to SiteSettings.

Each flag controls whether a major nav section is visible.
Board and Pre-Season are always on (no flags for those).
All new fields default to True so existing deployments keep full access.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0067_seed_automatic_supply"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="module_finance_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Finance section (Budget, Fundraising).",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="module_baseball_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Baseball Ops section (Pitch Count, Log Pitches, Teams, All Stars).",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="module_softball_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Softball Ops section (Log Innings, Teams, All Stars).",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="module_schedule_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Schedule section (calendars, schedule generator, ICS feeds).",
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="module_involvement_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Involvement section (Umpire, Volunteer, Evaluation sign-ups).",
            ),
        ),
    ]
