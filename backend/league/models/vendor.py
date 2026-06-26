"""
Vendor model — stores league vendor/supplier contacts.
"""
from django.db import models


VENDOR_CATEGORIES = [
    ("uniforms",      "Uniforms"),
    ("equipment",     "Equipment"),
    ("trophies",      "Trophies & Awards"),
    ("photography",   "Photography"),
    ("printing",      "Printing"),
    ("concessions",   "Food & Concessions"),
    ("facilities",    "Fields & Facilities"),
    ("umpires",       "Umpires"),
    ("sponsors",      "Sponsors"),
    ("other",         "Other"),
]

# Re-use board roles for the board_role association field
BOARD_ROLES = [
    ("President",           "President"),
    ("Vice President",      "Vice President"),
    ("Treasurer",           "Treasurer"),
    ("Secretary",           "Secretary"),
    ("Player Agent",        "Player Agent"),
    ("Safety Officer",      "Safety Officer"),
    ("Fundraising",         "Fundraising"),
    ("Sponsorship",         "Sponsorship"),
    ("Concessions",         "Concessions"),
    ("Grounds",             "Grounds"),
    ("Equipment Manager",   "Equipment Manager"),
    ("Umpire Coordinator",  "Umpire Coordinator"),
    ("Marketing",           "Marketing"),
    ("Information Officer", "Information Officer"),
    ("At-Large",            "At-Large"),
    ("Other",               "Other"),
]


class Vendor(models.Model):
    name          = models.CharField(max_length=200)
    category      = models.CharField(max_length=50, choices=VENDOR_CATEGORIES, default="other", db_index=True)
    contact_name  = models.CharField(max_length=150, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    website       = models.URLField(blank=True)
    notes         = models.TextField(blank=True)
    board_role    = models.CharField(max_length=100, choices=BOARD_ROLES, blank=True,
                                     help_text="Board role responsible for this vendor relationship.")

    # ── What they supply ──────────────────────────────────────────────────────
    products = models.TextField(
        blank=True,
        help_text="Comma-separated list of products/services this vendor supplies. E.g. 'Field chalk, Field paint, Mound clay'",
    )

    # ── Account information ───────────────────────────────────────────────────
    account_number = models.CharField(
        max_length=100, blank=True,
        help_text="Our account number with this vendor.",
    )
    account_name = models.CharField(
        max_length=200, blank=True,
        help_text="Name the account is registered under, if different from the league's current name.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class VendorLocation(models.Model):
    """A physical store/branch location for a vendor."""

    vendor   = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="locations")
    label    = models.CharField(max_length=100, help_text='Short label, e.g. "Fishers (Primary)" or "Indianapolis"')
    address  = models.CharField(max_length=300, blank=True)
    phone    = models.CharField(max_length=30, blank=True)
    website  = models.URLField(blank=True)
    notes    = models.TextField(blank=True, help_text="Location-specific notes, e.g. delivery area, pickup only")
    is_primary  = models.BooleanField(default=False, help_text="Primary/preferred location")
    sort_order  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-is_primary", "sort_order", "id"]

    def __str__(self):
        return f"{self.vendor.name} — {self.label}"
