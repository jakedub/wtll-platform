import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Alert, Box, Button, Chip, CircularProgress,
  FormControl, InputLabel, MenuItem, Paper, Select, Typography,
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"
import ArrowForwardIcon from "@mui/icons-material/ArrowForward"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts"
import client from "../api/client"

const RED = "#C41230"

// ── Program display config ────────────────────────────────────────────────────

const PROGRAM_CONFIG: Record<string, {
  label: string; color: string; sportLabel: string; order: number; yearRound?: boolean
}> = {
  RECREATION:    { label: "Recreation",    color: "#1565c0", sportLabel: "Baseball & Softball", order: 1 },
  ALL_STARS:     { label: "All Stars",     color: "#b45309", sportLabel: "Baseball & Softball", order: 2 },
  TEEN_BASEBALL: { label: "Teen Baseball", color: "#2e7d32", sportLabel: "Baseball",            order: 3 },
  TEEN_SOFTBALL: { label: "Teen Softball", color: "#6a1b9a", sportLabel: "Softball",            order: 4 },
  FALL_BALL:     { label: "Fall Ball",     color: "#c2410c", sportLabel: "Baseball & Softball", order: 5 },
  SHOWCASE:      { label: "Showcase",      color: "#78716c", sportLabel: "Year-Round",          order: 6, yearRound: true },
}

const PROGRAM_ORDER = ["RECREATION", "ALL_STARS", "TEEN_BASEBALL", "TEEN_SOFTBALL", "FALL_BALL", "SHOWCASE"]

// ── Step definitions ──────────────────────────────────────────────────────────

type StepKey = "divisions" | "teams" | "players" | "evaluations" | "draft" | "draft_complete" | "schedule" | "closed"

const PROGRAM_STEPS: Record<string, StepKey[]> = {
  RECREATION:    ["divisions", "teams", "players", "evaluations", "draft", "draft_complete", "schedule", "closed"],
  TEEN_BASEBALL: ["divisions", "teams", "players", "evaluations", "draft", "draft_complete", "schedule", "closed"],
  TEEN_SOFTBALL: ["divisions", "teams", "players", "evaluations", "draft", "draft_complete", "schedule", "closed"],
  FALL_BALL:     ["divisions", "teams", "players", "draft", "draft_complete", "schedule", "closed"],
  ALL_STARS:     ["divisions", "teams", "players", "schedule", "closed"],
  SHOWCASE:      [],
}

const STEP_META: Record<StepKey, { label: string; getLink: (sport: string) => string }> = {
  divisions:      { label: "Divisions",     getLink: ()       => "/program-years" },
  teams:          { label: "Teams",         getLink: ()       => "/team-management" },
  players:        { label: "Player Import", getLink: ()       => "/player-import" },
  evaluations:    { label: "Evaluations",   getLink: ()       => "/evaluations-hub" },
  draft:          { label: "Draft",         getLink: (s)      => s === "softball" ? "/draft?sport=softball" : "/draft" },
  draft_complete: { label: "Assignments",   getLink: (s)      => s === "softball" ? "/draft?sport=softball" : "/draft" },
  schedule:       { label: "Schedule",      getLink: (s)      => s === "softball" ? "/softball-schedule" : "/baseball-schedule" },
  closed:         { label: "Close Season",  getLink: ()       => "/program-years" },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProgramInfo {
  id: number
  name: string
  program_type: string
  program_type_label: string
  season_year: number
  sport: string
  is_active: boolean
  season_closed: boolean
}

interface StepStatus { done: boolean; count?: number }

interface PipelineStatus {
  program_id: number
  program_type: string
  season_year: number
  season_closed: boolean
  steps: Record<StepKey, StepStatus>
}

// ── Step chip ─────────────────────────────────────────────────────────────────

function StepChip({ label, state, onClick }: {
  label: string
  state: "done" | "current" | "future"
  onClick: () => void
}) {
  const styles = {
    done:    { bg: "#f0fdf4", border: "#86efac", color: "#15803d", iconColor: "#22c55e" },
    current: { bg: "#fff1f2", border: RED,       color: RED,       iconColor: RED },
    future:  { bg: "#fafafa", border: "#e4e4e7", color: "#a1a1aa", iconColor: "#d4d4d8" },
  }[state]

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex", alignItems: "center", gap: 0.5,
        px: 1.25, py: 0.5,
        border: `1px solid ${styles.border}`,
        borderRadius: 5,
        bgcolor: styles.bg,
        cursor: "pointer",
        transition: "all 0.15s",
        "&:hover": { opacity: 0.8, transform: "translateY(-1px)" },
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {state === "done"
        ? <CheckCircleOutlineIcon sx={{ fontSize: 13, color: styles.iconColor }} />
        : <RadioButtonUncheckedIcon sx={{ fontSize: 13, color: styles.iconColor }} />
      }
      <Typography sx={{ fontSize: "0.72rem", fontWeight: state === "current" ? 700 : 500, color: styles.color }}>
        {label}
      </Typography>
    </Box>
  )
}

