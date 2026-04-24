from django.db import models
from league.services.pitching_engine import compute_rest_required



class PitchCount(models.Model):

    player = models.ForeignKey("league.Player", on_delete=models.CASCADE, related_name="pitch_counts")
    player_enrollment = models.ForeignKey(
        "league.PlayerProgramEnrollment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pitch_counts"
    )

    game_date = models.DateField()
    pitches_thrown = models.PositiveIntegerField()
    days_rest_required = models.PositiveIntegerField(default=0)

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-game_date", "-created_at"]

    def __str__(self):
        return (
            f"{self.player.full_name} — {self.game_date} — {self.pitches_thrown} pitches"
        )

    def save(self, *args, **kwargs):
        # Always enforce server-side rule for rest days
        self.days_rest_required = compute_rest_required(self.pitches_thrown or 0)
        super().save(*args, **kwargs)