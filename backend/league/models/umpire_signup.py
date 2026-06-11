# league/models/umpire_signup.py

from django.db import models


class UmpireSignup(models.Model):
    ROLE_CHOICES = [
        ("PLATE", "Plate Umpire"),
        ("BASE", "Base Umpire"),
    ]

    event = models.ForeignKey(
        "league.Event",
        on_delete=models.CASCADE,
        related_name="umpire_signups",
    )

    umpire_name = models.CharField(max_length=150)
    umpire_email = models.EmailField(blank=True)
    umpire_phone = models.CharField(max_length=30, blank=True)

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
    )

    signed_up_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Only one person per role per game
        constraints = [
            models.UniqueConstraint(
                fields=["event", "role"],
                name="unique_umpire_role_per_event",
            )
        ]
        ordering = ["event__start_time", "role"]

    def __str__(self):
        return f"{self.umpire_name} ({self.get_role_display()}) — {self.event}"
