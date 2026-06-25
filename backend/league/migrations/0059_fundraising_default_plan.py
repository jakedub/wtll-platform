"""
Migration 0059 — Data migration: create the default Facilities Capital
Improvement plan and link all existing FundraisingLineItem rows to it.
"""
from django.db import migrations


def create_default_plan(apps, schema_editor):
    FundraisingPlan = apps.get_model("league", "FundraisingPlan")
    FundraisingLineItem = apps.get_model("league", "FundraisingLineItem")

    plan = FundraisingPlan.objects.create(
        name="Facilities Capital Improvement",
        description="FY26 capital improvement plan covering all 10 diamonds across 3 phases.",
        uses_phases=True,
        color="#C41230",
        sort_order=0,
    )
    FundraisingLineItem.objects.filter(plan__isnull=True).update(plan=plan)


def remove_default_plan(apps, schema_editor):
    FundraisingPlan = apps.get_model("league", "FundraisingPlan")
    FundraisingPlan.objects.filter(name="Facilities Capital Improvement").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0058_fundraisinglineitem_rename_and_update"),
    ]

    operations = [
        migrations.RunPython(create_default_plan, reverse_code=remove_default_plan),
    ]
