import { ApiEvent } from "@/models/api_event";
import { CalendarEvent } from "@/models/calendar_event";
export function mapEvent(e: ApiEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    start: new Date(e.start_time),
    end: e.end_time ? new Date(e.end_time) : null,

    eventType: e.event_type,
    isCancelled: e.is_cancelled,

    location: e.location,
    field: e.field,

    field_id: e.field_id,

    team_id: e.team,
    team_name: e.team_name,
    division: e.division,

    raw: e,
  }
}