"""
Migration 0053 — Add SiteSettings and LeagueIdentity singleton models.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0052_user_umpire_board_member"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("umpire_signups_enabled", models.BooleanField(default=False,
                    help_text="Whether the public umpire sign-up page is accepting submissions.")),
                ("volunteer_signups_enabled", models.BooleanField(default=False,
                    help_text="Whether the public volunteer sign-up page is accepting submissions.")),
                ("magic_link_expiry_minutes", models.PositiveIntegerField(default=15,
                    help_text="How long a magic login link stays valid (minutes). Default: 15.")),
                ("default_program", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="+",
                    to="league.program",
                    help_text="The active program year used as the default context for pitch log and other pages.",
                )),
            ],
            options={"verbose_name": "Site Settings", "verbose_name_plural": "Site Settings"},
        ),
        migrations.CreateModel(
            name="LeagueIdentity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("league_name",    models.CharField(max_length=150, default="Washington Township Little League")),
                ("short_name",     models.CharField(max_length=20,  default="WTLL")),
                ("tagline",        models.CharField(max_length=200, blank=True, default="")),
                ("city",           models.CharField(max_length=100, blank=True, default="")),
                ("state",          models.CharField(max_length=50,  blank=True, default="")),
                ("contact_email",  models.EmailField(blank=True, default="")),
                ("website_url",    models.URLField(blank=True, default="")),
                ("primary_color",  models.CharField(max_length=7, default="#C41230")),
                ("secondary_color",models.CharField(max_length=7, default="#1565c0")),
            ],
            options={"verbose_name": "League Identity", "verbose_name_plural": "League Identity"},
        ),
    ]
