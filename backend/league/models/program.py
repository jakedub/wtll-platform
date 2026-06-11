from django.db import models


PROGRAM_TYPES = [
    ("RECREATION",   "Recreation"),
    ("ALL_STARS",    "All Stars"),
    ("SHOWCASE",     "Showcase"),
    ("TEEN_BASEBALL","Teen Baseball"),
    ("TEEN_SOFTBALL","Teen Softball"),
    ("FALL_BALL",    "Fall Ball"),
]

# Which program types are softball
SOFTBALL_PROGRAM_TYPES = {"TEEN_SOFTBALL"}

# Default divisions to create per program type (name: sport)
DEFAULT_DIVISIONS = {
    "RECREATION": [
        ("Majors", "baseball"), ("AAA", "baseball"), ("AA", "baseball"),
        ("Pee Wee", "baseball"), ("Tee Ball", "baseball"),
        ("Softball Majors", "softball"), ("Softball Minors", "softball"),
    ],
    "ALL_STARS":     [("All Stars Majors", "baseball"), ("All Stars AAA", "baseball"), ("All Stars Softball", "softball")],
    "SHOWCASE":      [("Showcase Baseball", "baseball"), ("Showcase Softball", "softball")],
    "TEEN_BASEBALL": [("Teen Juniors", "baseball"), ("Teen Seniors", "baseball")],
    "TEEN_SOFTBALL": [("Teen Softball", "softball")],
    "FALL_BALL":     [("Fall Ball Majors", "baseball"), ("Fall Ball AAA", "baseball"), ("Fall Ball AA", "baseball"), ("Fall Ball Softball", "softball")],
}


class Program(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    program_type = models.CharField(max_length=20, choices=PROGRAM_TYPES, default="RECREATION")
    season_year  = models.PositiveIntegerField(default=2026)
    sport = models.CharField(max_length=10, blank=True, default="baseball")
    is_active = models.BooleanField(default=True)
    # Season close: marks the program as completed for the year.
    # Closed programs are read-only — no new evaluations, draft picks, or roster changes.
    # Players remain active (is_active=True) after closing until Fall Ball ends.
    season_closed = models.BooleanField(default=False, db_index=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("season_year", "program_type")]
        ordering = ["season_year", "program_type"]

    def __str__(self):
        return self.name
