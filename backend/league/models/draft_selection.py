# league/models/draft_selection.py

from django.db import models


class DraftSelection(models.Model):
    draft = models.ForeignKey(
        "league.Draft",
        on_delete=models.CASCADE,
        related_name="selections",
    )
    player = models.ForeignKey(
        "league.Player",
        on_delete=models.CASCADE,
        related_name="draft_selections",
    )
    team = models.ForeignKey(
        "league.Team",
        on_delete=models.CASCADE,
        related_name="draft_selections",
    )
    division = models.ForeignKey(
        "league.Division",
        on_delete=models.CASCADE,
    )
    selected_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A player can only be drafted once per draft session
        constraints = [
            models.UniqueConstraint(
                fields=["draft", "player"],
                name="unique_player_per_draft",
            )
        ]
        ordering = ["selected_at"]

    def __str__(self):
        return f"{self.player} → {self.team} in {self.draft.name}"
