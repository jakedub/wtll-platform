# league/models/evaluation.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Evaluation(models.Model):
    EVALUATION_TYPE_CHOICES = [
        ("pre", "Pre-Season"),
        ("post", "Post-Season"),
    ]

    player = models.ForeignKey(
        "league.Player",
        on_delete=models.CASCADE,
        related_name="evaluations",
    )
    evaluator = models.ForeignKey(
        "league.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evaluations_given",
    )
    season_year = models.IntegerField()
    evaluation_type = models.CharField(max_length=10, choices=EVALUATION_TYPE_CHOICES)

    # ── Hitting (3 fields, max 15) ────────────────────────────────────────────
    hitting_power   = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    hitting_contact = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    hitting_form    = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)

    # ── Fielding (3 fields, max 15) ───────────────────────────────────────────
    fielding_form   = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    fielding_glove  = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    fielding_hustle = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)

    # ── Throwing (3 fields, max 15) ───────────────────────────────────────────
    throwing_form     = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    throwing_speed    = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    throwing_accuracy = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)

    # ── Pitching — AAA/Majors only (2 fields, max 10) ────────────────────────
    pitching_speed    = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    pitching_accuracy = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)

    # ── Catching — AAA/Majors only (2 fields, max 10) ────────────────────────
    catcher_receiving = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)
    catcher_blocking  = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)], null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One evaluation per player per season per type (pre/post)
        constraints = [
            models.UniqueConstraint(
                fields=["player", "season_year", "evaluation_type"],
                name="unique_evaluation_per_player_season_type",
            )
        ]
        ordering = ["-season_year", "evaluation_type"]

    def __str__(self):
        return f"{self.player} — {self.season_year} {self.get_evaluation_type_display()}"

    # ── Computed totals ───────────────────────────────────────────────────────

    @property
    def total_hitting(self):
        return sum(filter(None, [self.hitting_power, self.hitting_contact, self.hitting_form]))

    @property
    def total_fielding(self):
        return sum(filter(None, [self.fielding_form, self.fielding_glove, self.fielding_hustle]))

    @property
    def total_throwing(self):
        return sum(filter(None, [self.throwing_form, self.throwing_speed, self.throwing_accuracy]))

    @property
    def total_pitching(self):
        return sum(filter(None, [self.pitching_speed, self.pitching_accuracy]))

    @property
    def total_catcher(self):
        return sum(filter(None, [self.catcher_receiving, self.catcher_blocking]))

    @property
    def overall_total(self):
        """Hitting + Fielding + Throwing (max 45). Pitching/Catcher are separate tiers."""
        return self.total_hitting + self.total_fielding + self.total_throwing

    @property
    def tier_spot(self):
        """Overall numeric tier 1–5."""
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
    def pitcher_tier(self):
        total = self.total_pitching
        if total >= 9:
            return "Ace"
        elif total >= 7:
            return "Strong"
        elif total >= 5:
            return "Development"
        return "None"

    @property
    def catcher_tier(self):
        total = self.total_catcher
        if total >= 9:
            return "Elite"
        elif total >= 7:
            return "Strong"
        elif total >= 5:
            return "Emergency"
        return "None"
