"""
Tests for the consecutive-day pitch rest rules in pitching_engine.py.
These are pure-function tests — no database required.
"""
from datetime import date, timedelta
import pytest

from league.services.pitching_engine import (
    _consecutive_days_pitched,
    _find_consecutive_block_end,
    compute_rest_required,
    STATUS_REST,
    STATUS_CAUTION,
    STATUS_AVAILABLE,
)

TODAY = date(2026, 6, 1)
D = lambda n: TODAY + timedelta(days=n)  # noqa: E731


# ── compute_rest_required ────────────────────────────────────────────────────

class TestComputeRestRequired:
    def test_zero_pitches(self):
        assert compute_rest_required(0) == 0

    def test_1_to_20(self):
        assert compute_rest_required(1) == 0
        assert compute_rest_required(20) == 0

    def test_21_to_35(self):
        assert compute_rest_required(21) == 1
        assert compute_rest_required(35) == 1

    def test_36_to_50(self):
        assert compute_rest_required(36) == 2
        assert compute_rest_required(50) == 2

    def test_51_to_65(self):
        assert compute_rest_required(51) == 3
        assert compute_rest_required(65) == 3

    def test_66_plus(self):
        assert compute_rest_required(66) == 4
        assert compute_rest_required(100) == 4


# ── _consecutive_days_pitched ────────────────────────────────────────────────

class TestConsecutiveDaysPitched:
    def test_empty(self):
        assert _consecutive_days_pitched([], TODAY) == 0

    def test_pitched_today_only(self):
        assert _consecutive_days_pitched([TODAY], TODAY) == 1

    def test_two_consecutive_ending_today(self):
        dates = [TODAY, D(-1)]
        assert _consecutive_days_pitched(dates, TODAY) == 2

    def test_three_consecutive_ending_today(self):
        dates = [TODAY, D(-1), D(-2)]
        assert _consecutive_days_pitched(dates, TODAY) == 3

    def test_gap_breaks_streak(self):
        # pitched today and two days ago — not consecutive
        dates = [TODAY, D(-2)]
        assert _consecutive_days_pitched(dates, TODAY) == 1

    def test_streak_ending_yesterday(self):
        # last pitched yesterday, not today
        dates = [D(-1), D(-2)]
        assert _consecutive_days_pitched(dates, TODAY) == 0

    def test_duplicate_dates_handled(self):
        # two entries on the same day shouldn't inflate streak
        dates = [TODAY, TODAY, D(-1)]
        assert _consecutive_days_pitched(dates, TODAY) == 2

    def test_long_streak(self):
        dates = [D(-i) for i in range(5)]  # 5 days including today
        assert _consecutive_days_pitched(dates, TODAY) == 5


# ── _find_consecutive_block_end ──────────────────────────────────────────────

class TestFindConsecutiveBlockEnd:
    def test_not_blocked_no_history(self):
        assert _find_consecutive_block_end([], TODAY) is None

    def test_not_blocked_pitched_today_only(self):
        assert _find_consecutive_block_end([TODAY], TODAY) is None

    def test_not_blocked_pitched_yesterday_only(self):
        assert _find_consecutive_block_end([D(-1)], TODAY) is None

    def test_not_blocked_pitched_two_days_ago_only(self):
        assert _find_consecutive_block_end([D(-2)], TODAY) is None

    def test_not_blocked_pitched_today_and_two_days_ago(self):
        # gap on day -1 — not consecutive
        assert _find_consecutive_block_end([TODAY, D(-2)], TODAY) is None

    def test_blocked_two_consecutive_days_before_today(self):
        # pitched day -2 and day -1 → blocked today
        dates = [D(-1), D(-2)]
        result = _find_consecutive_block_end(dates, TODAY)
        assert result == TODAY + timedelta(days=1)

    def test_blocked_with_extra_history(self):
        # pitched D-4, D-3 (old streak), then D-1 and D-2 (fresh streak)
        dates = [D(-1), D(-2), D(-4), D(-5)]
        result = _find_consecutive_block_end(dates, TODAY)
        assert result == TODAY + timedelta(days=1)

    def test_not_blocked_streak_was_broken(self):
        # D-3 and D-1 but not D-2 — no active 2-day streak into today
        dates = [D(-1), D(-3)]
        assert _find_consecutive_block_end(dates, TODAY) is None
