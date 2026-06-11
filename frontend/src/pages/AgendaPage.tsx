import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { CalendarEvent } from "@/models/calendar_event";
import { getAllTeamEvents } from "../api/teams";
import { mapEvent } from "../mappers/events";

type GroupedAgenda = {
  date: string;
  divisions: Record<string, CalendarEvent[]>;
};

export default function AgendaPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

  useEffect(() => {
    async function load() {
      try {
        const apiEvents = await getAllTeamEvents();
        const mapped = apiEvents.map(mapEvent);
        setEvents(mapped);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getTeamColor(event: CalendarEvent) {
    const teamName = (event.team_name || "").toLowerCase();

    if (teamName.includes("royals")) return "#4169E1";
    if (teamName.includes("twins")) return "#0A1F44";
    if (teamName.includes("tigers")) return "#FF8C00";
    if (teamName.includes("guardians")) return "#B22222";

    return "#1976d2";
  }

  const grouped: GroupedAgenda[] = useMemo(() => {
    const map: Record<string, GroupedAgenda> = {};

    events.forEach((event) => {
      const dateKey = moment(event.start).format("YYYY-MM-DD");
      const division = event.division?.name || "Other";

      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, divisions: {} };
      }

      if (!map[dateKey].divisions[division]) {
        map[dateKey].divisions[division] = [];
      }

      map[dateKey].divisions[division].push(event);
    });

    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        ...day,
        divisions: Object.fromEntries(
          Object.entries(day.divisions)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, evts]) => [
              division,
              evts.sort((a, b) => a.start.getTime() - b.start.getTime()),
            ])
        ),
      }));
  }, [events]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading schedule...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 12, background: "#fff" }}>
      {/* Top nav button */}
      <button
        onClick={() => navigate("/calendar")}
            style={{
              position: "fixed",
              left: 232,
              zIndex: 10,

              padding: "12px 14px",
              minHeight: 44,

              borderRadius: 10,
              border: "none",
              background: "#1976d2",
              color: "white",
              cursor: "pointer",

              fontWeight: 600,
              fontSize: 24,

              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
      >
        ← Back
      </button>

      {grouped.map((day) => (
        <div key={day.date} style={{ marginBottom: 32 }}>
          {/* Date Header */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 12,
              borderBottom: "2px solid #eee",
              paddingBottom: 6,
            }}
          >
            {moment(day.date).format("MMMM D")}
          </div>

          {Object.entries(day.divisions).map(([division, evts]) => (
            <div key={division} style={{ marginBottom: 18 }}>
              {/* Division Header */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: "#666",
                  marginBottom: 8,
                }}
              >
                {division} Games
              </div>

              {evts.map((event) => {
                const color = event.isCancelled
                  ? "#b71c1c"
                  : getTeamColor(event);

                const title = event.opponent
                  ? `${event.team_name} vs ${event.opponent}`
                  : `${event.team_name} Practice`;

                return (
                  <div
                    key={event.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 8px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 24,
                        borderRadius: 3,
                        background: color,
                        marginTop: 2,
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{title}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {moment(event.start).format("h:mm A")} -{" "}
                        {event.end ? moment(event.end).format("h:mm A") : ""}
                      </div>
                      {event.field && (
                        <div style={{ fontSize: 12, color: "#999" }}>
                          {event.field}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      {/* Bottom scroll-to-top button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          position: "fixed",
          bottom: "max(10px, env(safe-area-inset-bottom))",
          left: 250,
          zIndex: 1000,

          padding: "12px 14px",
          minHeight: 50,
          minWidth: 50,

          borderRadius: 10,
          border: "none",
          background: "#333",
          color: "white",
          cursor: "pointer",

          fontWeight: 600,
          fontSize: 24,

          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          marginBottom: 30,
        }}
      >
        ↑ Top
      </button>
    </div>
  );
}