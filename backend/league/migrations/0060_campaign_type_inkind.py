"""
Migration 0060 — Add campaign_type to FundraisingCampaign;
add is_in_kind + in_kind_description to FundraisingDeposit.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0059_fundraising_default_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="fundraisingcampaign",
            name="campaign_type",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("RAFFLE",      "Raffle"),
                    ("SPONSORSHIP", "Sponsorship"),
                    ("GRANT",       "Grant"),
                    ("EVENT",       "Event"),
                    ("DONATION",    "Direct Donation"),
                    ("OTHER",       "Other"),
                ],
                default="DONATION",
            ),
        ),
        migrations.AddField(
            model_name="fundraisingdeposit",
            name="is_in_kind",
            field=models.BooleanField(
                default=False,
                help_text="Non-cash contribution (labor, materials, equipment).",
            ),
        ),
        migrations.AddField(
            model_name="fundraisingdeposit",
            name="in_kind_description",
            field=models.TextField(
                blank=True, default="",
                help_text="Description of the in-kind contribution.",
            ),
        ),
    ]
