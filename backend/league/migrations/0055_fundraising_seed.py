"""
Migration 0055 — Seed FacilitiesLineItem with the WTLL capital improvement plan
from the FY26 Facilities Capital Improvement Tracker.
"""
from django.db import migrations


SEED_ITEMS = [
    # ── Phase 1: Field Playability ────────────────────────────────────────────
    # Diamond 8 (Priority 1 — PeeWee)
    (1, "Diamond 8", "Drainage improvements",          "INFRA",  5000,  15000, "Grading and subsurface drainage", 10),
    (1, "Diamond 8", "Fencing replacement",             "SAFETY", 8000,  20000, "Chain link perimeter, full field replacement", 20),
    (1, "Diamond 8", "New dugout roofs",                "SAFETY", 3000,  8000,  "Metal or polycarbonate roofing on existing structures", 30),
    (1, "Diamond 8", "Infield skinned for base paths",  "INFRA",  3000,  8000,  "Infield mix import and grading", 40),
    (1, "Diamond 8", "Equipment box",                   "INFRA",  500,   1500,  "Steel on-field storage box", 50),
    # Diamond 9 (Priority 2 — Full Build)
    (1, "Diamond 9", "Full field build (grading, infield, sod, warning track)", "FULL", 30000, 70000, "Natural grass, youth dimensions; currently only backstop cage exists", 10),
    (1, "Diamond 9", "Drainage system",                 "INFRA",  8000,  20000, "Full subsurface drainage required as part of new build", 20),
    (1, "Diamond 9", "Fencing (perimeter and backstop upgrade)", "SAFETY", 10000, 25000, "Full field chain link perimeter", 30),
    (1, "Diamond 9", "Dugouts",                         "INFRA",  10000, 25000, "Two dugouts with roofing and benches; built as part of initial field construction", 40),
    (1, "Diamond 9", "Equipment box",                   "INFRA",  500,   1500,  "Steel on-field storage box", 50),
    # Diamond 10 (Priority 3 — Tee Ball)
    (1, "Diamond 10", "Full fence perimeter",            "SAFETY", 8000,  20000, "Chain link, youth field dimensions", 10),
    (1, "Diamond 10", "Dugouts",                         "INFRA",  8000,  20000, "Two dugouts with roofing and benches", 20),
    (1, "Diamond 10", "Infield skinned for base paths",  "INFRA",  3000,  8000,  "Infield mix import and grading", 30),
    (1, "Diamond 10", "Equipment box",                   "INFRA",  500,   1500,  "Steel on-field storage box", 40),
    # Diamond 7 (Priority 4 — PeeWee)
    (1, "Diamond 7", "Grading and drainage improvements", "INFRA", 5000,  15000, "Laser grading and French drain or dry well", 10),
    (1, "Diamond 7", "Equipment box",                    "INFRA",  500,   1500,  "Steel on-field storage box", 20),
    # Diamond 7/8 Connector Path
    (1, "Diamond 7/8 Connector", "Gravel walking path between fields", "AMENITY", 1500, 4000, "Compacted gravel, approximately 100 ft path", 10),
    # Batting Cage Complex & Garage
    (1, "Batting Cage Complex", "Batting cage concrete slab",          "INFRA", 4000, 10000, "4 inch poured concrete under cage area", 10),
    (1, "Batting Cage Complex", "Garage upgrade for golf cart storage", "INFRA", 1500, 4000,  "Floor reinforcement, charging outlet, door clearance", 20),
    # Property Wide Paths
    (1, "Property Wide", "Gravel walking paths throughout complex", "AMENITY", 5000, 15000, "Compacted gravel, several hundred feet total", 10),

    # ── Phase 2: Infrastructure and Operations ────────────────────────────────
    # Field Lighting
    (2, "Diamond 2", "Lights",  "ELECTRICAL", 40000, 80000, "4 pole LED system; power nearby", 10),
    (2, "Diamond 3", "Lights",  "ELECTRICAL", 40000, 80000, "4 pole LED system; power already on site", 10),
    (2, "Diamond 4", "Lights",  "ELECTRICAL", 40000, 80000, "4 pole LED system; power nearby", 10),
    (2, "Diamond 9", "Lights",  "ELECTRICAL", 40000, 80000, "4 pole LED system; power nearby", 60),
    # Scoreboards
    (2, "Diamond 3", "Electronic scoreboard", "INFRA", 5000, 15000, "Fixed-digit LED installed; power already on site", 20),
    (2, "Diamond 9", "Electronic scoreboard", "INFRA", 5000, 15000, "Fixed-digit LED installed; power nearby", 70),
    # Equipment Boxes — remaining fields
    (2, "Diamond 1", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 10),
    (2, "Diamond 2", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 20),
    (2, "Diamond 3", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 30),
    (2, "Diamond 4", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 40),
    (2, "Diamond 5", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 50),
    (2, "Diamond 6", "Equipment box", "INFRA", 500, 1500, "Steel on-field storage box", 60),
    # Operations
    (2, "Concession Stand", "Ice machine",                              "AMENITY", 2000, 5000, "Commercial undercounter or freestanding unit", 10),
    (2, "Batting Cage Complex", "Tool shed adjacent to batting cages",  "INFRA",   2000, 5000, "Prefab metal shed, 8x10 or 10x12", 30),
    (2, "Equipment Sheds", "Shelving and organization (2 sheds)",       "AMENITY", 1000, 3000, "Heavy duty metal shelving units", 10),
    # Signage
    (2, "Property Wide", "Diamond signage visible from street",  "AMENITY", 2000, 5000, "Exterior mounted signs, one per diamond entrance", 20),
    (2, "Property Wide", "Parking lot directional signage",      "AMENITY", 500,  2000, "Post-mounted wayfinding signs", 30),

    # ── Phase 3: Amenities and Polish ─────────────────────────────────────────
    # Bleachers
    (3, "Diamond 2", "Upgraded bleachers", "AMENITY", 8000, 18000, "Aluminum replacement units, 3 to 4 row", 10),
    (3, "Diamond 3", "Upgraded bleachers", "AMENITY", 8000, 18000, "Aluminum replacement units", 20),
    (3, "Diamond 4", "Upgraded bleachers", "AMENITY", 8000, 18000, "Aluminum replacement units", 30),
    (3, "Diamond 9", "Upgraded bleachers", "AMENITY", 8000, 18000, "Aluminum units; spectator side of new field", 80),
    # Remaining items
    (3, "Diamond 2", "Scoreboard (optional)", "INFRA", 5000, 15000, "Optional; natural add once lights are in", 20),
    (3, "Diamond 4", "Scoreboard (optional)", "INFRA", 5000, 15000, "Optional; natural add once lights are in", 40),
    (3, "Property Wide", "Remaining equipment boxes (catch-all)", "INFRA", 500, 1000, "Catch-all for anything missed in prior phases", 10),
]


def seed_line_items(apps, schema_editor):
    FacilitiesLineItem = apps.get_model("league", "FacilitiesLineItem")
    for phase, location, description, category, low, high, notes, sort_order in SEED_ITEMS:
        FacilitiesLineItem.objects.create(
            phase=phase,
            location=location,
            description=description,
            category=category,
            estimate_low=low,
            estimate_high=high,
            notes=notes,
            sort_order=sort_order,
        )


def unseed_line_items(apps, schema_editor):
    FacilitiesLineItem = apps.get_model("league", "FacilitiesLineItem")
    FacilitiesLineItem.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("league", "0054_fundraising"),
    ]

    operations = [
        migrations.RunPython(seed_line_items, reverse_code=unseed_line_items),
    ]
