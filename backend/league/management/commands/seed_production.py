"""
Management command: seed_production

Sets up the essential WTLL configuration on a fresh production database.
Safe to run multiple times — uses get_or_create / update_or_create throughout.

Covers:
  - LeagueIdentity  (name, colors, contact info)
  - SiteSettings    (defaults)
  - BoardCalendarEvent + BoardChecklistItem  (delegates to seed_board_hub)

Usage (Railway console):
    /opt/venv/bin/python manage.py seed_production
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Seed production database with core WTLL configuration"

    def handle(self, *args, **options):
        self._seed_league_identity()
        self._seed_site_settings()
        self._seed_board_hub()
        self.stdout.write(self.style.SUCCESS("\n✓ Production seed complete."))

    # ── League Identity ────────────────────────────────────────────────────────

    def _seed_league_identity(self):
        from league.models.site_settings import LeagueIdentity
        li, created = LeagueIdentity.objects.get_or_create(pk=1)
        li.league_name    = "Washington Township Little League"
        li.short_name     = "WTLL"
        li.tagline        = "Developing players, building character."
        li.city           = "Avon"
        li.state          = "IN"
        li.contact_email  = "info@wtll.org"
        li.website_url    = "https://www.wtll.org"
        li.primary_color  = "#C41230"
        li.secondary_color = "#C41230"
        li.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} LeagueIdentity: {li.league_name}"
        ))

    # ── Site Settings ──────────────────────────────────────────────────────────

    def _seed_site_settings(self):
        from league.models.site_settings import SiteSettings
        ss, created = SiteSettings.objects.get_or_create(pk=1)
        # Only set defaults if this is a fresh row
        if created:
            ss.magic_link_expiry_minutes  = 60
            ss.umpire_signups_enabled     = False
            ss.volunteer_signups_enabled  = False
            ss.evaluation_signups_enabled = False
            ss.module_preseason_enabled   = True
            ss.module_finance_enabled     = True
            ss.module_baseball_enabled    = True
            ss.module_softball_enabled    = True
            ss.module_schedule_enabled    = True
            ss.module_involvement_enabled = True
            ss.save()
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Verified'} SiteSettings"
        ))

    # ── Board Hub ──────────────────────────────────────────────────────────────

    def _seed_board_hub(self):
        self.stdout.write("Seeding board hub calendar + checklist...")
        call_command("seed_board_hub", verbosity=1)
