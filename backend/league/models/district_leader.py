"""
District Leader model — stores district and HQ contacts.
"""
from django.db import models


DISTRICT_POSITIONS = [
    ("District Administrator", "District Administrator"),
    ("Assistant District Administrator", "Assistant District Administrator"),
    ("District Commissioner", "District Commissioner"),
    ("UIC",                   "UIC (Umpire-in-Chief)"),
    ("Safety Officer",        "Safety Officer"),
    ("Treasurer",             "Treasurer"),
    ("Secretary",             "Secretary"),
    ("At-Large",              "At-Large"),
    ("HQ",                    "HQ"),
    ("Other",                 "Other"),
]


class DistrictLeader(models.Model):
    district_number = models.IntegerField(
        db_index=True,
        help_text="Little League district number (e.g. 12). Required.",
    )
    is_hq = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Check if this contact is Little League HQ (not a local district).",
    )
    name          = models.CharField(max_length=150, blank=True)
    position      = models.CharField(max_length=100, choices=DISTRICT_POSITIONS, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["district_number", "is_hq", "position", "name"]

    def __str__(self):
        label = "HQ" if self.is_hq else f"District {self.district_number}"
        return f"{self.name or '(unnamed)'} — {label}"
