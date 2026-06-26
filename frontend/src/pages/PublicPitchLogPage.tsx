/**
 * /public/pitch-log  ("Log Pitches")
 * Mobile-first scorekeeper tool — no admin login required.
 * Flow: pick program (Recreation | Showcase) → division → player → log pitches.
 */
import { useEffect, useState } from "react"
import {
  Box, Typography, CircularProgress, Alert, Autocomplete,
  TextField, Button, Divider, Paper, Chip,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import BlockIcon from "@mui/icons-material/Block"
import PublicNav from "../components/PublicNav"
import PublicRoleGate from "../components/PublicRoleGate"
import { getPlayers, getPlayerEnrollments } from "../api/players"
import { createPitchCount } from "../api/pitchCount"
import client from "../api/client"
import type { Player } from "@/models/player"
import type { PlayerEnrollment } from "@/types"

const RED = "#C41230"

type ProgramType = "recreation" | "showcase"

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

// ── Status banner ─────────────────────────────────────────────────────────────
type CfgEntry = { icon: React.ReactNode; label: string; bg: string; color: string; border: string }
const STATUS_CFG: Record<string, CfgEntry> = {
  AVAILABLE: { icon: <CheckCircleIcon />,  label: "Available to Pitch",      bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  OK:        { icon: <CheckCircleIcon />,  label: "Available to Pitch",      bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
  CAUTION:   { icon: <WarningAmberIcon />, label: "Caution — High Workload", bg: "#fff8e1", color: "#b45309", border: "#fcd34d" },
  REST:      { icon: <BlockIcon />,        label: "Resting — Cannot Pitch",  bg: "#fdecea", color: RED,       border: "#fca5a5" },
}

function StatusBanner({ status }: { status: PitchStatus | null }) {
  if (!status) return null
  const cfg = STATUS_CFG[status.status] ?? STATUS_CFG.AVAILABLE
  return (
    <Box sx={{ bgcolor: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 2, p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ color: cfg.color, display: "flex", fontSize: 28 }}>{cfg.icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: cfg.color }}>{cfg.label}</Typography>
        <Typography sx={{ fontSize: "0.82rem", color: cfg.color, opacity: 0.85, mt: 0.25 }}>
          {status.pitches_last_outing > 0 ? `${status.pitches_last_outing} pitches last outing` : "No pitches logged yet"}
          {status.status === "REST" && status.next_available_date
            ? ` · Available ${new Date(status.next_available_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
            : ""}
          {status.status === "CAUTION" && status.warnings[0] ? ` · ${status.warnings[0]}` : ""}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography sx={{ fontSize: "2rem", fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
          {status.pitches_last_7_days}
        </Typography>
        <Typography sx={{ fontSize: "0.65rem", color: cfg.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          last 7 days
        </Typography>
      </Box>
    </Box>
  )
}

function restDaysRequired(pitches: number): number {
  if (pitches >= 66) return 4
  if (pitches >= 51) return 3
  if (pitches >= 36) return 2
  if (pitches >= 21) return 1
  return 0
}

// ── Program type button ───────────────────────────────────────────────────────
function ProgramBtn({
  label, sublabel, selected, color, onClick,
}: {
  label: string
  sublabel: string
  selected: boolean
  color: string
  onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        border: selected ? `2.5px solid ${color}` : "2px solid #e0e0e0",
        borderRadius: 2,
        p: 2,
        cursor: "pointer",
        bgcolor: selected ? `${color}0d` : "#fff",
        transition: "all 0.15s",
        "&:hover": { borderColor: color, bgcolor: `${color}08` },
        userSelect: "none",
        textAlign: "center",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: selected ? color : "#333" }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.75rem", color: selected ? color : "#999", mt: 0.25 }}>{sublabel}</Typography>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PublicPitchLogPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  // Step 1: program type
  const [programType, setProgramType] = useState<ProgramType | null>(null)

  // Step 2: division
  const [divisions, setDivisions] = useState<string[]>([])
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [playersInDivision, setPlayersInDivision] = useState<Player[]>([])

  // Step 3: player
  const [pitchersOnly, setPitchersOnly] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [enrollments, setEnrollments] = useState<PlayerEnrollment[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<PlayerEnrollment | null>(null)
  const [pitchStatus, setPitchStatus] = useState<PitchStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  // Step 4: log
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [formPitches, setFormPitches] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastLogged, setLastLogged] = useState<{ player: string; pitches: number } | null>(null)

  const BASEBALL_KEYWORDS = ["aaa", "majors", "major"]

  // Load all eligible players on mount
  useEffect(() => {
    getPlayers({})
      .then(data => {
        // Keep baseball AAA/Majors players
        const eligible = data.filter(p => {
          const div   = (p.division_name ?? "").toLowerCase()
          const sport = (p.sport ?? "").toLowerCase()
          if (sport === "softball") return false
          return BASEBALL_KEYWORDS.some(k => div.includes(k))
        })
        eligible.sort((a, b) => {
          const da = a.division_name ?? ""; const db = b.division_name ?? ""
          if (da !== db) return da.localeCompare(db)
          return (a.last_name ?? "").localeCompare(b.last_name ?? "")
        })
        setAllPlayers(eligible)
      })
      .finally(() => setLoadingPlayers(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild divisions whenever programType changes
  useEffect(() => {
    if (!programType) { setDivisions([]); return }
    const pool = allPlayers.filter(p =>
      programType === "showcase" ? p.is_showcase : !p.is_showcase
    )
    const divSet: string[] = []
    for (const p of pool) {
      const d = p.division_name ?? "No Division"
      if (!divSet.includes(d)) divSet.push(d)
    }
    setDivisions(divSet)
    setSelectedDivision(null)
    setSelectedPlayer(null)
  }, [programType, allPlayers])

  // Filter players when division changes
  useEffect(() => {
    if (!selectedDivision || !programType) {
      setPlayersInDivision([]); setSelectedPlayer(null); return
    }
    const pool = allPlayers.filter(p =>
      programType === "showcase" ? p.is_showcase : !p.is_showcase
    )
    setPlayersInDivision(pool.filter(p => (p.division_name ?? "No Division") === selectedDivision))
    setSelectedPlayer(null)
  }, [selectedDivision, programType, allPlayers])

  // Load enrollments + pitch status when player changes
  useEffect(() => {
    if (!selectedPlayer) {
      setEnrollments([]); setSelectedEnrollment(null); setPitchStatus(null); return
    }
    getPlayerEnrollments(selectedPlayer.id)
      .then(data => { setEnrollments(data); setSelectedEnrollment(null) })
      .catch(() => { setEnrollments([]); setSelectedEnrollment(null) })

    setStatusLoading(true)
    client.get(`/players/${selectedPlayer.id}/pitch-status/`)
      .then(r => setPitchStatus(r.data))
      .catch(() => setPitchStatus(null))
      .finally(() => setStatusLoading(false))
  }, [selectedPlayer])

  // Auto-select sole enrollment
  useEffect(() => {
    if (enrollments.length === 1) setSelectedEnrollment(enrollments[0])
  }, [enrollments])

  const pitchCount = Number(formPitches)
  const projectedRest = restDaysRequired(pitchCount)

  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedEnrollment || !formPitches || pitchCount < 1) return
    setSubmitting(true); setSubmitError(null)
    try {
      await createPitchCount({
        player: selectedPlayer.id,
        player_enrollment: selectedEnrollment.id,
        game_date: formDate,
        pitches_thrown: pitchCount,
      })
      setLastLogged({ player: selectedPlayer.full_name, pitches: pitchCount })
      setFormPitches("")
      const r = await client.get(`/players/${selectedPlayer.id}/pitch-status/`)
      setPitchStatus(r.data)
    } catch {
      setSubmitError("Failed to save. Check your connection and try again.")
    } finally { setSubmitting(false) }
  }

  const handleProgramSelect = (type: ProgramType) => {
    setProgramType(type)
    setLastLogged(null)
  }

  return (
    <PublicRoleGate requires={["is_coach", "is_staff", "is_board_member"]}>
      <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
        <PublicNav />

        <Box sx={{ maxWidth: 520, mx: "auto", px: 2, py: 3 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#111", lineHeight: 1.1 }}>Log Pitches</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>AAA &amp; Majors — Baseball</Typography>
          </Box>
        </Box>

        {/* Step 1: Program type */}
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", mb: 1.5 }}>
            1 · Program
          </Typography>
          {loadingPlayers ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}><CircularProgress size={20} /></Box>
          ) : (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <ProgramBtn
                label="Recreation"
                sublabel="Regular season"
                selected={programType === "recreation"}
                color={RED}
                onClick={() => handleProgramSelect("recreation")}
              />
              <ProgramBtn
                label="Showcase"
                sublabel="All-Star / Showcase"
                selected={programType === "showcase"}
                color="#1565c0"
                onClick={() => handleProgramSelect("showcase")}
              />
            </Box>
          )}
        </Paper>

        {/* Step 2: Division */}
        {programType && (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", mb: 1.5 }}>
              2 · Select Division
            </Typography>
            {divisions.length === 0 ? (
              <Typography sx={{ fontSize: "0.85rem", color: "#aaa", fontStyle: "italic" }}>
                No players found for this program type.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {divisions.map(div => (
                  <Chip
                    key={div}
                    label={div}
                    clickable
                    onClick={() => setSelectedDivision(div === selectedDivision ? null : div)}
                    variant={selectedDivision === div ? "filled" : "outlined"}
                    sx={{
                      fontWeight: selectedDivision === div ? 700 : 400,
                      bgcolor: selectedDivision === div ? RED : "transparent",
                      color: selectedDivision === div ? "#fff" : "#444",
                      borderColor: selectedDivision === div ? RED : "#ccc",
                      fontSize: "0.85rem",
                      "&:hover": { bgcolor: selectedDivision === div ? "#960E24" : "#f0f0f0" },
                    }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        )}

        {/* Step 3: Player */}
        {selectedDivision && (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888" }}>
                3 · Find Player
              </Typography>
              <Chip
                label="Pitchers Only"
                size="small"
                clickable
                onClick={() => { setPitchersOnly(v => !v); setSelectedPlayer(null) }}
                variant={pitchersOnly ? "filled" : "outlined"}
                sx={{
                  fontWeight: pitchersOnly ? 700 : 500,
                  bgcolor: pitchersOnly ? RED : "transparent",
                  color: pitchersOnly ? "#fff" : "#666",
                  borderColor: pitchersOnly ? RED : "#ccc",
                  fontSize: "0.72rem",
                  height: 24,
                  "&:hover": { bgcolor: pitchersOnly ? "#960E24" : "#f5f5f5" },
                }}
              />
            </Box>
            <Autocomplete
              options={pitchersOnly ? playersInDivision.filter(p => p.is_pitcher) : playersInDivision}
              getOptionLabel={p => `${p.last_name ?? ""}, ${p.first_name ?? ""}`}
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
                  placeholder="Search by last name…"
                  size="medium"
                  label="Pitcher"
                  InputProps={{ ...params.InputProps, style: { fontSize: "1.05rem" } }}
                />
              )}
              noOptionsText={pitchersOnly ? "No flagged pitchers in this division" : "No players in this division"}
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
        )}

        {/* Status */}
        {statusLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}><CircularProgress size={24} sx={{ color: RED }} /></Box>
        )}
        {!statusLoading && selectedPlayer && (
          <Box sx={{ mb: 2 }}><StatusBanner status={pitchStatus} /></Box>
        )}

        {/* Step 4: Log */}
        {selectedPlayer && (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", mb: 1.5 }}>
              4 · Log Pitches
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
                label="Pitches Thrown"
                value={formPitches}
                onChange={e => setFormPitches(e.target.value)}
                sx={{ flex: 1 }}
                inputProps={{ min: 1, max: 110, style: { fontSize: "1.25rem", fontWeight: 700, textAlign: "center" } }}
              />
            </Box>

            {pitchCount > 0 && pitchStatus && (
              <Box sx={{ bgcolor: "#f8f8f8", borderRadius: 1.5, p: 1.5, mb: 1.5, border: "1px solid #ebebeb" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "#777" }}>This entry</Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{pitchCount} pitches</Typography>
                </Box>
                <Divider sx={{ my: 0.75 }} />
                {projectedRest > 0 ? (
                  <Typography sx={{ fontSize: "0.75rem", color: "#b45309" }}>
                    ⚠ Will require {projectedRest} day{projectedRest !== 1 ? "s" : ""} rest after this outing
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: "0.75rem", color: "#2e7d32" }}>
                    ✓ No rest required (1–20 pitches)
                  </Typography>
                )}
              </Box>
            )}

            {submitError && <Alert severity="error" sx={{ mb: 1.5 }}>{submitError}</Alert>}

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={!selectedPlayer || !selectedEnrollment || submitting || !formPitches || pitchCount < 1}
              onClick={handleSubmit}
              sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, fontWeight: 700, fontSize: "1rem", py: 1.5, minHeight: 52 }}
            >
              {submitting ? <CircularProgress size={22} color="inherit" /> : "Log Pitches"}
            </Button>
          </Paper>
        )}

        {/* Success */}
        {lastLogged && (
          <Paper elevation={0} sx={{ border: "1.5px solid #a5d6a7", bgcolor: "#e8f5e9", borderRadius: 2, p: 2, display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 28 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, color: "#2e7d32" }}>Logged!</Typography>
              <Typography sx={{ fontSize: "0.82rem", color: "#2e7d32" }}>
                {lastLogged.player} — {lastLogged.pitches} pitches
              </Typography>
            </Box>
          </Paper>
        )}

        {/* LL rules reference */}
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2, mt: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#aaa", mb: 1 }}>
            LL Pitch Count Rules
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5 }}>
            {[
              { range: "1–20",  rest: "0 days" },
              { range: "21–35", rest: "1 day"  },
              { range: "36–50", rest: "2 days" },
              { range: "51–65", rest: "3 days" },
              { range: "66+",   rest: "4 days" },
            ].map(r => (
              <Box key={r.range} sx={{ display: "flex", justifyContent: "space-between", px: 1, py: 0.5, bgcolor: "#fafafa", borderRadius: 1 }}>
                <Typography sx={{ fontSize: "0.75rem", color: "#555", fontWeight: 600 }}>{r.range}</Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{r.rest}</Typography>
              </Box>
            ))}
          </Box>
          </Paper>
        </Box>
      </Box>
    </PublicRoleGate>
  )
}
