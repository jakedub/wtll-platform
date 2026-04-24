from django.db import models


class PlayerProgramEnrollment(models.Model):
    player = models.ForeignKey("Player", on_delete=models.CASCADE, related_name="enrollments")
    program = models.ForeignKey("Program", on_delete=models.CASCADE)

    division = models.ForeignKey("Division", on_delete=models.PROTECT)
    team = models.ForeignKey("Team", on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["player", "program"],
                name="unique_player_per_program"
            )
        ]