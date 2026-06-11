from django.db import models


class EvaluationSignup(models.Model):
    """
    Sign-up for a player evaluation session.
    Parents/players register their interest before evaluation day.
    """
    season_year = models.PositiveIntegerField()
    division = models.ForeignKey(
        "league.Division",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="evaluation_signups",
    )
    player_first_name = models.CharField(max_length=100)
    player_last_name = models.CharField(max_length=100)
    player_dob = models.DateField(null=True, blank=True)
    parent_name = models.CharField(max_length=150, blank=True)
    parent_email = models.EmailField(blank=True)
    parent_phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    signed_up_at = models.DateTimeField(auto_now_add=True)

    # Admin controls
    is_public = models.BooleanField(
        default=False,
        help_text="When True, this sign-up form is visible on the public-facing sign-up page.",
    )

    class Meta:
        ordering = ["season_year", "player_last_name", "player_first_name"]

    def __str__(self):
        return f"{self.player_first_name} {self.player_last_name} — Eval {self.season_year}"


class EvaluationSignupWindow(models.Model):
    """
    Admin-controlled window defining when evaluations are open for sign-up.
    Only one window per year/division; when is_open=True the public form is active.
    """
    season_year = models.PositiveIntegerField()
    division = models.ForeignKey(
        "league.Division",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="eval_signup_windows",
    )
    eval_date = models.DateField(null=True, blank=True, verbose_name="Evaluation date")
    eval_location = models.CharField(max_length=255, blank=True)
    eval_time = models.CharField(max_length=100, blank=True, help_text="e.g. '9:00 AM – 12:00 PM'")
    is_open = models.BooleanField(
        default=False,
        help_text="Mark this window as active/current season.",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("season_year", "division")
        ordering = ["season_year", "division__name"]

    def __str__(self):
        div = self.division.name if self.division else "All"
        status = "OPEN" if self.is_open else "closed"
        return f"Eval signup {self.season_year} {div} [{status}]"
