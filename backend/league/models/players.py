from django.db import models


PROGRAMS = [
    ("spring", "Spring"),
    ("summer", "Summer"),
    ("fall", "Fall"),
    ("winter", "Winter"),
]

SPORTS = [
    ("baseball", "Baseball"),
    ("softball", "Softball"),
]

HAND_CHOICES = [
    ("right", "Right"),
    ("left", "Left"),
    ("switch", "Switch"),
]


class Player(models.Model):
    # ── Core identity ──────────────────────────────────────────────────────────
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)

    # ── Handedness ─────────────────────────────────────────────────────────────
    batting_hand = models.CharField(max_length=10, choices=HAND_CHOICES, blank=True)
    throwing_hand = models.CharField(max_length=10, choices=HAND_CHOICES, blank=True)

    # ── Status flags ───────────────────────────────────────────────────────────
    is_eligible = models.BooleanField(default=False)
    is_allstar = models.BooleanField(default=False)
    is_showcase = models.BooleanField(default=False)
    interested_showcase = models.BooleanField(default=False)
    residency_same = models.BooleanField(default=True)

    # ── Program metadata ───────────────────────────────────────────────────────
    program = models.CharField(max_length=30, blank=True, choices=PROGRAMS)
    sport = models.CharField(max_length=10, blank=True, choices=SPORTS, default="baseball")

    # ── Address ────────────────────────────────────────────────────────────────
    address_line_1 = models.CharField(max_length=100, blank=True)
    address_line_2 = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=50, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)

    # ── Geocoding / district ───────────────────────────────────────────────────
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    in_district = models.BooleanField(null=True, blank=True, db_index=True)
    district_checked_at = models.DateTimeField(null=True, blank=True)

    # ── School & eligibility ───────────────────────────────────────────────────
    school_name = models.CharField(max_length=255, blank=True)

    # ── League preferences (from enrollment CSV) ───────────────────────────────
    teammate_request = models.CharField(max_length=255, blank=True)
    coach_request = models.CharField(max_length=255, blank=True)
    jersey_size = models.CharField(max_length=10, blank=True)

    # ── Positions (M2M — added in migration 0008) ─────────────────────────────
    positions = models.ManyToManyField("league.Position", blank=True, related_name="players")

    # ── Tier (stored string, updated by management command after evaluations) ──
    # pitcher_tier and catcher_tier are computed @properties from Evaluation.
    # Only the overall tier label is stored for quick filtering.
    tier = models.CharField(max_length=10, blank=True)

    # ── Role flags (manually set by admin) ───────────────────────────────────
    is_pitcher = models.BooleanField(
        default=False,
        help_text="Manually flagged as a pitcher. Shows pitch count tracking on the player profile.",
    )
    is_catcher = models.BooleanField(
        default=False,
        help_text="Manually flagged as a catcher. Shown in draft and evaluation views.",
    )

    # ── Active / Archive ──────────────────────────────────────────────────────
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active in the current season. Set to False when a new program year starts; restored on import.",
    )
    is_archived = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft-delete: hides the player from active views. Only deletable from the recycling bin.",
    )
    archived_at = models.DateTimeField(null=True, blank=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.last_name}, {self.first_name}"

    # ── Basic properties ───────────────────────────────────────────────────────

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_address(self):
        """Combine address fields for geocoding."""
        parts = [self.address_line_1, self.address_line_2, self.city, self.state, self.zip_code]
        return ", ".join(filter(None, parts))

    # ── Evaluation-derived properties ──────────────────────────────────────────
    # These require the Evaluation model to exist (populated after evaluations are recorded).

    @property
    def latest_evaluation(self):
        """Most recent pre-season evaluation."""
        return self.evaluations.filter(evaluation_type="pre").order_by("-season_year").first()

    @property
    def overall_total(self):
        ev = self.latest_evaluation
        return ev.overall_total if ev else 0

    @property
    def total_pitching(self):
        ev = self.latest_evaluation
        return ev.total_pitching if ev else 0

    @property
    def total_catcher(self):
        ev = self.latest_evaluation
        return ev.total_catcher if ev else 0

    @property
    def tier_spot(self):
        """Numeric tier 1–5 derived from overall evaluation score."""
        total = self.overall_total
        if total >= 38:
            return 1
        elif total >= 34:
            return 2
        elif total >= 30:
            return 3
        elif total >= 26:
            return 4
        return 5

    @property
    def pitcher_tier_computed(self):
        """Ace / Strong / Development / None — computed from pitching evaluation."""
        total = self.total_pitching
        if total >= 9:
            return "Ace"
        elif total >= 7:
            return "Strong"
        elif total >= 5:
            return "Development"
        return "None"

    @property
    def catcher_tier_computed(self):
        """Elite / Strong / Emergency / None — computed from catcher evaluation."""
        total = self.total_catcher
        if total >= 9:
            return "Elite"
        elif total >= 7:
            return "Strong"
        elif total >= 5:
            return "Emergency"
        return "None"
