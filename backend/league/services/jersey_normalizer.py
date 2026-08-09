# league/services/jersey_normalizer.py

JERSEY_MAP = {
    "youth x-small": "YXS",
    "youth xs":      "YXS",   # Fall Ball CSV variant
    "youth small":   "YS",
    "youth medium":  "YM",
    "youth large":   "YL",
    "youth x-large": "YXL",
    "adult small":   "AS",
    "adult medium":  "AM",
    "adult large":   "AL",
    "adult x-large": "AXL",
    "adult xx-large": "AXXL",
}


def normalize_jersey_size(value: str) -> str:
    """
    Map a raw CSV jersey size string to an internal short code.

    Examples:
        "Youth Medium" → "YM"
        "Adult Small"  → "AS"

    Returns empty string for blank input.
    Raises ValueError for unrecognised values.
    """
    if not value or not value.strip():
        return ""

    cleaned = value.strip().lower().replace("-", " ")

    if cleaned not in JERSEY_MAP:
        raise ValueError(f"Unknown jersey size from CSV: '{value}'")

    return JERSEY_MAP[cleaned]
