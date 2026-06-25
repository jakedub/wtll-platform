"""
Migration 0056 — Add evaluation_signups_enabled to SiteSettings.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0055_fundraising_seed"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="evaluation_signups_enabled",
            field=models.BooleanField(
                default=False,
                help_text="Whether the public player evaluation sign-up pages are accepting registrations.",
            ),
        ),
    ]
