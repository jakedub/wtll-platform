"""
Singleton models for platform-wide configuration.

SiteSettings   — operational config (magic link TTL, public toggles, default program year)
LeagueIdentity — branding / white-label config (name, colors, contact info)

Both use the "singleton" pattern: only one row ever exists (pk=1).
Use .get() to read, .save() to write.
"""
from django.db import models


class SiteSettings(models.Model):
    """
    Singleton (pk=1). Stores platform-wide operational settings.
    Access via: SiteSettings.objects.get_or_create(pk=1)[0]
    """

    # ── Public page access ────────────────────────────────────────────────────
    umpire_signups_enabled        = models.BooleanField(default=False,
        help_text="Whether the public umpire sign-up page is accepting submissions.")
    volunteer_signups_enabled     = models.BooleanField(default=False,
        help_text="Whether the public volunteer sign-up page is accepting submissions.")
    evaluation_signups_enabled    = models.BooleanField(default=False,
        help_text="Whether the public player evaluation sign-up pages are accepting registrations.")

    # ── Authentication ────────────────────────────────────────────────────────
    magic_link_expiry_minutes = models.PositiveIntegerField(default=15,
        help_text="How long a magic login link stays valid (minutes). Default: 15.")

    # ── Season ────────────────────────────────────────────────────────────────
    default_program = models.ForeignKey(
        "league.Program",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="The active program year used as the default context for pitch log and other pages.",
    )

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return "Site Settings"

    def save(self, *args, **kwargs):
        """Force singleton — always use pk=1."""
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls) -> "SiteSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class LeagueIdentity(models.Model):
    """
    Singleton (pk=1). Stores league branding and contact information.
    Designed for white-label use: a second league would have their own identity here.
    Access via: LeagueIdentity.objects.get_or_create(pk=1)[0]
    """

    # ── Names ─────────────────────────────────────────────────────────────────
    league_name  = models.CharField(max_length=150, default="Washington Township Little League",
        help_text="Full official league name.")
    short_name   = models.CharField(max_length=20, default="WTLL",
        help_text="Abbreviation shown in nav and tight spaces.")
    tagline      = models.CharField(max_length=200, blank=True, default="",
        help_text="Optional short tagline shown on public pages.")

    # ── Location ──────────────────────────────────────────────────────────────
    city  = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=50,  blank=True, default="")

    # ── Contact ───────────────────────────────────────────────────────────────
    contact_email = models.EmailField(blank=True, default="",
        help_text="Public contact email address. Used in magic link emails.")
    website_url   = models.URLField(blank=True, default="",
        help_text="League website URL.")

    # ── Branding ──────────────────────────────────────────────────────────────
    primary_color = models.CharField(max_length=7, default="#C41230",
        help_text="Primary brand color as a hex code (e.g. #C41230).")
    secondary_color = models.CharField(max_length=7, default="#1565c0",
        help_text="Secondary brand color as a hex code.")

    class Meta:
        verbose_name = "League Identity"
        verbose_name_plural = "League Identity"

    def __str__(self):
        return self.league_name or "League Identity"

    def save(self, *args, **kwargs):
        """Force singleton — always use pk=1."""
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls) -> "LeagueIdentity":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
