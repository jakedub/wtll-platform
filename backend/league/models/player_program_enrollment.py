from django.db import models


class PlayerProgramEnrollment(models.Model):
    player  = models.ForeignKey("Player",  on_delete=models.CASCADE, related_name="enrollments")
    program = models.ForeignKey("Program", on_delete=models.CASCADE)
    division = models.ForeignKey("Division", on_delete=models.PROTECT, null=True, blank=True)
    team     = models.ForeignKey("Team",    on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        # One enrollment per (player, program) — a player can be in multiple programs
        constraints = [
            models.UniqueConstraint(
                fields=["player", "program"],
                name="unique_player_per_program"
            )
        ]

    def __str__(self):
        prog = self.program.name if self.program else "?"
        div  = self.division.name if self.division else "?"
        team = self.team.name    if self.team     else "Free Agent"
        return f"{self.player} | {prog} | {div} | {team}"
