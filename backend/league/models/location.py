"""
LeagueLocation — represents a park / facility used by WTLL or other leagues.
LocationField — a named field within a location (e.g. "Field 7", "Main Diamond").
"""
from django.db import models


class LeagueLocation(models.Model):
    """A physical location (park, complex, school field, etc.)."""

    name       = models.CharField(max_length=200)
    short_name = models.CharField(max_length=80, blank=True, default="")
    address    = models.CharField(max_length=255, blank=True, default="")
    city       = models.CharField(max_length=100, blank=True, default="")
    state      = models.CharField(max_length=50, blank=True, default="OH")
    zip_code   = models.CharField(max_length=20, blank=True, default="")
    district   = models.CharField(max_length=50, blank=True, default="",
                                   help_text="e.g. 'District 8'")
    is_home    = models.BooleanField(default=False,
                                     help_text="True = WTLL home field")
    notes      = models.TextField(blank=True, default="")
    league     = models.ForeignKey(
        "league.BoundaryLeague",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="locations",
        help_text="The Little League organisation this facility belongs to",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_home", "name"]
        verbose_name = "League Location"
        verbose_name_plural = "League Locations"

    def __str__(self):
        return self.short_name or self.name


class LocationField(models.Model):
    """A named field/diamond within a LeagueLocation."""

    location      = models.ForeignKey(
        LeagueLocation, on_delete=models.CASCADE, related_name="fields"
    )
    name          = models.CharField(max_length=100,
                                     help_text="e.g. 'Field 7', 'Main Diamond'")
    division_tag  = models.CharField(max_length=100, blank=True, default="",
                                     help_text="Optional: which division typically uses this field")
    sort_order    = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Location Field"
        verbose_name_plural = "Location Fields"

    def __str__(self):
        return f"{self.location} — {self.name}"
