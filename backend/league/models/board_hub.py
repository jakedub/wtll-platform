from django.db import models


CALENDAR_COLORS = [
    ("red",    "Red"),
    ("gold",   "Gold"),
    ("green",  "Green"),
    ("blue",   "Blue"),
    ("purple", "Purple"),
    ("orange", "Orange"),
]

CHECKLIST_TYPES = [
    ("hard",        "Hard Deadline"),
    ("action",      "Action Item"),
    ("allstar",     "All Stars"),
    ("showcase",    "Showcase"),
    ("fundraising", "Fundraising"),
    ("tee_ball",    "Tee Ball"),
    ("general",     "General"),
]

CHECKLIST_GROUPS = [
    ("general",     "General"),
    ("marketing",   "Marketing"),
    ("budget",      "Budget"),
    ("fallball",    "Fall Ball"),
    ("allstars",    "All Stars"),
    ("showcase",    "Showcase"),
    ("fundraising", "Fundraising"),
    ("tee_ball",    "Tee Ball"),
]


class BoardCalendarEvent(models.Model):
    """A single event on the Board Operations calendar."""

    month_year  = models.CharField(max_length=30, help_text='e.g. "June 2026"')
    phase       = models.CharField(max_length=150, blank=True, help_text='Month phase label, e.g. "Fall Ball Launch"')
    text        = models.CharField(max_length=500)
    owner       = models.CharField(max_length=300, blank=True)
    color       = models.CharField(max_length=20, choices=CALENDAR_COLORS, default="red")
    year        = models.PositiveIntegerField(db_index=True)
    sort_order  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["year", "sort_order", "id"]

    def __str__(self):
        return f"{self.month_year}: {self.text[:60]}"


class BoardChecklistItem(models.Model):
    """A single row in the Board Operations master checklist."""

    date_window = models.CharField(max_length=150)
    item        = models.CharField(max_length=400)
    owner       = models.CharField(max_length=300, blank=True)
    item_type   = models.CharField(max_length=20, choices=CHECKLIST_TYPES, default="action")
    group       = models.CharField(max_length=20, choices=CHECKLIST_GROUPS, default="general")
    sort_order  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.date_window}: {self.item[:60]}"
