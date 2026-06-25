"""
Fundraising module models.

FundraisingPlan      — named fundraising project plans (Facilities, Scholarships, etc.)
FundraisingLineItem  — individual project items within a plan (renamed from FacilitiesLineItem)
FundraisingCampaign  — named fundraising efforts (raffle, grants, sponsors, etc.)
FundraisingDeposit   — dollars logged, optionally earmarked to a line item
"""
from django.db import models

# Curated palette for auto-assigned plan colors
PLAN_COLOR_PALETTE = [
    "#C41230", "#1565c0", "#6a1b9a", "#e65100",
    "#00838f", "#f57f17", "#37474f",
]

FACILITY_CATEGORIES = [
    ("INFRA",      "Infrastructure"),
    ("SAFETY",     "Safety"),
    ("AMENITY",    "Amenity"),
    ("FULL",       "Full Build"),
    ("ELECTRICAL", "Electrical"),
]

CAMPAIGN_TYPES = [
    ("RAFFLE",       "Raffle"),
    ("SPONSORSHIP",  "Sponsorship"),
    ("GRANT",        "Grant"),
    ("EVENT",        "Event"),
    ("DONATION",     "Direct Donation"),
    ("OTHER",        "Other"),
]


class FundraisingPlan(models.Model):
    """A named fundraising project plan (e.g. Facilities Capital Improvement)."""
    name        = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    uses_phases = models.BooleanField(
        default=False,
        help_text="When True, line items are grouped by phase (1/2/3).",
    )
    color       = models.CharField(
        max_length=7, blank=True, default="",
        help_text="Hex color code. If blank, a random color is assigned on first save.",
    )
    is_active   = models.BooleanField(default=True)
    sort_order  = models.PositiveIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "created_at"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.color:
            # Assign the next color in the palette based on existing plan count
            used = FundraisingPlan.objects.exclude(pk=self.pk).count()
            self.color = PLAN_COLOR_PALETTE[used % len(PLAN_COLOR_PALETTE)]
        super().save(*args, **kwargs)


class FundraisingLineItem(models.Model):
    """
    An individual project item within a plan.
    Previously named FacilitiesLineItem — renamed for generality.
    """
    plan         = models.ForeignKey(
        FundraisingPlan, on_delete=models.CASCADE,
        related_name="line_items", null=True, blank=True,
    )
    phase        = models.PositiveSmallIntegerField(
        choices=[(1, "Phase 1"), (2, "Phase 2"), (3, "Phase 3")],
        null=True, blank=True,
        help_text="Only used when the plan has uses_phases=True.",
    )
    location     = models.CharField(max_length=100)
    description  = models.CharField(max_length=200)
    category     = models.CharField(max_length=20, choices=FACILITY_CATEGORIES, default="INFRA")
    estimate_low  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estimate_high = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quoted_price  = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Contractor quote. Null = not yet quoted.",
    )
    notes        = models.TextField(blank=True, default="")
    sort_order   = models.PositiveIntegerField(default=0)
    is_complete  = models.BooleanField(default=False)

    class Meta:
        ordering = ["plan", "phase", "sort_order", "id"]

    def __str__(self):
        phase_str = f" P{self.phase}" if self.phase else ""
        return f"[{self.plan}]{phase_str} {self.location} — {self.description}"


class FundraisingCampaign(models.Model):
    name          = models.CharField(max_length=150)
    description   = models.TextField(blank=True, default="")
    campaign_type = models.CharField(
        max_length=20, choices=CAMPAIGN_TYPES, default="DONATION",
    )
    goal          = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class FundraisingDeposit(models.Model):
    campaign          = models.ForeignKey(
        FundraisingCampaign, on_delete=models.CASCADE, related_name="deposits",
    )
    line_item         = models.ForeignKey(
        FundraisingLineItem, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="deposits",
    )
    amount            = models.DecimalField(max_digits=10, decimal_places=2)
    date              = models.DateField()
    notes             = models.TextField(blank=True, default="")
    is_in_kind        = models.BooleanField(
        default=False,
        help_text="Non-cash contribution (labor, materials, equipment).",
    )
    in_kind_description = models.TextField(
        blank=True, default="",
        help_text="Description of the in-kind contribution.",
    )

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        kind = " [in-kind]" if self.is_in_kind else ""
        earmark = f" → {self.line_item}" if self.line_item else " (general)"
        return f"${self.amount}{kind} via {self.campaign.name}{earmark}"
