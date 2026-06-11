"""
Data migration — seed Indiana District 7 leadership contacts.
Sources:
  - District 7 staff: indianadistrict7ll.com (June 2026)
  - Central Region HQ: littleleague.org / (317) 897-6127
"""
from django.db import migrations


DISTRICT_7_CONTACTS = [
    # ── District 7 staff ──────────────────────────────────────────────────────
    dict(
        name="Derek Lisby",
        position="District Administrator",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    dict(
        name="Tammy Lisby",
        position="Safety Officer",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    dict(
        name="Emma Worland",
        position="Secretary",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    dict(
        name="Ronda Hite",
        position="Treasurer",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    # ADA – Baseball
    dict(
        name="Alan Pyrz",
        position="Assistant District Administrator",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    # ADA – Senior Baseball
    dict(
        name="Pat Korando",
        position="Assistant District Administrator",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    # ADA – Softball
    dict(
        name="Dorothy St Martin",
        position="Assistant District Administrator",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    # Umpire Consultant
    dict(
        name="Seth Worland",
        position="Other",
        district_number=7,
        is_hq=False,
        contact_phone="",
        contact_email="",
    ),
    # ── Little League Central Region HQ ───────────────────────────────────────
    dict(
        name="John Magers",
        position="HQ",
        district_number=7,
        is_hq=True,
        contact_phone="(317) 897-6127",
        contact_email="",
    ),
]


def seed_contacts(apps, schema_editor):
    DistrictLeader = apps.get_model("league", "DistrictLeader")
    for data in DISTRICT_7_CONTACTS:
        DistrictLeader.objects.get_or_create(
            name=data["name"],
            district_number=data["district_number"],
            defaults={k: v for k, v in data.items() if k not in ("name", "district_number")},
        )


def unseed_contacts(apps, schema_editor):
    """Reverse: remove only the contacts this migration created."""
    DistrictLeader = apps.get_model("league", "DistrictLeader")
    names = [c["name"] for c in DISTRICT_7_CONTACTS]
    DistrictLeader.objects.filter(district_number=7, name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0042_merge_0041_merge_20260608_1658_0041_vendor"),
    ]

    operations = [
        migrations.RunPython(seed_contacts, reverse_code=unseed_contacts),
    ]
