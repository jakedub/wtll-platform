"""
WTLL Platform — Pitching Engine Service

Computes rest requirements and fatigue status per Little League pitch count rules.

This is a pure service layer — no Django ORM imports at module level.
Views call these functions; the functions accept model instances or IDs.

Little League pitch count rules (2024):
  Ages 7-8:   50 pitches/day max
  Ages 9-10:  75 pitches/day max
  Ages 11-12: 85 pitches/day max
  Ages 13-16: 95 pitches/day max
  Ages 17-18: 105 pitches/day max

Rest requirements (all ages):
  1–20 pitches  → 0 days rest
  21–35 pitches → 1 day rest
  36–50 pitches → 2 days rest
  51–65 pitches → 3 days rest
  66+ pitches   → 4 days rest
"""
from datetime import date, timedelta
from typing import TypedDict


# ─── Constants ────────────────────────────────────────────────────────────────

REST_RULES = [
    (66, 4),
    (51, 3),
    (36, 2),
    (21, 1),
    (1,  0),
]

STATUS_AVAILABLE = "AVAILABLE"
STATUS_CAUTION = "CAUTION"
STATUS_REST = "REST"


# ─── Types ────────────────────────────────────────────────────────────────────

class PitchStatusResult(TypedDict):
    status: str                  # AVAILABLE / CAUTION / REST
    risk_level: str              # LOW / MEDIUM / HIGH
    days_rest_required: int
    next_available_date: str     # ISO date string or "Today"
    pitches_last_outing: int
    pitches_last_7_days: int
    warnings: list[str]


# ─── Core Functions ───────────────────────────────────────────────────────────

def compute_rest_required(pitches_thrown: int) -> int:
    """
    Returns days of rest required given pitch count for one outing.
    Based on official Little League regulations.
    """
    for threshold, days in REST_RULES:
        if pitches_thrown >= threshold:
            return days
    return 0


def compute_next_available(game_date: date, days_rest: int) -> date:
    """
    Returns the next date a pitcher is eligible to pitch.
    days_rest=0 means available the next calendar day (or same day).
    """
    if days_rest == 0:
        return game_date
    return game_date + timedelta(days=days_rest)


def get_player_pitch_status(player_id: int, as_of: date = None) -> PitchStatusResult:
    """
    Main entry point. Given a player ID, returns full pitch status.

    Pulls pitch history from the DB, applies fatigue model,
    and returns a structured result dict.

    Args:
        player_id: PK of the Player
        as_of: Date to evaluate against (defaults to today)

    Returns:
        PitchStatusResult dict
    """
    # Import here to keep module importable before Django setup
    from league.models.pitch_count import PitchCount

    if as_of is None:
        as_of = date.today()

    warnings = []

    # Pull all pitch logs for this player, most recent first
    logs = PitchCount.objects.filter(player_id=player_id).order_by("-game_date")

    if not logs.exists():
        return PitchStatusResult(
            status=STATUS_AVAILABLE,
            risk_level="LOW",
            days_rest_required=0,
            next_available_date=as_of.isoformat(),
            pitches_last_outing=0,
            pitches_last_7_days=0,
            warnings=[],
        )

    # Most recent outing
    last_outing = logs.first()
    days_since_last = (as_of - last_outing.game_date).days

    # 7-day rolling total
    seven_days_ago = as_of - timedelta(days=7)
    recent_logs = logs.filter(game_date__gte=seven_days_ago)
    pitches_last_7_days = sum(log.pitches_thrown for log in recent_logs)

    # Rest requirement from last outing
    days_rest_required = compute_rest_required(last_outing.pitches_thrown)
    next_available = compute_next_available(last_outing.game_date, days_rest_required)
    still_resting = as_of < next_available

    # Determine status
    if still_resting:
        status = STATUS_REST
        risk_level = "HIGH"
        warnings.append(
            f"Rest required: {days_rest_required} days after {last_outing.pitches_thrown} pitches on {last_outing.game_date}."
        )
    elif pitches_last_7_days >= 75:
        status = STATUS_CAUTION
        risk_level = "MEDIUM"
        warnings.append(f"High workload: {pitches_last_7_days} pitches in the last 7 days.")
    elif pitches_last_7_days >= 50:
        status = STATUS_CAUTION
        risk_level = "MEDIUM"
        warnings.append(f"Moderate workload: {pitches_last_7_days} pitches in the last 7 days.")
    else:
        status = STATUS_AVAILABLE
        risk_level = "LOW"

    # Extra warnings for workload patterns
    if days_since_last <= 1 and last_outing.pitches_thrown >= 50:
        warnings.append("Pitched heavily within the last 2 days.")

    return PitchStatusResult(
        status=status,
        risk_level=risk_level,
        days_rest_required=days_rest_required if still_resting else 0,
        next_available_date=next_available.isoformat(),
        pitches_last_outing=last_outing.pitches_thrown,
        pitches_last_7_days=pitches_last_7_days,
        warnings=warnings,
    )
