/**
 * Public listing of all open evaluation events.
 * Linked from PublicNav when at least one evaluation is public.
 */
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Box, Button, CircularProgress, Paper, Typography } from "@mui/material"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import PublicNav from "../components/PublicNav"
import client from "../api/client"

const RED = "#C41230"

interface EventSummary { id: number; name: string; eval_date: string; start_time: string; location: string; available_count: number }

async function getPublicEvents(): Promise<EventSummary[]> {
  return (await client.get("/eval-events/public/")).data ?? []
}

export default function PublicEvaluationListPage() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicEvents().then(setEvents).finally(() => setLoading(false))
  }, [])

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
      <PublicNav />
      <Box sx={{ maxWidth: 680, mx: "auto", px: 2, py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: "#111", mb: 0.5 }}>
          Player Evaluations
        </Typography>
        <Typography sx={{ color: "#777", mb: 3 }}>
          Select an evaluation below to view available time slots and sign up your player.
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: RED }} />
          </Box>
        ) : events.length === 0 ? (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 8, textAlign: "center" }}>
            <CalendarMonthIcon sx={{ fontSize: 48, color: "#e4e4e7", mb: 1.5 }} />
            <Typography sx={{ fontWeight: 600, color: "#aaa", mb: 0.5 }}>No evaluations are currently open</Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "#bbb" }}>
              Check back later or contact the league for more information.
            </Typography>
          </Paper>
        ) : (
          events.map(e => {
            const d = new Date(e.eval_date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })
            return (
              <Paper key={e.id} elevation={0}
                sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 1.5,
                  "&:hover": { borderColor: RED, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
                  transition: "all 0.15s" }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "1rem", mb: 0.25 }}>{e.name}</Typography>
                    <Typography sx={{ fontSize: "0.85rem", color: "#555" }}>
                      📅 {d}
                      {e.location && <> · 📍 {e.location}</>}
                    </Typography>
                    <Typography sx={{ fontSize: "0.82rem", color: e.available_count > 0 ? "#2e7d32" : RED, fontWeight: 600, mt: 0.5 }}>
                      {e.available_count > 0 ? `${e.available_count} time slots available` : "All slots are full"}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    to={`/public/evaluations/${e.id}`}
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    disabled={e.available_count === 0}
                    sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, flexShrink: 0, alignSelf: "center" }}
                  >
                    Sign Up
                  </Button>
                </Box>
              </Paper>
            )
          })
        )}
      </Box>
    </Box>
  )
}
