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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
