"""
Models for storing district boundary leagues and generated KML files.

Using the DB (rather than static files) means KML content persists across
Railway redeploys and can be updated via the admin UI without touching code.
"""
from django.db import models


class BoundaryLeague(models.Model):
    """
    A single Little League from the district boundary dataset.
    Sourced from ll_initial.json; editable at runtime via the Boundaries page.
    """

    league_id = models.IntegerField(unique=True)
    league_name = models.CharField(max_length=200)
    league_location = models.CharField(max_length=200, blank=True)
    official_name = models.CharField(max_length=200, blank=True)

    # 7 = District 7, 8 = District 8, null = unassigned / outside districts
    district = models.IntegerField(null=True, blank=True)

    is_district_league = models.BooleanField(default=True)

    # Raw shape data: list of {coordinates: [{lat, lng}]} objects (from LL Finder API)
    shape_components = models.JSONField(default=list)

    # Non-empty when this league shares a physical boundary with another
    # (e.g. Brownsburg Girls Softball shares Brownsburg's polygon).
    # KML generation skips these to avoid duplicate polygons.
    shared_boundary_with = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["district", "league_name"]

    def __str__(self) -> str:
        district_label = f"D{self.district}" if self.district else "unassigned"
        return f"{self.league_name} ({district_label})"

    @property
    def has_boundary(self) -> bool:
        """True if this league has coordinate data and its own polygon."""
        return bool(self.shape_components) and not self.shared_boundary_with


class GeneratedKML(models.Model):
    """
    Pre-generated KML content for each district view.

    The ServeKMLFileView checks this table first; if no record exists it falls
    back to the static file on disk.  Uploading a new KML or regenerating from
    BoundaryLeague data writes here, so changes survive redeploys.
    """

    DISTRICT_CHOICES = [
        ("wtll", "WTLL"),
        ("8", "District 8"),
        ("7", "District 7"),
        ("combined", "D7 + D8 Combined"),
    ]

    district_key = models.CharField(
        max_length=10, unique=True, choices=DISTRICT_CHOICES
    )
    kml_content = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Free-text note — "uploaded by Jake", "regenerated from league editor", etc.
    note = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Generated KML"
        verbose_name_plural = "Generated KMLs"

    def __str__(self) -> str:
        return f"KML ({self.district_key}) — {self.updated_at:%Y-%m-%d}"
