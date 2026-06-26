"""
Migration 0066 — Add products/account fields to Vendor, add VendorLocation model.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0065_leagueidentity_little_league_id"),
    ]

    operations = [
        # New fields on Vendor
        migrations.AddField(
            model_name="vendor",
            name="products",
            field=models.TextField(blank=True, help_text="Comma-separated products/services this vendor supplies."),
        ),
        migrations.AddField(
            model_name="vendor",
            name="account_number",
            field=models.CharField(max_length=100, blank=True, help_text="Our account number with this vendor."),
        ),
        migrations.AddField(
            model_name="vendor",
            name="account_name",
            field=models.CharField(max_length=200, blank=True,
                                   help_text="Name the account is registered under, if different from current league name."),
        ),
        # New VendorLocation model
        migrations.CreateModel(
            name="VendorLocation",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("vendor",     models.ForeignKey("league.Vendor", on_delete=django.db.models.deletion.CASCADE, related_name="locations")),
                ("label",      models.CharField(max_length=100)),
                ("address",    models.CharField(max_length=300, blank=True)),
                ("phone",      models.CharField(max_length=30, blank=True)),
                ("website",    models.URLField(blank=True)),
                ("notes",      models.TextField(blank=True)),
                ("is_primary", models.BooleanField(default=False)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["-is_primary", "sort_order", "id"]},
        ),
    ]
