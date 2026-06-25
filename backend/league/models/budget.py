from decimal import Decimal
from django.db import models


BUDGET_DIVISIONS = [
    # Baseball
    ("TEE_BALL",   "Tee Ball"),
    ("PEE_WEE",    "Pee Wee"),
    ("AAA",        "AAA"),
    ("MAJORS",     "Majors"),
    # Softball
    ("SF_MINORS",  "Softball Minors"),
    ("SF_MAJORS",  "Softball Majors"),
    # Cross-sport
    ("ALL_DIV",    "All Divisions"),
]

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

    # Quantity-based pricing — when both are set, total = quantity × unit_cost
    quantity = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Number of units (e.g. 44 teams × $10 = $440).",
    )
    unit_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Cost per unit. Total = quantity × unit_cost.",
    )

    division = models.CharField(
        max_length=20, blank=True, choices=BUDGET_DIVISIONS,
        help_text="Baseball/Softball division this item applies to. Leave blank for cross-division items.",
    )

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
        """
        The estimate to display, in priority order:
        1. quantity × unit_cost  (auto-calculated if both are set)
        2. hand-entered estimate_override
        3. actual × 1.05
        4. estimate (may be None)
        """
        if self.quantity is not None and self.unit_cost is not None:
            return (Decimal(self.quantity) * self.unit_cost).quantize(Decimal("0.01"))
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
