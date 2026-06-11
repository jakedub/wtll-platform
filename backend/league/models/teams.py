from django.db import models
from django.conf import settings


class Team(models.Model):
    name = models.CharField(max_length=150)
    coach = models.CharField(max_length=150, blank=True, null=True)
    assistant_coach = models.CharField(max_length=150, blank=True, null=True)

    # Links the head coach's User account so they can log in and manage this team
    coach_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="coached_teams",
    )
    assistant_coach_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assistant_coached_teams",
    )
    jersey_color = models.CharField(max_length=50, blank=True, null=True)
    jersey_code = models.CharField(max_length=20, blank=True, null=True)
    year = models.PositiveIntegerField(default=2025)
    team_type = models.CharField(max_length=50, blank=True, null=True)  # e.g. "travel", "house"

    division = models.ForeignKey(
        "league.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teams",
    )

    home_location = models.CharField(max_length=255, blank=True, help_text="Default home field / location for schedule display")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "division", "year"],
                name="unique_team_per_division_year"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.coach})"

