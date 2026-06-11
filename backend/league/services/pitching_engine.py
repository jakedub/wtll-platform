"""
WTLL Platform — Pitching Engine Service

Computes rest requirements and fatigue status per Little League pitch count rules,
including the consecutive-day restriction.

Little League pitch count rules (2024):
  Ages 7-8:   50 pitches/day max
  Ages 9-10:  75 pitches/day max
  Ages 11-12: 85 pitches/day max
  Ages 13-16: 95 pitches/day max
  Ages 17-18: 105 pitches/day max

Pitch-count rest requirements (all ages):
  1–20 pitches  → 0 days rest
  21–35 pitches → 1 day rest
  36–50 pitches → 2 days rest
  51–65 pitches → 3 days rest
  66+ pitches   → 4 days rest

Consecutive-day rule:
  A player may NOT pitch on 3 consecutive calendar days.
  If a player has pitched on each of the 2 days immediately preceding today,
  they are blocked from pitching today regardless of pitch count.
  This applies IN ADDITION TO any count-based rest requirement.
"""
from datetime import date, timedelta
from typing import TypedDict, Optional


# ─── Constants ────────────────────────────────────────────────────────────────

REST_RULES = [
    (66, 4),
    (51, 3),
    (36, 2),
    (21, 1),
    (1,  0),
]

STATUS_AVAILABLE = "AVAILABLE"
STATUS_CAUTION   = "CAUTION"
STATUS_REST      = "REST"

# How many consecutive pitching days trigger the block
CONSECUTIVE_DAY_LIMIT = 2   # pitched on day -2 AND day -1 → blocked on day 0


# ─── Types ────────────────────────────────────────────────────────────────────

class PitchStatusResult(TypedDict):
    status: str                     # AVAILABLE / CAUTION / REST
    risk_level: str                 # LOW / MEDIUM / HIGH
    days_rest_required: int
    next_available_date: str        # ISO date string
    pitches_last_outing: int
    pitches_last_7_days: int
    consecutive_days_pitched: int   # how many days in a row (ending today or most recent)
    consecutive_day_block: bool     # True if blocked specifically due to consecutive-day rule
    warnings: list


# ─── Core helpers ─────────────────────────────────────────────────────────────

def compute_rest_required(pitches_thrown: int) -> int:
    """Days of rest required based on pitch count for one outing."""
    for threshold, days in REST_RULES:
        if pitches_thrown >= threshold:
            return days
    return 0


def compute_next_available(game_date: date, days_rest: int) -> date:
    """Next date eligible to pitch given last game date and required rest days."""
    if days_rest == 0:
        return game_date
    return game_date + timedelta(days=days_rest)


def _consecutive_days_pitched(pitch_dates: list, as_of: date) -> int:
    """
    Count how many consecutive calendar days ending on or before `as_of`
    the player has pitched.

    pitch_dates: sorted list of date objects (most recent first).
    Returns 0 if no pitching history, otherwise the streak length.
    """
    if not pitch_dates:
        return 0

    unique_dates = sorted(set(pitch_dates), reverse=True)
    streak = 0
    check = as_of

    for d in unique_dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d < check:
            break

    return streak


def _find_consecutive_block_end(pitch_dates: list, as_of: date) -> Optional[date]:
    """
    If the player is blocked today due to consecutive days, return the date
    they next become eligible (day after the streak ends).
    Returns None if not currently blocked by consecutive-day rule.
    """
    # Check the two days immediately before today
    day_minus_1 = as_of - timedelta(days=1)
    day_minus_2 = as_of - timedelta(days=2)
    date_set = set(pitch_dates)

    if day_minus_1 in date_set and day_minus_2 in date_set:
        # Blocked today — eligible tomorrow
        return as_of + timedelta(days=1)
    return None


# ─── Main entry point ─────────────────────────────────────────────────────────

