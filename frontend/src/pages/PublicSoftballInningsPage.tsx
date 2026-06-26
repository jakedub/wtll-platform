/**
 * /public/softball-innings
 * Mobile-first scorekeeper tool for logging softball innings.
 * No admin login required.
 */
import { useEffect, useState } from "react"
import { Box, Typography, CircularProgress, Alert, Paper, Autocomplete, TextField, Button, Divider } from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import BlockIcon from "@mui/icons-material/Block"
import PublicNav from "../components/PublicNav"
import PublicRoleGate from "../components/PublicRoleGate"
import { getPlayers, getPlayerEnrollments } from "../api/players"
import client from "../api/client"
import type { Player } from "@/models/player"
import type { PlayerEnrollment } from "@/types"

const PINK = "#d81b60"
const SOFTBALL_DIVISIONS = ["softball majors", "softball minors"]

interface SoftballStatus {
  status: "AVAILABLE" | "RESTING" | "MAX_INNINGS"
  innings_today: number
  innings_remaining_today: number
  innings_last_game: number
  last_game_date: string | null
  days_rest_required: number
  days_since_last_game: number
  next_available_date: string | null
}

const STATUS_CONFIG = {
  AVAILABLE:   { icon: <CheckCircleIcon  />, label: "Available to Pitch",      bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  RESTING:     { icon: <WarningAmberIcon />, label: "Resting — Cannot Pitch",  bg: "#fff8e1", color: "#b45309", border: "#fcd34d" },
  MAX_INNINGS: { icon: <BlockIcon        />, label: "Daily Limit Reached (12)", bg: "#fdecea", color: "#C41230", border: "#fca5a5" },
}

// ── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({ status }: { status: SoftballStatus | null }) {
  if (!status) return null
  const cfg = STATUS_CONFIG[status.status] ?? STATUS_CONFIG.AVAILABLE

  return (
    <Box sx={{ bgcolor: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 2, p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ color: cfg.color, display: "flex", fontSize: 28 }}>{cfg.icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: cfg.color }}>{cfg.label}</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: cfg.color, opacity: 0.85, mt: 0.25 }}>
          {status.innings_today} inn. today · {status.innings_remaining_today} remaining
          {status.status === "RESTING" && status.next_available_date
            ? ` · Available ${new Date(status.next_available_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
            : ""}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontSize: "2rem", fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
          {status.innings_today}
        </Typography>
        <Typography sx={{ fontSize: "0.65rem", color: cfg.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          innings
        </Typography>
      </Box>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicSoftballInningsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [enrollments, setEnrollments] = useState<PlayerEnrollment[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<PlayerEnrollment | null>(null)
  const [pitchStatus, setPitchStatus] = useState<SoftballStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [formInnings, setFormInnings] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastLogged, setLastLogged] = useState<{ player: string; innings: number } | null>(null)

  useEffect(() => {
    getPlayers({ sport: "softball" } as any)
      .then(data => {
        const eligible = data.filter(p => {
          const div = ((p as any).division_name ?? "").toLowerCase()
          return SOFTBALL_DIVISIONS.some(d => div.includes(d))
        })
        eligible.sort((a, b) => {
          const da = (a as any).division_name ?? ""; const db = (b as any).division_name ?? ""
          if (da !== db) return da.localeCompare(db)
          return (a.last_name ?? "").localeCompare(b.last_name ?? "")
        })
        setPlayers(eligible)
      })
      .finally(() => setLoadingPlayers(false))
  }, [])

  useEffect(() => {
    if (!selectedPlayer) {
      setEnrollments([]); setSelectedEnrollment(null); setPitchStatus(null); return
    }
    getPlayerEnrollments(selectedPlayer.id)
      .then(data => { setEnrollments(data); setSelectedEnrollment(null) })
      .catch(() => { setEnrollments([]); setSelectedEnrollment(null) })

    setStatusLoading(true)
    client.get(`/softball-innings/status/${selectedPlayer.id}/`)
      .then(r => setPitchStatus(r.data))
      .catch(() => setPitchStatus(null))
      .finally(() => setStatusLoading(false))
  }, [selectedPlayer])

  // Auto-select sole enrollment
  useEffect(() => {
    if (enrollments.length === 1) setSelectedEnrollment(enrollments[0])
  }, [enrollments])

  const innings = Number(formInnings)
  const projectedTotal = (pitchStatus?.innings_today ?? 0) + innings

  const handleSubmit = async () => {
    if (!selectedPlayer || !formInnings || innings < 1 || innings > 12) return
    setSubmitting(true); setSubmitError(null)
    try {
      await client.post("/softball-innings/", {
        player: selectedPlayer.id,
        player_enrollment: selectedEnrollment?.id ?? null,
        game_date: formDate,
        innings_pitched: innings,
      })
      setLastLogged({ player: selectedPlayer.full_name, innings })
      setFormInnings("")
      const r = await client.get(`/softball-innings/status/${selectedPlayer.id}/`)
      setPitchStatus(r.data)
    } catch (e: any) {
      setSubmitError(e?.response?.data?.error ?? "Failed to save. Try again.")
    } finally { setSubmitting(false) }
  }

  return (
    <PublicRoleGate requires={["is_coach", "is_staff", "is_board_member"]}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
        <PublicNav />

        <Box sx={{ maxWidth: 520, mx: "auto", px: 2, py: 3 }}>
          {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: PINK, borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#111", lineHeight: 1.1 }}>Innings Log</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>Softball Minors &amp; Majors</Typography>
          </Box>
        </Box>

        {/* Player search */}
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", mb: 1.5 }}>
            1 · Find Player
          </Typography>
          <Autocomplete
            options={players}
            getOptionLabel={p => `${p.last_name ?? ""}, ${p.first_name ?? ""}`}
            groupBy={p => (p as any).division_name ?? "No Division"}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedPlayer}
            onChange={(_, val) => { setSelectedPlayer(val); setLastLogged(null) }}
            renderOption={(props, p) => (
              <li {...props} key={p.id}>
                {p.last_name}, {p.first_name}
              </li>
            )}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={loadingPlayers ? "Loading…" : "Search by last name…"}
                size="medium"
                label="Pitcher"
                InputProps={{ ...params.InputProps, style: { fontSize: "1.05rem" } }}
              />
            )}
            loading={loadingPlayers}
            noOptionsText="No players found"
          />
          {enrollments.length > 1 && (
            <Autocomplete
              options={enrollments}
              getOptionLabel={e => e?.label ?? ""}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              value={selectedEnrollment}
              onChange={(_, val) => setSelectedEnrollment(val)}
              renderInput={params => (
                <TextField {...params} size="medium" label="Division / Team" sx={{ mt: 1.5 }} />
              )}
            />
          )}
        </Paper>

        {/* Status */}
        {statusLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} sx={{ color: PINK }} />
          </Box>
        )}
        {!statusLoading && selectedPlayer && (
          <Box sx={{ mb: 2 }}>
            <StatusBanner status={pitchStatus} />
          </Box>
        )}

        {/* Log form */}
        {selectedPlayer && (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", mb: 1.5 }}>
              2 · Log Innings
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
              <TextField
                type="date"
                size="medium"
                label="Game Date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="number"
                size="medium"
                label="Innings"
                value={formInnings}
                onChange={e => setFormInnings(e.target.value)}
                sx={{ flex: 1 }}
                inputProps={{ min: 1, max: 12, style: { fontSize: "1.25rem", fontWeight: 700, textAlign: "center" } }}
                helperText="1–12 innings"
              />
            </Box>

            {innings > 0 && pitchStatus && (
              <Box sx={{ bgcolor: "#f8f8f8", borderRadius: 1.5, p: 1.5, mb: 1.5, border: "1px solid #ebebeb" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "#777" }}>Today so far</Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{pitchStatus.innings_today} inn.</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "#777" }}>This entry</Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>+{innings}</Typography>
                </Box>
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Total</Typography>
                  <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: projectedTotal >= 12 ? "#C41230" : projectedTotal >= 7 ? "#b45309" : "#2e7d32" }}>
                    {projectedTotal} inn.
                  </Typography>
                </Box>
                {projectedTotal >= 7 && projectedTotal < 12 && (
                  <Typography sx={{ fontSize: "0.75rem", color: "#b45309", mt: 0.5 }}>
                    ⚠ Will require 1 day rest (7+ innings)
                  </Typography>
                )}
                {projectedTotal >= 12 && (
                  <Typography sx={{ fontSize: "0.75rem", color: "#C41230", mt: 0.5 }}>
                    ⛔ At daily maximum (12 innings)
                  </Typography>
                )}
              </Box>
            )}

            {submitError && <Alert severity="error" sx={{ mb: 1.5 }}>{submitError}</Alert>}

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!selectedPlayer || submitting || !formInnings || innings < 1 || innings > 12}
              onClick={handleSubmit}
              sx={{ bgcolor: PINK, "&:hover": { bgcolor: "#ad1457" }, fontWeight: 700, fontSize: "1rem", py: 1.5, minHeight: 52 }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Log Innings"}
            </Button>
          </Paper>
        )}

        {/* Success */}
        {lastLogged && (
          <Paper elevation={0} sx={{ border: "1.5px solid #a5d6a7", bgcolor: "#e8f5e9", borderRadius: 2, p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
            <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 28 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#2e7d32" }}>Logged!</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#2e7d32" }}>
                {lastLogged.player} — {lastLogged.innings} inning{lastLogged.innings !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Rules */}
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2, mt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#aaa", mb: 1 }}>
            LL Softball Pitching Rules
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {[
              { rule: "Max innings per day", value: "12" },
              { rule: "1 day rest required if", value: "7+ innings" },
              { rule: "No rest required if", value: "6 or fewer" },
            ].map(r => (
              <Box key={r.rule} sx={{ display: "flex", justifyContent: "space-between", px: 1, py: 0.5, bgcolor: "#fafafa", borderRadius: 1 }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#555" }}>{r.rule}</Typography>
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#333" }}>{r.value}</Typography>
              </Box>
            ))}
          </Box>
                </Paper>
        </Box>
      </Box>
    </PublicRoleGate>
  )
}
