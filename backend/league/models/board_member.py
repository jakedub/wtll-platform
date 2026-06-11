"""
Board Member model — stores current board roster with roles.
The President's name is pulled onto TVF forms automatically.
"""
from django.db import models


# Standard WTLL board roles — editable via the app but these are the defaults
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


SPORT_CHOICES = [
    ("",         "Both / All Sports"),
    ("baseball", "Baseball"),
    ("softball", "Softball"),
]

# Roles where a sport designator is relevant
SPORT_ROLES = {"Vice President", "Player Agent"}


class BoardMember(models.Model):
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    role       = models.CharField(max_length=100, choices=BOARD_ROLES, default="At-Large")
    sport      = models.CharField(max_length=20, choices=SPORT_CHOICES, blank=True,
                                  help_text="Baseball or Softball — used for VP and Player Agent roles.")
    email      = models.EmailField(blank=True)
    phone      = models.CharField(max_length=30, blank=True)
    notes      = models.TextField(blank=True)
    is_active  = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "role", "last_name"]

    def __str__(self):
        return f"{self.full_name} — {self.role}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
