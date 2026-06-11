import React, { useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

import CalendarToolbar from "./CalendarToolbar";
import EventModal from "./EventModal";
import { CalendarEvent } from "@/models/calendar_event";
import "./calendarOverrides.css";

const localizer = momentLocalizer(moment);

export type ViewMode = "month" | "week" | "day";

type Props = {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  defaultView?: ViewMode
  viewModes?: ViewMode[];
  filters?: {
    fieldId?: number;
    teamId?: number;
  };
};

export default function SharedCalendar({
  events,
  onSelectEvent,
  viewModes,
  defaultView,
}: Props) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    onSelectEvent?.(event);
  };

  function eventStyleGetter(event: any) {
    const teamName = (event.team_name || "").toLowerCase()

    let backgroundColor = "#1976d2"

    // Team-based coloring (primary rule)
    if (teamName.includes("royals")) backgroundColor = "#4169E1" // royal blue
    if (teamName.includes("twins")) backgroundColor = "#0A1F44" // navy blue
    if (teamName.includes("tigers")) backgroundColor = "#FF8C00" // orange
    if (teamName.includes("guardians")) backgroundColor = "#B22222" // scarlet red

    // Cancelled override (highest priority)
    if (event.isCancelled) {
      backgroundColor = "#b71c1c"
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: 0.92,
        color: "white",
        border: "0px",
        display: "block",
        padding: "2px 6px",
        fontSize: "0.85rem",
      },
    }
  }
  const views = viewModes ?? ["month", "week", "day"];

  return (
    <>
      <Calendar<CalendarEvent>
        localizer={localizer}
        events={events}
        eventPropGetter={eventStyleGetter}
        startAccessor="start"
        endAccessor="end"
        defaultView={defaultView ?? 'month'}
        style={{
          height: 800,
          overflowX: "auto",
          fontSize: "0.85rem"
        }}
        views={views}
        components={{
          toolbar: CalendarToolbar as any,
        }}
        onSelectEvent={handleSelectEvent}
      />

      <EventModal
        open={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </>
  );
}