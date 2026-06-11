from django.db import models
from django.core.exceptions import ValidationError


class TeamCalendar(models.Model):
    SOURCE_CHOICES = [
        ("TEAM_CENTRAL", "Team Central"),
        ("ADMIN", "Admin Schedule"),
    ]

    team = models.ForeignKey(
        "league.Team",
        on_delete=models.CASCADE,
        related_name="calendars",
    )

    # Store raw value (webcal:// or https://). We normalize to https://
    ics_url = models.CharField(max_length=500)

    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default="TEAM_CENTRAL",
    )

    is_active = models.BooleanField(default=True)

    # Use consistent naming
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        """Normalize URL early (admin/forms) and validate basic shape."""
        if self.ics_url and self.ics_url.startswith("webcal://"):
            self.ics_url = self.ics_url.replace("webcal://", "https://", 1)

        if self.ics_url and not (
            self.ics_url.startswith("https://") or self.ics_url.startswith("http://")
        ):
            raise ValidationError({"ics_url": "Calendar URL must be http(s) or webcal."})

    def save(self, *args, **kwargs):
        # Ensure normalization even if clean() wasn't called
        if self.ics_url and self.ics_url.startswith("webcal://"):
            self.ics_url = self.ics_url.replace("webcal://", "https://", 1)
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["team", "ics_url"],
                name="unique_team_calendar_url",
            )
        ]
        indexes = [
            models.Index(fields=["team", "is_active"]),
        ]

    def __str__(self):
        return f"{self.team.name} - {self.source}"