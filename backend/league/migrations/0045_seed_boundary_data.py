"""
Data migration: seed BoundaryLeague from ll_initial.json and GeneratedKML
from the four static KML files.

Falls back gracefully if static files are absent (e.g. fresh checkout without
collectstatic run), so the migration never blocks deployment.
"""
import json
from pathlib import Path

from django.db import migrations


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def seed_leagues(apps, schema_editor):
    BoundaryLeague = apps.get_model("league", "BoundaryLeague")

    json_path = STATIC_DIR / "ll_initial.json"
    if not json_path.exists():
        return  # no source data — skip silently

    data = json.loads(json_path.read_text(encoding="utf-8"))
    leagues = data.get("leagues", [])

    for idx, lg in enumerate(leagues):
        BoundaryLeague.objects.get_or_create(
            league_id=lg.get("leagueId") or (9000000 + idx),
            defaults={
                "league_name":         lg.get("leagueName", ""),
                "league_location":     lg.get("leagueLocation", ""),
                "official_name":       lg.get("officialName", ""),
                "district":            lg.get("district"),
                "is_district_league":  lg.get("isDistrictLeague", True),
                "shape_components":    lg.get("shapeComponents", []),
                "shared_boundary_with": lg.get("sharedBoundaryWith", ""),
            },
        )


def seed_kml(apps, schema_editor):
    GeneratedKML = apps.get_model("league", "GeneratedKML")

    kml_files = {
        "wtll":     STATIC_DIR / "wtll_district_boundaries.kml",
        "8":        STATIC_DIR / "district_8_boundaries.kml",
        "7":        STATIC_DIR / "district_7_boundaries.kml",
        "combined": STATIC_DIR / "district_combined_boundaries.kml",
    }

    for district_key, path in kml_files.items():
        if not path.exists():
            continue
        content = path.read_text(encoding="utf-8")
        GeneratedKML.objects.get_or_create(
            district_key=district_key,
            defaults={
                "kml_content": content,
                "note": "seeded from static file",
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0044_boundary_league_generated_kml"),
    ]

    operations = [
        migrations.RunPython(seed_leagues, migrations.RunPython.noop),
        migrations.RunPython(seed_kml, migrations.RunPython.noop),
    ]
