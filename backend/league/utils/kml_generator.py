"""
KML generation utilities for district boundary maps.

Generates KML strings from BoundaryLeague database records and persists them
to the GeneratedKML table.  This runs during the seed migration (initial load)
and whenever a user clicks "Regenerate KML" in the league editor.
"""
import html
from typing import NamedTuple


# ── Color helpers ─────────────────────────────────────────────────────────────

def kml_color(css_hex: str, alpha: str = "ff") -> str:
    """Convert a CSS hex color (#RRGGBB) to KML's AABBGGRR format."""
    h = css_hex.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"{alpha}{b}{g}{r}"


# Per-district color config (line color, line alpha, fill alpha)
DISTRICT_COLOR_MAP: dict[str, tuple[str, str, str]] = {
    "wtll":     ("#C41230", "ff", "33"),
    "8":        ("#1565c0", "ff", "33"),
    "7":        ("#2e7d32", "ff", "33"),
    # combined uses folder-level colors (see generate_combined_kml)
    "combined": ("#6a1b9a", "ff", "33"),
}


# ── KML building blocks ───────────────────────────────────────────────────────

def _style_xml(style_id: str, css_hex: str, line_alpha: str = "ff", fill_alpha: str = "33") -> str:
    line_color = kml_color(css_hex, line_alpha)
    fill_color = kml_color(css_hex, fill_alpha)
    return (
        f'    <Style id="{style_id}">\n'
        f"      <LineStyle><color>{line_color}</color><width>2</width></LineStyle>\n"
        f"      <PolyStyle><color>{fill_color}</color><fill>1</fill></PolyStyle>\n"
        f"    </Style>"
    )


def _placemark_xml(name: str, shape_components: list, style_url: str) -> str:
    """
    Build a <Placemark> element from raw shape_components data.
    Each component is a dict with a 'coordinates' list of {lat, lng} dicts.
    Returns an empty string if there are no usable coordinates.
    """
    parts: list[str] = []
    safe_name = html.escape(name)
    for component in shape_components:
        coords = component.get("coordinates", [])
        if not coords:
            continue
        coord_str = " ".join(
            f"{pt['lng']},{pt['lat']},0" for pt in coords
        )
        parts.append(
            f"    <Placemark>\n"
            f"      <name>{safe_name}</name>\n"
            f"      <styleUrl>{style_url}</styleUrl>\n"
            f"      <Polygon><outerBoundaryIs><LinearRing>\n"
            f"        <coordinates>{coord_str}</coordinates>\n"
            f"      </LinearRing></outerBoundaryIs></Polygon>\n"
            f"    </Placemark>"
        )
    return "\n".join(parts)


# ── Single-district KML ───────────────────────────────────────────────────────

def generate_single_kml(
    doc_name: str,
    leagues: list,           # iterable of BoundaryLeague instances
    district_key: str,
) -> str:
    """Generate a KML document with all leagues for a single district."""
    css_hex, line_alpha, fill_alpha = DISTRICT_COLOR_MAP.get(
        district_key, ("#888888", "ff", "33")
    )
    style_id = "boundary-style"
    style_url = f"#{style_id}"

    placemarks = []
    for league in leagues:
        if league.shared_boundary_with:
            continue   # shares another league's polygon — skip to avoid duplicates
        pm = _placemark_xml(league.league_name, league.shape_components, style_url)
        if pm:
            placemarks.append(pm)

    placemark_block = "\n".join(placemarks)
    style_block = _style_xml(style_id, css_hex, line_alpha, fill_alpha)

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        "  <Document>\n"
        f"    <name>{html.escape(doc_name)}</name>\n"
        f"{style_block}\n"
        f"{placemark_block}\n"
        "  </Document>\n"
        "</kml>\n"
    )


# ── Combined D7 + D8 KML ──────────────────────────────────────────────────────

def generate_combined_kml(d8_leagues: list, d7_leagues: list) -> str:
    """Generate a KML with two <Folder> elements — District 8 (blue) and District 7 (green)."""
    d8_style_id, d8_hex = "d8-style", "#1565c0"
    d7_style_id, d7_hex = "d7-style", "#2e7d32"

    def _folder(folder_name: str, style_id: str, leagues: list) -> str:
        style_url = f"#{style_id}"
        pms = []
        for league in leagues:
            if league.shared_boundary_with:
                continue
            pm = _placemark_xml(league.league_name, league.shape_components, style_url)
            if pm:
                pms.append(pm)
        inner = "\n".join(pms)
        return (
            f"  <Folder>\n"
            f"    <name>{html.escape(folder_name)}</name>\n"
            f"{inner}\n"
            f"  </Folder>"
        )

    d8_style = _style_xml(d8_style_id, d8_hex)
    d7_style = _style_xml(d7_style_id, d7_hex)
    d8_folder = _folder("District 8", d8_style_id, d8_leagues)
    d7_folder = _folder("District 7", d7_style_id, d7_leagues)

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        "  <Document>\n"
        "    <name>District 7 and District 8 Combined</name>\n"
        f"{d8_style}\n"
        f"{d7_style}\n"
        f"{d8_folder}\n"
        f"{d7_folder}\n"
        "  </Document>\n"
        "</kml>\n"
    )


# ── Main entry point ──────────────────────────────────────────────────────────

def regenerate_all_kml(note: str = "regenerated from league editor") -> dict[str, str]:
    """
    Query BoundaryLeague, regenerate all four KML files, and save them to
    GeneratedKML.  Returns a dict mapping district_key → new KML string.

    Safe to call at any time; uses update_or_create so it's idempotent.
    """
    from league.models.boundary import BoundaryLeague, GeneratedKML  # local import avoids circular deps

    d8_leagues = list(BoundaryLeague.objects.filter(district=8))
    d7_leagues = list(BoundaryLeague.objects.filter(district=7))

    # WTLL = Washington Township LL (the one league that has "WASHINGTON TOWNSHIP" in its name)
    wtll_leagues = [
        lg for lg in d8_leagues
        if "WASHINGTON TOWNSHIP" in lg.league_name.upper()
    ]

    kml_map = {
        "wtll":     generate_single_kml("WTLL Boundary",                     wtll_leagues, "wtll"),
        "8":        generate_single_kml("Indiana District 8 Boundaries",     d8_leagues,   "8"),
        "7":        generate_single_kml("Indiana District 7 Boundaries",     d7_leagues,   "7"),
        "combined": generate_combined_kml(d8_leagues, d7_leagues),
    }

    for district_key, kml_content in kml_map.items():
        GeneratedKML.objects.update_or_create(
            district_key=district_key,
            defaults={"kml_content": kml_content, "note": note},
        )

    return kml_map
