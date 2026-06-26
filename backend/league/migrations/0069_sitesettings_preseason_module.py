"""
Migration 0069 — Add module_preseason_enabled to SiteSettings.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0068_sitesettings_modules"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="module_preseason_enabled",
            field=models.BooleanField(
                default=True,
                help_text="Enable Pre-Season section (Player Import, Eligibility, Evaluations, Draft).",
            ),
        ),
    ]
