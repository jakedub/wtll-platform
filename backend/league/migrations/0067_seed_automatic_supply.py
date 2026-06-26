"""
Migration 0067 — Seed Automatic Supply vendor.

Adds Automatic Supply to the vendor list with:
  - Products: field chalk, field paint, field dry, field conditioner,
              mound clay chips, mound clay bricks
  - Account: H000587 0001 (registered under "Westlane Delaware Trails")
  - Two locations: Fishers (primary / delivery) and Indianapolis (pickup only)
"""
from django.db import migrations


def seed_automatic_supply(apps, schema_editor):
    Vendor = apps.get_model("league", "Vendor")
    VendorLocation = apps.get_model("league", "VendorLocation")

    # Skip if already exists
    if Vendor.objects.filter(name="Automatic Supply").exists():
        return

    vendor = Vendor.objects.create(
        name          = "Automatic Supply",
        category      = "facilities",
        contact_name  = "",
        contact_phone = "",
        contact_email = "",
        website       = "https://askautomatic.com",
        products      = "Field chalk, Field paint, Field dry, Field conditioner, Mound clay chips, Mound clay bricks",
        account_number = "H000587 0001",
        account_name   = "Westlane Delaware Trails",
        board_role     = "Grounds",
        notes         = "Account is listed under our former name (Westlane Delaware Trails). "
                        "Fishers store handles delivery to WTLL. "
                        "Indianapolis location available for small emergency pickups (paint, chalk, etc.).",
    )

    VendorLocation.objects.create(
        vendor     = vendor,
        label      = "Fishers",
        address    = "Fishers, IN",
        phone      = "",
        website    = "https://askautomatic.com/locations/fishers-indiana/",
        notes      = "Primary location — delivers to WTLL",
        is_primary = True,
        sort_order = 0,
    )

    VendorLocation.objects.create(
        vendor     = vendor,
        label      = "Indianapolis",
        address    = "Indianapolis, IN",
        phone      = "",
        website    = "https://askautomatic.com/locations/indianapolis-indiana/",
        notes      = "Pickup only — use for small/emergency orders (paint, chalk bags, etc.)",
        is_primary = False,
        sort_order = 1,
    )


def unseed_automatic_supply(apps, schema_editor):
    Vendor = apps.get_model("league", "Vendor")
    Vendor.objects.filter(name="Automatic Supply").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0066_vendor_products_account_vendorlocation"),
    ]

    operations = [
        migrations.RunPython(seed_automatic_supply, unseed_automatic_supply),
    ]
