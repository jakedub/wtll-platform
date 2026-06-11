# league/services/division_mapper.py
#
# Maps raw SportsConnect CSV division strings to canonical DB division names
# and determines sport (baseball vs softball).

from league.models.divisions import Division

DIVISION_MAP = {
    # 2026 SportsConnect full names
    "Major - Player Pitch - Major Baseball":  "Majors",
    "Minor - Player Pitch - AAA Baseball":    "AAA",
    "Minor - Coach Pitch - AA Baseball":      "AA",
    "Minor - Coach Pitch - Pee Wee":          "Pee Wee",
    "Tee Ball Clinics":                       "Tee Ball",
    # Softball (2026)
    "Major - Player Pitch (Ages 11-12)":      "Softball Majors",
    "Minor - Player/Coach Pitch (Ages 7-10)": "Softball Minors",
    # Canonical aliases
    "Majors":          "Majors",
    "AAA":             "AAA",
    "AA":              "AA",
    "Pee Wee":         "Pee Wee",
    "PeeWee":          "Pee Wee",
    "Tee Ball":        "Tee Ball",
    "TeeBall":         "Tee Ball",
    "Softball Majors": "Softball Majors",
    "Softball Minors": "Softball Minors",
    # Alternate user-supplied names
    "Majors Baseball": "Majors",
    "AAA Baseball":    "AAA",
    "AA Baseball":     "AA",
}

SOFTBALL_DIVISION_NAMES = {"Softball Majors", "Softball Minors"}


def map_division(raw: str):
    """
    Resolve a raw CSV division string to (Division, sport_str).
    Auto-creates the Division row if it doesn't exist.
    Returns (Division, "softball"|"baseball").
    Raises ValueError for unrecognised raw strings.
    """
    if not raw or not raw.strip():
        raise ValueError("Division name is required.")

    cleaned = raw.strip()

    if cleaned not in DIVISION_MAP:
        raise ValueError(
            f"Unknown division: '{cleaned}' — add it to DIVISION_MAP in division_mapper.py."
        )

    db_name = DIVISION_MAP[cleaned]
    sport   = "softball" if db_name in SOFTBALL_DIVISION_NAMES else "baseball"
    division, _ = Division.objects.get_or_create(name=db_name)
    return division, sport
