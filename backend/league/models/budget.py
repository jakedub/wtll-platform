from decimal import Decimal
from django.db import models


BUDGET_CATEGORIES = [
    ("BASEBALL",     "Baseball"),
    ("SOFTBALL",     "Softball"),
    ("CONCESSIONS",  "Concessions"),
    ("MARKETING",    "Marketing"),
    ("GROUNDS",      "Grounds & Facilities"),
    ("RENT_UTIL",    "Rent & Utilities"),
    ("EQUIPMENT",    "Equipment"),
    ("ADMIN",        "Admin & Operations"),
    ("SPONSORSHIP",  "Sponsorship & Fundraising"),
    ("LL_FEES",      "Little League Fees"),
    ("SAFETY",       "Safety & Supplies"),
    ("APPAREL",      "Apparel"),
    ("SCHOLARSHIPS", "Scholarships"),
    ("DONATIONS",    "Donations"),
    ("OTHER",        "Other"),
]


class BudgetLine(models.Model):
    """A single budget line item for a given year."""

    year = models.PositiveIntegerField(db_index=True)
    category = models.CharField(max_length=20, choices=BUDGET_CATEGORIES)
    item = models.CharField(max_length=200)
    owner_role = models.CharField(max_length=150, blank=True)
    is_revenue = models.BooleanField(default=False)

    actual = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Prior year actual ($)",
    )
    estimate = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name="Current year estimate ($)",
    )
    # When True the estimate was hand-entered; when False it auto-follows actual * 1.05
    estimate_override = models.BooleanField(default=False)

    sub_group = models.CharField(
        max_length=100, blank=True,
        help_text="Optional grouping within a category (e.g. 'Regular Season', 'Winter Workout')",
    )
    notes = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["year", "category", "sort_order", "id"]

    def __str__(self):
        return f"{self.year} | {self.category} | {self.item}"

    @property
    def effective_estimate(self):
        """The estimate to display: hand-entered override or actual * 1.05."""
        if self.estimate_override and self.estimate is not None:
            return self.estimate
        if self.actual is not None:
            return (self.actual * Decimal("1.05")).quantize(Decimal("0.01"))
        return self.estimate  # may be None


class BudgetApproval(models.Model):
    """Records a Treasurer's approval of the budget for a given year."""

    year = models.PositiveIntegerField(unique=True)
    approved_by = models.CharField(max_length=150)
    approved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.year} approved by {self.approved_by}"