def get_player_pitch_status(player_id: int, as_of: date = None) -> PitchStatusResult:
    """
    Given a player ID, return full pitch status including consecutive-day check.

    Resolution order (most restrictive wins):
      1. Count-based rest (from most recent outing)
      2. Consecutive-day block (pitched 2 days in a row leading into today)
      3. 7-day workload CAUTION
      4. AVAILABLE
    """
    from league.models.pitch_count import PitchCount

    if as_of is None:
        as_of = date.today()

    warnings: list = []
    logs = PitchCount.objects.filter(player_id=player_id).order_by("-game_date")

    if not logs.exists():
        return PitchStatusResult(
            status=STATUS_AVAILABLE,
            risk_level="LOW",
            days_rest_required=0,
            next_available_date=as_of.isoformat(),
            pitches_last_outing=0,
            pitches_last_7_days=0,
            consecutive_days_pitched=0,
            consecutive_day_block=False,
            warnings=[],
        )

    last_outing = logs.first()
    all_dates = [log.game_date for log in logs]

    # ── Count-based rest ──────────────────────────────────────────────────────
    days_rest_count = compute_rest_required(last_outing.pitches_thrown)
    next_avail_count = compute_next_available(last_outing.game_date, days_rest_count)
    count_rest_active = as_of < next_avail_count

    # ── Consecutive-day block ─────────────────────────────────────────────────
    consec_block_date = _find_consecutive_block_end(all_dates, as_of)
    consec_blocked = consec_block_date is not None

    # Streak count (informational — counts days ending today or the most recent day)
    streak = _consecutive_days_pitched(all_dates, as_of)

    # ── 7-day workload ────────────────────────────────────────────────────────
    seven_days_ago = as_of - timedelta(days=7)
    pitches_last_7 = sum(
        log.pitches_thrown for log in logs if log.game_date >= seven_days_ago
    )

    # ── Determine final status (most restrictive) ─────────────────────────────
    # Pick the later of the two next-available dates
    next_available = next_avail_count
    if consec_blocked and consec_block_date > next_available:
        next_available = consec_block_date

    if count_rest_active:
        status = STATUS_REST
        risk_level = "HIGH"
        warnings.append(
            f"Rest required: {days_rest_count} day{'s' if days_rest_count != 1 else ''} "
            f"after {last_outing.pitches_thrown} pitches on {last_outing.game_date}."
        )
    elif consec_blocked:
        status = STATUS_REST
        risk_level = "HIGH"
        warnings.append(
            "Consecutive-day limit reached: player has pitched on each of the last "
            "2 days. Cannot pitch a 3rd consecutive day."
        )
    elif streak == CONSECUTIVE_DAY_LIMIT:
        # Pitched 2 days in a row but today is a new day — not blocked yet, but warn
        status = STATUS_CAUTION
        risk_level = "MEDIUM"
        warnings.append(
            f"Pitched on {streak} consecutive days. One more consecutive day will trigger a mandatory rest day."
        )
    elif pitches_last_7 >= 75:
        status = STATUS_CAUTION
        risk_level = "MEDIUM"
        warnings.append(f"High workload: {pitches_last_7} pitches in the last 7 days.")
    elif pitches_last_7 >= 50:
        status = STATUS_CAUTION
        risk_level = "MEDIUM"
        warnings.append(f"Moderate workload: {pitches_last_7} pitches in the last 7 days.")
    else:
        status = STATUS_AVAILABLE
        risk_level = "LOW"

    if streak == 1 and status == STATUS_AVAILABLE:
        warnings.append("Pitched yesterday — monitor consecutive-day count.")

    return PitchStatusResult(
        status=status,
        risk_level=risk_level,
        days_rest_required=(next_available - as_of).days if status == STATUS_REST else 0,
        next_available_date=next_available.isoformat(),
        pitches_last_outing=last_outing.pitches_thrown,
        pitches_last_7_days=pitches_last_7,
        consecutive_days_pitched=streak,
        consecutive_day_block=consec_blocked,
        warnings=warnings,
    )
