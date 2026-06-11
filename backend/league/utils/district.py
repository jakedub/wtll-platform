"""
District boundary utilities.
Uses geopandas + shapely to parse KML files and perform point-in-polygon checks.
"""
from pathlib import Path
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent.parent
KML_PATH = BASE_DIR / "static" / "wtll_district_boundaries.kml"

# Schools considered in-district (attend a WTLL feeder school)
ELIGIBLE_SCHOOLS = {
    "Crooked Creek Elementary",
    "Fox Hill Elementary",
    "Greenbriar Elementary",
    "Nora Elementary",
    "Spring Mill Elementary",
    "Towne Meadow Elementary",
    "Willow Lake Elementary",
    "Brebeuf Jesuit Preparatory",
    "Park Tudor",
    "St. Luke Catholic School",
    "St. Monica School",
    "Hasten Hebrew Academy",
    "Sycamore School",
    "Orchard School",
    "International Montessori School",
    "International School of Indiana",
}


@lru_cache(maxsize=1)
def load_district_polygons():
    """
    Parse the KML file and return a list of shapely geometries representing the district.
    Cached so the file is only parsed once per process.
    """
    try:
        import geopandas as gpd

        gdf = gpd.read_file(str(KML_PATH), driver="KML")
        polygons = [geom for geom in gdf.geometry if geom is not None]
        return polygons
    except Exception as e:
        raise RuntimeError(f"Failed to load district KML: {e}") from e


def is_point_in_district(lat: float, lng: float) -> bool:
    """
    Return True if the (lat, lng) point falls within any district polygon.
    """
    try:
        from shapely.geometry import Point

        point = Point(lng, lat)  # shapely uses (x=lng, y=lat)
        polygons = load_district_polygons()
        return any(poly.contains(point) for poly in polygons)
    except Exception:
        return False


def check_all_players_in_district() -> dict:
    """
    Check every player that has lat/lng coordinates against the district boundary.
    Updates in_district and district_checked_at fields.
    Returns a summary dict.
    """
    from django.utils import timezone
    from league.models import Player

    players = Player.objects.filter(
        latitude__isnull=False,
        longitude__isnull=False,
    )

    total = players.count()
    in_district = 0
    out_of_district = 0

    now = timezone.now()
    to_update = []

    for player in players:
        result = is_point_in_district(player.latitude, player.longitude)
        player.in_district = result
        player.district_checked_at = now
        to_update.append(player)
        if result:
            in_district += 1
        else:
            out_of_district += 1

    Player.objects.bulk_update(to_update, ["in_district", "district_checked_at"])

    return {"total": total, "in_district": in_district, "out_of_district": out_of_district}


# Keyword tokens for fuzzy school matching.
# A player's school_name is eligible if it contains ANY of these tokens
# (case-insensitive). Tokens are the unique identifying portion of each school.
_SCHOOL_TOKENS = [
    "crooked creek",
    "fox hill",
    "greenbriar",
    "nora elementary",
    "spring mill",
    "towne meadow",
    "willow lake",
    "brebeuf",
    "park tudor",
    "st. luke",
    "saint luke",
    "st luke",
    "st. monica",
    "saint monica",
    "st monica",
    "hasten",
    "sycamore school",
    "orchard school",
    "international montessori",
    "international school of indiana",
]


def _school_matches(school_name: str) -> bool:
    """
    Return True if school_name (case-insensitive) contains any eligible school token.
    Uses partial / keyword matching so minor variations still match:
      - "Spring Mill Elem"  → matches "spring mill"
      - "ST. LUKE"          → matches "st. luke"
      - "Crooked Creek Elementary School" → matches "crooked creek"
    """
    if not school_name:
        return False
    lower = school_name.lower().strip()
    return any(token in lower for token in _SCHOOL_TOKENS)


def eligibility_reason(player) -> str:
    """
    Return a human-readable reason string explaining why a player is (or isn't) eligible.
    One of:
      "address_in_district"   — geocoded address falls within WTLL boundary
      "school_enrollment"     — attends a WTLL feeder school
      "ineligible"            — neither condition met
      "not_checked"           — district check has not been run yet
    """
    if player.in_district:
        return "address_in_district"
    if _school_matches(player.school_name or ""):
        return "school_enrollment"
    if player.district_checked_at is None and not (player.school_name or "").strip():
        return "not_checked"
    return "ineligible"


def is_player_eligible(player) -> bool:
    """
    A player is eligible if:
      1. Their geocoded address falls within the WTLL district boundary, OR
      2. They attend a WTLL feeder school (case-insensitive partial name match).

    Note: school enrollment alone is sufficient — a district check is NOT required
    for school-based eligibility.
    """
    if player.in_district:
        return True
    return _school_matches(player.school_name or "")


def determine_player_eligibility() -> dict:
    """
    Update is_eligible for ALL players (not just those with a district check).
    Players can be eligible through school enrollment without ever being geocoded.
    Returns a summary with counts by reason.
    """
    from league.models import Player

    players = Player.objects.filter(is_archived=False)
    total = players.count()
    by_reason = {"address_in_district": 0, "school_enrollment": 0, "ineligible": 0, "not_checked": 0}
    to_update = []

    for player in players:
        result = is_player_eligible(player)
        reason = eligibility_reason(player)
        player.is_eligible = result
        to_update.append(player)
        by_reason[reason] = by_reason.get(reason, 0) + 1

    Player.objects.bulk_update(to_update, ["is_eligible"])

    eligible   = by_reason["address_in_district"] + by_reason["school_enrollment"]
    ineligible = by_reason["ineligible"] + by_reason["not_checked"]

    return {
        "total":     total,
        "eligible":  eligible,
        "ineligible": ineligible,
        "by_reason": by_reason,
    }
