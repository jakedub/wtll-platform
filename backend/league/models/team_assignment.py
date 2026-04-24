from django.db import models


class TeamAssignment(models.Model):
    COACH = "COACH"
    ASSISTANT = "ASSISTANT"

    ROLE_CHOICES = [
        (COACH, "Coach"),
        (ASSISTANT, "Assistant Coach"),
    ]

    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="team_assignments")
    team = models.ForeignKey("Team", on_delete=models.CASCADE, related_name="assignments")

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=COACH)
    season_year = models.IntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "team", "season_year"],
                name="unique_user_team_season"
            )
        ]