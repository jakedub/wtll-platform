# league/models/event.py

from django.db import models


class Event(models.Model):
    EVENT_TYPE_CHOICES = [
        ("GAME", "Game"),
        ("PRACTICE", "Practice"),
        ("OTHER", "Other"),
    ]

    SOURCE_CHOICES = [
        ("TEAM_CENTRAL", "Team Central"),
        ("ADMIN", "Admin"),
    ]

    team = models.ForeignKey(
        "league.Team",
        on_delete=models.CASCADE,
        related_name="events",
    )

    calendar = models.ForeignKey(
        "league.TeamCalendar",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    # ICS UID — critical for syncing.
    # Not field-level unique because the same UID can appear across different
    # sources. Uniqueness is enforced by the (external_id, source) composite
    # constraint below.
    external_id = models.CharField(max_length=255, db_index=True)

    title = models.CharField(max_length=255)

    opponent = models.CharField(
        max_length=255,
        blank=True,
        help_text="Parsed opponent (e.g., 'Tigers')",
    )

    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPE_CHOICES,
        default="OTHER",
    )

    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)

    location = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    field= models.CharField(null=True, blank=True)
    field_id = models.IntegerField(null=True, blank=True)

    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
    )

    is_cancelled = models.BooleanField(default=False)

    # Concessions sign-up control
    concessions_closed = models.BooleanField(
        default=False,
        help_text="When True, concessions sign-up is closed for this game on the public page.",
    )

    last_synced_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["external_id", "source"],
                name="unique_event_per_source",
            )
        ]
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.title} ({self.start_time})"