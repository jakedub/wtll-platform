/**
 * /public/pitch-count
 * Coach-facing read-only view: all flagged pitchers grouped by division
 * showing rest status, pitches today, and next available date.
 * No admin login required.
 */
import { useEffect, useState } from "react"
import {
  Box, Typography, CircularProgress, Alert, Chip, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import BlockIcon from "@mui/icons-material/Block"
import PublicNav from "../components/PublicNav"
import client from "../api/client"

const RED = "#C41230"

interface PitchStatus {
  status: "AVAILABLE" | "CAUTION" | "REST"
  pitches_last_outing: number
  pitches_last_7_days: number
  days_rest_required: number
  next_available_date: string | null
  consecutive_days_pitched: number
  consecutive_day_block: boolean
  warnings: string[]
}

interface PitcherRow {
  id: number
  first_name: string
  last_name: string
  full_name: string
  division_name: string
  pitches_today: number
  pitch_status: PitchStatus | null
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: PitchStatus | null }) {
  if (!status) return <Chip label="—" size="small" sx={{ bgcolor: "#f0f0f0", color: "#aaa", fontSize: "0.7rem" }} />

  const cfg: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
    AVAILABLE: { label: "Available",  bg: "#e8f5e9", color: "#2e7d32", icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
    CAUTION:   { label: "Caution",    bg: "#fff8e1", color: "#b45309", icon: <WarningAmberIcon sx={{ fontSize: 13 }} /> },
    REST:      { label: "Resting",    bg: "#fdecea", color: RED,       icon: <BlockIcon sx={{ fontSize: 13 }} /> },
  }
  const c = cfg[status.status] ?? cfg.AVAILABLE

  return (
    <Chip
      icon={<Box sx={{ color: c.color, display: "flex", ml: "6px !important" }}>{c.icon}</Box>}
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: "0.72rem", border: "none" }}
    />
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicPitchCountPage() {
  const [rows, setRows] = useState<PitcherRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = () => {
    setLoading(true); setError(null)
    client.get("/pitch-count/public-summary/")
      .then(r => { setRows(r.data.results ?? []); setLastRefresh(new Date()) })
      .catch(() => setError("Failed to load pitch data. Check your connection."))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Group by division
  const byDivision = rows.reduce<Record<string, PitcherRow[]>>((acc, r) => {
    const d = r.division_name || "Unassigned"
    if (!acc[d]) acc[d] = []
    acc[d].push(r)
    return acc
  }, {})

  const divisionOrder = Object.keys(byDivision).sort()

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
      <PublicNav />

      <Box sx={{ maxWidth: 900, mx: "auto", px: 2, py: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#111", lineHeight: 1.1 }}>Pitch Count</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>{today}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "0.72rem", color: "#aaa" }}>
              Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </Typography>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={load} size="small" disabled={loading} sx={{ color: "#888" }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
          {[
            { label: "Available",  bg: "#e8f5e9", color: "#2e7d32" },
            { label: "Caution",    bg: "#fff8e1", color: "#b45309" },
            { label: "Resting",    bg: "#fdecea", color: RED       },
          ].map(s => (
            <Box key={s.label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.bg, border: `1.5px solid ${s.color}` }} />
              <Typography sx={{ fontSize: "0.72rem", color: "#666" }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: RED }} />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && divisionOrder.length === 0 && (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 4, textAlign: "center" }}>
            <Typography sx={{ color: "#888" }}>No pitchers found. Mark players as pitchers in the admin to see them here.</Typography>
          </Paper>
        )}

        {/* Division tables */}
        {!loading && divisionOrder.map(division => {
          const divRows = byDivision[division]
          // Sort: Resting first, then Caution, then Available; alpha within each
          const sorted = [...divRows].sort((a, b) => {
            const order: Record<string, number> = { REST: 0, CAUTION: 1, AVAILABLE: 2 }
            const sa = order[a.pitch_status?.status ?? "AVAILABLE"] ?? 2
            const sb = order[b.pitch_status?.status ?? "AVAILABLE"] ?? 2
            if (sa !== sb) return sa - sb
            return a.last_name.localeCompare(b.last_name)
          })

          return (
            <Paper key={division} elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, mb: 2, overflow: "hidden" }}>
              {/* Division header */}
              <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#1c1c1e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{division}</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                  {sorted.length} pitcher{sorted.length !== 1 ? "s" : ""}
                  {" · "}
                  {sorted.filter(r => r.pitch_status?.status === "REST").length} resting
                </Typography>
              </Box>

              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.72rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", py: 1, borderBottom: "1px solid #f0f0f0" } }}>
                    <TableCell>Player</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Pitches Today</TableCell>
                    <TableCell align="center">Last Outing</TableCell>
                    <TableCell align="center">Next Available</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map(row => {
                    const isResting = row.pitch_status?.status === "REST"
                    const isCaution = row.pitch_status?.status === "CAUTION"
                    return (
                      <TableRow
                        key={row.id}
                        sx={{
                          bgcolor: isResting ? "#fff8f8" : isCaution ? "#fffdf0" : "transparent",
                          "&:last-child td": { border: 0 },
                          "& td": { py: 1.25, borderBottom: "1px solid #f5f5f5" },
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                              {row.last_name}, {row.first_name}
                            </Typography>
                          </Box>
                          {row.pitch_status?.consecutive_days_pitched >= 2 && (
                            <Typography sx={{ fontSize: "0.68rem", color: "#b45309" }}>
                              {row.pitch_status.consecutive_days_pitched} consecutive days
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <StatusChip status={row.pitch_status} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography sx={{ fontWeight: row.pitches_today > 0 ? 700 : 400, fontSize: "0.85rem", color: row.pitches_today > 0 ? "#111" : "#bbb" }}>
                            {row.pitches_today > 0 ? row.pitches_today : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography sx={{ fontSize: "0.82rem", color: "#555" }}>
                            {row.pitch_status?.pitches_last_outing > 0 ? row.pitch_status.pitches_last_outing : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {isResting ? (
                            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: RED }}>
                              {formatDate(row.pitch_status?.next_available_date)}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: "0.8rem", color: "#2e7d32", fontWeight: 500 }}>Today</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
