"""
Fundraising module models.

FacilitiesLineItem  — individual project items from the capital improvement plan
FundraisingCampaign — named fundraising efforts (raffle, grants, sponsors, etc.)
FundraisingDeposit  — dollars logged, optionally earmarked to a line item
"""
from django.db import models


FACILITY_CATEGORIES = [
    ("INFRA",      "Infrastructure"),
    ("SAFETY",     "Safety"),
    ("AMENITY",    "Amenity"),
    ("FULL",       "Full Build"),
    ("ELECTRICAL", "Electrical"),
]


class FacilitiesLineItem(models.Model):
    phase        = models.PositiveSmallIntegerField(
        choices=[(1, "Phase 1"), (2, "Phase 2"), (3, "Phase 3")],
        db_index=True,
    )
    location     = models.CharField(max_length=100)   # e.g. "Diamond 8"
    description  = models.CharField(max_length=200)
    category     = models.CharField(max_length=20, choices=FACILITY_CATEGORIES, default="INFRA")
    estimate_low  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estimate_high = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes        = models.TextField(blank=True, default="")
    sort_order   = models.PositiveIntegerField(default=0)
    is_complete  = models.BooleanField(default=False)

    class Meta:
        ordering = ["phase", "sort_order", "id"]

    def __str__(self):
        return f"[P{self.phase}] {self.location} — {self.description}"


class FundraisingCampaign(models.Model):
    name        = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    goal        = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class FundraisingDeposit(models.Model):
    campaign  = models.ForeignKey(FundraisingCampaign, on_delete=models.CASCADE, related_name="deposits")
    line_item = models.ForeignKey(
        FacilitiesLineItem, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="deposits",
    )
    amount    = models.DecimalField(max_digits=10, decimal_places=2)
    date      = models.DateField()
    notes     = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        earmark = f" → {self.line_item}" if self.line_item else " (general)"
        return f"${self.amount} via {self.campaign.name}{earmark}"