// ── Program pipeline card ─────────────────────────────────────────────────────

function PipelineCard({ program, status, loading }: {
  program: ProgramInfo
  status: PipelineStatus | null
  loading: boolean
}) {
  const navigate = useNavigate()
  const cfg = PROGRAM_CONFIG[program.program_type] ?? { label: program.program_type_label, color: "#555", sportLabel: "", order: 99 }
  const steps = PROGRAM_STEPS[program.program_type] ?? []
  const sport = program.sport === "softball" ? "softball" : "baseball"

  // Find the first incomplete step
  const firstIncomplete = steps.find(s => !status?.steps[s]?.done)
  const allDone = steps.length > 0 && !firstIncomplete

  // Determine state for each step
  const getStepState = (step: StepKey): "done" | "current" | "future" => {
    const done = status?.steps[step]?.done ?? false
    if (done) return "done"
    if (step === firstIncomplete) return "current"
    return "future"
  }

  return (
    <Paper elevation={0} sx={{
      border: "1px solid #e4e4e7",
      borderLeft: `4px solid ${program.season_closed ? "#d4d4d8" : cfg.color}`,
      borderRadius: 2,
      overflow: "hidden",
      opacity: program.season_closed ? 0.75 : 1,
    }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: program.season_closed ? "#888" : "#111" }}>
              {program.name}
            </Typography>
            {program.season_closed && (
              <Chip
                icon={<LockOutlinedIcon sx={{ fontSize: "0.7rem !important" }} />}
                label="Closed"
                size="small"
                sx={{ height: 18, fontSize: "0.62rem", bgcolor: "#f4f4f5", color: "#888", fontWeight: 600 }}
              />
            )}
            {allDone && !program.season_closed && (
              <Chip label="All Steps Done" size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "#f0fdf4", color: "#15803d", fontWeight: 600, border: "1px solid #86efac" }} />
            )}
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{cfg.sportLabel}</Typography>
        </Box>

        {/* Step count summary */}
        {status && steps.length > 0 && (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
              {steps.filter(s => status.steps[s]?.done).length}
              <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 400, color: "#aaa" }}>
                /{steps.length}
              </Typography>
            </Typography>
            <Typography sx={{ fontSize: "0.65rem", color: "#aaa", mt: 0.25 }}>steps done</Typography>
          </Box>
        )}
      </Box>

      {/* Step rail */}
      {loading ? (
        <Box sx={{ px: 2.5, pb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={14} sx={{ color: "#ccc" }} />
          <Typography sx={{ fontSize: "0.72rem", color: "#bbb" }}>Loading…</Typography>
        </Box>
      ) : steps.length > 0 ? (
        <Box sx={{ px: 2.5, pb: 2 }}>
          {/* Steps */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mb: 1.5 }}>
            {steps.map((step, i) => (
              <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <StepChip
                  label={STEP_META[step].label}
                  state={getStepState(step)}
                  onClick={() => navigate(STEP_META[step].getLink(sport))}
                />
                {i < steps.length - 1 && (
                  <Box sx={{ width: 12, height: 1, bgcolor: "#e4e4e7", flexShrink: 0 }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Next step CTA */}
          {firstIncomplete && !program.season_closed && (
            <Button
              size="small"
              variant="contained"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              onClick={() => navigate(STEP_META[firstIncomplete].getLink(sport))}
              sx={{
                bgcolor: cfg.color,
                "&:hover": { bgcolor: cfg.color, filter: "brightness(0.88)" },
                fontSize: "0.72rem", py: 0.5, px: 1.5, fontWeight: 600,
              }}
            >
              Next: {STEP_META[firstIncomplete].label}
            </Button>
          )}

          {/* Step counts */}
          {status && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: firstIncomplete && !program.season_closed ? 1 : 0 }}>
              {(["divisions", "teams", "players"] as StepKey[]).filter(s => steps.includes(s)).map(s => {
                const count = status.steps[s]?.count ?? 0
                return count > 0 ? (
                  <Typography key={s} sx={{ fontSize: "0.68rem", color: "#888" }}>
                    <strong style={{ color: "#555" }}>{count}</strong>{" "}
                    {s === "divisions" ? "division" : s === "teams" ? "team" : "player"}{count !== 1 ? "s" : ""}
                  </Typography>
                ) : null
              })}
            </Box>
          )}
        </Box>
      ) : null}
    </Paper>
  )
}

// ── Showcase card (year-round) ────────────────────────────────────────────────

function ShowcaseCard({ program }: { program: ProgramInfo | null }) {
  const navigate = useNavigate()

  return (
    <Paper elevation={0} sx={{
      border: "1px solid #e4e4e7",
      borderLeft: "4px solid #78716c",
      borderRadius: 2,
    }}>
      <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#111" }}>
              {program?.name ?? "Showcase"}
            </Typography>
            <Chip label="Year-Round" size="small" sx={{ height: 18, fontSize: "0.62rem", bgcolor: "#f5f5f4", color: "#78716c", fontWeight: 600 }} />
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>Baseball & Softball — no seasonal pipeline</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button size="small" variant="outlined" startIcon={<ManageAccountsIcon sx={{ fontSize: 14 }} />}
            onClick={() => navigate("/team-management")}
            sx={{ fontSize: "0.72rem", borderColor: "#d4d4d8", color: "#555" }}>
            Teams
          </Button>
          <Button size="small" variant="outlined" startIcon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
            onClick={() => navigate("/baseball-schedule")}
            sx={{ fontSize: "0.72rem", borderColor: "#d4d4d8", color: "#555" }}>
            Schedule
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}

// ── Not-started card ──────────────────────────────────────────────────────────

function NotStartedCard({ programType }: { programType: string }) {
  const navigate = useNavigate()
  const cfg = PROGRAM_CONFIG[programType]

  return (
    <Paper elevation={0} sx={{
      border: "1px dashed #e4e4e7",
      borderLeft: `4px dashed ${cfg.color}30`,
      borderRadius: 2,
      bgcolor: "#fafafa",
    }}>
      <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "#aaa" }}>{cfg.label}</Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#ccc" }}>{cfg.sportLabel} — not started</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={<RocketLaunchIcon sx={{ fontSize: 13 }} />}
          onClick={() => navigate("/program-years")}
          sx={{ fontSize: "0.72rem", borderColor: "#d4d4d8", color: "#aaa", flexShrink: 0 }}>
          Start Season
        </Button>
      </Box>
    </Paper>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SeasonPipelinePage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const [programs, setPrograms] = useState<ProgramInfo[]>([])
  const [statuses, setStatuses] = useState<Record<number, PipelineStatus>>({})
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Load programs for year
  useEffect(() => {
    setLoadingPrograms(true)
    setPrograms([])
    setStatuses({})
    setError(null)
    client.get(`/program-years/?year=${year}`)
      .then(r => {
        const groups: { year: number; programs: ProgramInfo[] }[] = r.data ?? []
        const found = groups.find(g => g.year === year)
        setPrograms(found?.programs ?? [])
      })
      .catch(() => setError("Failed to load programs."))
      .finally(() => setLoadingPrograms(false))
  }, [year])

  // Load pipeline status for each program
  useEffect(() => {
    if (programs.length === 0) return
    const ids = programs.map(p => p.id)
    setLoadingStatus(new Set(ids))

    ids.forEach(id => {
      client.get(`/program-years/${id}/pipeline-status/`)
        .then(r => {
          setStatuses(prev => ({ ...prev, [id]: r.data }))
        })
        .catch(() => {})
        .finally(() => {
          setLoadingStatus(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        })
    })
  }, [programs])

  // Build display list in season order
  const programsByType = Object.fromEntries(programs.map(p => [p.program_type, p]))

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Season Pipeline</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Track where each program is in its season lifecycle and jump to the next step.
        </Typography>
      </Box>

      {/* Year selector */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loadingPrograms ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Seasonal programs in order */}
          {PROGRAM_ORDER.filter(t => t !== "SHOWCASE").map(programType => {
            const cfg = PROGRAM_CONFIG[programType]
            const program = programsByType[programType]

            if (!program) {
              return <NotStartedCard key={programType} programType={programType} />
            }

            return (
              <PipelineCard
                key={program.id}
                program={program}
                status={statuses[program.id] ?? null}
                loading={loadingStatus.has(program.id)}
              />
            )
          })}

          {/* Showcase pinned at bottom */}
          <Box sx={{ mt: 1 }}>
            <ShowcaseCard program={programsByType["SHOWCASE"] ?? null} />
          </Box>
        </Box>
      )}
    </Box>
  )
}
