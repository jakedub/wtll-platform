# league/services/division_mapper.py
#
# Maps raw SportsConnect CSV division strings to canonical DB division names
# and determines sport (baseball vs softball).

from league.models.divisions import Division

DIVISION_MAP = {
    # 2026 SportsConnect full names
    "Major - Player Pitch - Major Baseball":  "Majors",
    "Major - Little League Baseball": "Majors",
    "Minor - Player Pitch - AAA Baseball":    "AAA",
    "Minor - Player Pitch - Little League Baseball": "AAA",
    "Minor - Coach Pitch - AA Baseball":      "AA",
    "Minor - Coach/Machine Pitch - Little League Baseball": "AA",
    "Minor - Coach Pitch - Pee Wee":          "Pee Wee",
    "PeeWee - Little League Baseball": "Pee Wee",
    "Minor - AA/AAA Combined - Little League Baseball": "Baseball Combined",
    "Tee Ball Clinics":                       "Tee Ball",
    # Softball (2026)
    "Major - Player Pitch (Ages 11-12)":      "Softball Majors",
    "Major - Little League Softball - Girls": "Softball Majors",
    "Minor - Player/Coach Pitch (Ages 7-10)": "Softball Minors",
    "Minor - Player Pitch - Little League Softball - Girls": "Softball Minors",
    "Combined - Player Pitch - Little League Softball - Girls": "Softball Combined",
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

SOFTBALL_DIVISION_NAMES = {"Softball Majors", "Softball Minors", "Softball Combined"}

# When importing for a specific program type, canonical names from DIVISION_MAP
# need to be mapped to that program's actual division names in the DB.
# e.g. Fall Ball stores "Fall Majors" not "Majors".
PROGRAM_CANONICAL_TO_DIVISION: dict[str, dict[str, str]] = {
    "FALL_BALL": {
        "Majors":         "Fall Majors",
        "AAA":            "Fall AAA",
        "AA":             "Fall AA",
        "Pee Wee":        "Fall PeeWee",
        "Baseball Combined": "Fall Baseball Combined",
        "Softball Majors":   "Fall Softball Majors",
        "Softball Minors":   "Fall Softball Minors",
        "Softball Combined": "Fall Softball Combined",
    },
}


def map_division(raw: str, program=None):
    """
    Resolve a raw CSV division string to (Division, sport_str).

    When a program is supplied the lookup is scoped to that program's divisions
    using the PROGRAM_CANONICAL_TO_DIVISION name map (e.g. "Majors" on a
    FALL_BALL import finds "Fall Majors" rather than Recreation's "Majors").

    Falls back to an unscoped get_or_create only when no program-specific
    division is found, so Recreation imports keep working as before.

    Raises ValueError for unrecognised raw strings.
    """
    if not raw or not raw.strip():
        raise ValueError("Division name is required.")

    cleaned = raw.strip()

    if cleaned not in DIVISION_MAP:
        raise ValueError(
            f"Unknown division '{cleaned}' — add it to DIVISION_MAP in division_mapper.py."
        )

    db_name = DIVISION_MAP[cleaned]
    sport   = "softball" if db_name in SOFTBALL_DIVISION_NAMES else "baseball"

    if program is not None:
        program_type = getattr(program, "program_type", None)
        name_override = PROGRAM_CANONICAL_TO_DIVISION.get(program_type or "", {})
        division_name = name_override.get(db_name, db_name)

        # Try program-specific division first
        division = Division.objects.filter(program=program, name=division_name).first()
        if division:
            return division, sport

        # Try the canonical name under this program (e.g. user named it "Majors" not "Fall Majors")
        division = Division.objects.filter(program=program, name=db_name).first()
        if division:
            return division, sport

    # Fallback: unscoped lookup / create (Recreation legacy behaviour)
    division, _ = Division.objects.get_or_create(name=db_name)
    return division, sport
