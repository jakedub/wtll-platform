# league/models/draft.py

from django.db import models


class Draft(models.Model):
    name = models.CharField(max_length=100, help_text='e.g. "Fall 2026 AAA Draft"')
    year = models.PositiveIntegerField()
    division = models.ForeignKey(
        "league.Division",
        on_delete=models.CASCADE,
        related_name="drafts",
    )
    selected_teams = models.ManyToManyField(
        "league.Team",
        blank=True,
        related_name="drafts",
    )
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.year})"
