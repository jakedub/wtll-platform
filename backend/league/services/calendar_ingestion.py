# league/services/calendar_ingestion.py

import requests
from icalendar import Calendar
from django.utils.timezone import make_aware
from datetime import datetime
import re

from league.models.event import Event


def normalize_team(name: str) -> str:
    return (
        name.lower()
        .replace("–", "-")
        .replace("—", "-")
        .replace("  ", " ")
        .strip()
    )


def parse_opponent(title: str, team_name: str) -> str:
    """
    Returns opponent relative to the calendar's team.
    Expected format: AWAY TEAM @ HOME TEAM
    """
    if "@" not in title:
        return ""

    away, home = [x.strip() for x in title.split("@", 1)]

    team = normalize_team(team_name)
    away_n = normalize_team(away)
    home_n = normalize_team(home)

    if team in home_n:
        return away
    if team in away_n:
        return home

    # fallback if team name doesn't match cleanly
    return away


def detect_event_type(title: str) -> str:
    title_lower = title.lower()

    if "practice" in title_lower:
        return "PRACTICE"
    if "scrimmage" in title_lower:
        return "GAME"
    if "vs" in title_lower or "@" in title_lower:
        return "GAME"

    return "OTHER"

def parse_field_info(description: str):
    """
    Extract field display + normalized field id.
    Example:
      '... > Field 1'
    """
    if not description or ">" not in description:
        return {
            "field_raw": "",
            "field_name": "",
            "field_id": None,
        }

    _, right = description.split(">", 1)
    field_name = right.strip()

    # Try to extract numeric field id
    match = re.search(r"Field\s*(\d+)", field_name, re.IGNORECASE)
    field_id = int(match.group(1)) if match else None

    return {
        "field_raw": field_name,
        "field_name": field_name,
        "field_id": field_id,
    }
def to_datetime(dt):
    """
    ICS dates can be date or datetime.
    Normalize to timezone-aware datetime.
    """
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return make_aware(dt)
        return dt
    return None


def sync_team_calendar(team_calendar):
    """
    Pull ICS feed and upsert into Event table.
    """

    response = requests.get(team_calendar.ics_url, timeout=15)
    response.raise_for_status()

    cal = Calendar.from_ical(response.text)

    created = 0
    updated = 0

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        external_id = str(component.get("UID") or "").strip()
        if not external_id:
            continue
        title = str(component.get("SUMMARY") or "Untitled Event")

        start = to_datetime(component.get("DTSTART").dt)
        end = component.get("DTEND").dt if component.get("DTEND") else None
        end = to_datetime(end) if end else None

        location = str(component.get("LOCATION") or "")
        description = str(component.get("DESCRIPTION") or "")
        field_info = parse_field_info(description)
        field = field_info["field_name"]
        field_id =field_info["field_id"]
        opponent = parse_opponent(title, team_calendar.team.name)
        event_type = detect_event_type(title)
        # Normalize title to handle CANCELED / RESCHEDULED prefixes
        normalized_title = title.lower()
        normalized_title = re.sub(r"^(canceled|cancelled|rescheduled)[-\s]*", "", normalized_title, flags=re.IGNORECASE).strip()

        # Upsert on (external_id, source) — the composite unique key.
        obj, is_created = Event.objects.update_or_create(
            external_id=external_id,
            source=team_calendar.source,
            defaults=dict(
                team=team_calendar.team,
                calendar=team_calendar,
                start_time=start,
                title=title,
                opponent=opponent,
                event_type=event_type,
                end_time=end,
                location=location,
                description=description,
                field=field,
                field_id=field_id,
            ),
        )

        if is_created:
            created += 1
        else:
            updated += 1

    # update sync timestamp
    team_calendar.last_synced_at = datetime.now()
    team_calendar.save(update_fields=["last_synced_at"])

    return {
        "created": created,
        "updated": updated,
    }