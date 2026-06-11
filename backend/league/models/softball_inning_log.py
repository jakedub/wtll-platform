"""
Softball Inning Log — tracks innings pitched per game for softball players.

Rules (Minors & Majors):
  - Max 12 innings pitched in a calendar day.
  - If a player pitches in 7 or more innings in a day, one (1) calendar day
    of rest is mandatory before they may pitch again.
  - Delivery of a single pitch constitutes having pitched in an inning.
"""
from django.db import models


class SoftballInningLog(models.Model):
    player     = models.ForeignKey(
        "league.Player",
        on_delete=models.CASCADE,
        related_name="softball_inning_logs",
    )
    # Optional link to the player's program enrollment (for team context)
    player_enrollment = models.ForeignKey(
        "league.PlayerProgramEnrollment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="softball_inning_logs",
    )
    game_date       = models.DateField()
    innings_pitched = models.PositiveSmallIntegerField(
        help_text="Number of innings pitched in this game (1–12)."
    )
    notes = models.TextField(blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-game_date", "-logged_at"]

    def __str__(self):
        return f"{self.player} — {self.innings_pitched} inn on {self.game_date}"
