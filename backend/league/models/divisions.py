from django.db import models


class Division(models.Model):
    name = models.CharField(max_length=100, unique=True)
    program = models.ForeignKey(
        "league.Program",
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )



    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name




# ─── Future model stubs (designed, not built) ─────────────────────────────────
#
# class Evaluation(models.Model):
#     """
#     Player evaluation scores. Will be built in Phase 2.
#     Linked to Player via FK. Multiple evaluations per player per season.
#     Fields: hitting, fielding, throwing, pitching_score, catcher_score,
#             overall_rating, season_year, evaluator (User FK)
#     """
#     pass
#
# class DraftPick(models.Model):
#     """
#     Records which team drafted a player in which round.
#     Linked to Player, Team, and a Draft session.
#     Built in Phase 3 (Draft Engine).
#     """
#     pass
