"""
One time cleanup for the Blue Sombrero UID bug.

Deletes all TEAM_CENTRAL synced Events (and, via cascade, any UmpireSignup
rows attached to them) and then re-syncs every active TeamCalendar from
scratch using the new stable dedup key. Run this once after deploying the
calendar_ingestion.py fix.

Usage:
    python manage.py wipe_and_resync_calendars
    python manage.py wipe_and_resync_calendars --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from league.models.event import Event
from league.models.team_calendar import TeamCalendar
from league.models.umpire_signup import UmpireSignup
from league.services.calendar_ingestion import sync_team_calendar


class Command(BaseCommand):
    help = "Wipe TEAM_CENTRAL synced events (and their umpire signups) and re-sync from ICS feeds."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show counts without deleting or syncing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        events_qs = Event.objects.filter(source="TEAM_CENTRAL")
        event_count = events_qs.count()
        signup_count = UmpireSignup.objects.filter(event__in=events_qs).count()

        self.stdout.write(
            f"Found {event_count} TEAM_CENTRAL events "
            f"({signup_count} attached umpire signups will also be removed)."
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — nothing deleted or synced."))
            return

        with transaction.atomic():
            deleted, _ = events_qs.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} rows (events + cascaded signups)."))

        calendars = TeamCalendar.objects.filter(is_active=True, source="TEAM_CENTRAL")
        self.stdout.write(f"Re-syncing {calendars.count()} active calendars...")

        total_created = total_updated = 0
        for calendar in calendars:
            try:
                result = sync_team_calendar(calendar)
                total_created += result["created"]
                total_updated += result["updated"]
                self.stdout.write(
                    f"  {calendar.team.name}: {result['created']} created, {result['updated']} updated"
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed {calendar.team.name}: {e}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created: {total_created} | Updated: {total_updated}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "Note: umpires who had already signed up for games will need to sign up again."
            )
        )
