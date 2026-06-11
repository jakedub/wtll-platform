from django.core.management.base import BaseCommand

from league.models.team_calendar import TeamCalendar
from league.services.calendar_ingestion import sync_team_calendar


def normalize_team_name(name: str) -> str:
    if not name:
        return ""

    name = name.strip()

    for suffix in [" - Majors", " - AAA", " - AA", " - AAAA", " - Minors"]:
        if name.endswith(suffix):
            name = name[: -len(suffix)].strip()
            break

    return name.lower()


def split_matchup(title: str):
    if "@" not in title:
        return None, None

    away, home = [x.strip() for x in title.split("@", 1)]
    return away, home


def resolve_opponent(title: str, team_name: str) -> str:
    away, home = split_matchup(title)

    if not away or not home:
        return ""

    team_norm = normalize_team_name(team_name)
    away_norm = normalize_team_name(away)
    home_norm = normalize_team_name(home)

    if team_norm == home_norm:
        return away
    if team_norm == away_norm:
        return home

    return away


class Command(BaseCommand):
    help = "Sync all team calendars from ICS feeds"

    def handle(self, *args, **options):
        calendars = TeamCalendar.objects.filter(is_active=True)

        self.stdout.write(f"Found {calendars.count()} calendars")

        total_created = 0
        total_updated = 0

        for calendar in calendars:
            self.stdout.write(f"Syncing {calendar.team.name}")

            try:
                result = sync_team_calendar(calendar)

                self.stdout.write(
                    f"DETAILS -> Calendar ID: {calendar.id} | Team: {calendar.team.name}"
                )

                self.stdout.write(
                    f"RESULT -> Created: {result['created']} | Updated: {result['updated']}"
                )

                total_created += result["created"]
                total_updated += result["updated"]

                self.stdout.write(
                    f"RUNNING TOTAL -> Created: {total_created} | Updated: {total_updated}"
                )

                self.stdout.write(
                    self.style.SUCCESS(
                        f"{calendar.team.name}: "
                        f"{result['created']} created, {result['updated']} updated"
                    )
                )
                

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed {calendar.team.name}: {str(e)}"
                    )
                )

        self.stdout.write("\n--- COMPLETE ---")
        self.stdout.write(f"Created: {total_created}")
        self.stdout.write(f"Updated: {total_updated}")