from django.db import models


class AllStarSelection(models.Model):
    RESIDENCY_CHOICES = [
        ("SCHOOL", "School Enrollment Form"),
        ("UTILITY", "Utility Bill"),
    ]

    player = models.ForeignKey(
        "league.Player",
        on_delete=models.CASCADE,
        related_name="allstar_selections",
    )
    division = models.ForeignKey(
        "league.Division",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="allstar_selections",
    )
    season_year = models.PositiveIntegerField()

    # Is this a returning All Star? (determines required docs)
    is_returning = models.BooleanField(
        default=False,
        help_text="Previously on a WTLL All Star roster — no residency docs required.",
    )

    # ── Paperwork checklist ──────────────────────────────────────────────────
    # Required for ALL players
    doc_tournament_verification = models.BooleanField(
        default=False,
        verbose_name="Tournament Verification Form",
    )
    doc_team_affidavit = models.BooleanField(
        default=False,
        verbose_name="Tournament Team Affidavit",
    )
    doc_uniforms_ordered = models.BooleanField(
        default=False,
        verbose_name="Uniforms Ordered",
    )
    doc_ll_patches = models.BooleanField(
        default=False,
        verbose_name="Little League Patches",
    )

    # Required for NEW players only
    doc_drivers_license = models.BooleanField(
        default=False,
        verbose_name="Parent/Guardian Driver's License",
    )
    doc_birth_certificate = models.BooleanField(
        default=False,
        verbose_name="Hardcopy Birth Certificate",
    )
    doc_residency_proof = models.BooleanField(
        default=False,
        verbose_name="Proof of Residency",
    )
    residency_type = models.CharField(
        max_length=10,
        choices=RESIDENCY_CHOICES,
        blank=True,
        verbose_name="Residency document type",
    )

    notes = models.TextField(blank=True)

    selected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("player", "season_year")
        ordering = ["-season_year", "division__name", "player__last_name"]

    def __str__(self):
        return f"{self.player} — All Stars {self.season_year}"

    @property
    def paperwork_complete(self) -> bool:
        """True when all required docs for this player's returning status are checked."""
        base = (
            self.doc_tournament_verification
            and self.doc_team_affidavit
            and self.doc_uniforms_ordered
            and self.doc_ll_patches
        )
        if self.is_returning:
            return base
        return base and self.doc_drivers_license and self.doc_birth_certificate and self.doc_residency_proof

    @property
    def docs_required(self) -> int:
        # TVF + Affidavit + Uniforms + Patches (always) + residency docs (new players only)
        return 4 if self.is_returning else 7

    @property
    def docs_complete(self) -> int:
        count = sum([
            self.doc_tournament_verification,
            self.doc_team_affidavit,
            self.doc_uniforms_ordered,
            self.doc_ll_patches,
        ])
        if not self.is_returning:
            count += sum([self.doc_drivers_license, self.doc_birth_certificate, self.doc_residency_proof])
        return count
