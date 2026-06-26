"""
Migration 0072 — Merge two leaf nodes:
  - 0069_sitesettings_preseason_module
  - 0071_update_secondary_color_red
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0069_sitesettings_preseason_module"),
        ("league", "0071_update_secondary_color_red"),
    ]

    operations = []
