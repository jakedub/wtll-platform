/**
 * ScheduleGeneratorPage — build a schedule and export to SportsConnect xlsx.
 *
 * Flow:
 *  1. Pick sport (Baseball / Softball)
 *  2. Pick division (grouped by program_type; Field Rental included)
 *  3. Pick event type (Game / Practice / Other)
 *  4. Teams auto-load from division; field defaults by division name
 *  5. Generate → editable table → Export xlsx
 */
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, IconButton, InputLabel, ListSubheader,
  MenuItem, Paper, Select, Step, StepLabel, Stepper,
  TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import DownloadIcon from "@mui/icons-material/Download"
import EventNoteIcon from "@mui/icons-material/EventNote"
import RefreshIcon from "@mui/icons-material/Refresh"
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer"
import TuneIcon from "@mui/icons-material/Tune"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import client from "../api/client"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Game {
  order: number
  round: number
  away_team: string
  home_team: string
  date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  field: string | null
}

interface Division {
  id: number
  name: string
  is_calendar_only: boolean
  sport: string | null
  program_type: string | null
}

type Sport = "baseball" | "softball" | ""
type EventType = "GAME" | "PRACTICE" | "OTHER"

// ── Smart field defaults ──────────────────────────────────────────────────────

function getFieldDefault(divName: string, sport: Sport): string {
  if (sport === "softball") return "Diamond 4"
  const n = divName.toLowerCase()
  if (n.includes("majors")) return "Diamond 3"
  if (n.includes("aaa")) return "Diamond 6"
  if (n.includes("aa")) return "Diamond 5"
  if (n.includes("pee wee") || n.includes("peewee")) return "Diamond 7"
  return ""
}

// ── Group divisions ───────────────────────────────────────────────────────────

function groupDivisions(divisions: Division[]) {
  const groups: Record<string, Division[]> = {}
  for (const d of divisions) {
    const key = d.is_calendar_only ? "FIELD_RENTAL" : (d.program_type ?? "OTHER")
    if (!groups[key]) groups[key] = []
    groups[key].push(d)
  }
  // Sort within each group
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.name.localeCompare(b.name))
  }
  return groups
}

const GROUP_LABEL: Record<string, string> = {
  RECREATION: "Recreation",
  SHOWCASE: "Showcase",
  FIELD_RENTAL: "Field Rental",
}

const GROUP_ORDER = ["RECREATION", "SHOWCASE"]

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditCell({
  value, onChange, center, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void
  center?: boolean; placeholder?: string; disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  if (disabled) {
    return (
      <Box sx={{
        px: 1, color: "#aaa", fontStyle: "italic", fontSize: "0.78rem",
        textAlign: center ? "center" : "left", lineHeight: "32px",
      }}>
        {value || "—"}
      </Box>
    )
  }

  if (!editing) {
    return (
      <Box
        onClick={() => { setEditing(true); setDraft(value) }}
        sx={{
          px: 1, cursor: "text", fontSize: "0.78rem", lineHeight: "32px",
          textAlign: center ? "center" : "left",
          color: value ? "inherit" : "#bbb",
          borderRadius: 0.5,
          "&:hover": { bgcolor: "#f0f4ff" },
          minWidth: 60, minHeight: 32,
        }}
      >
        {value || placeholder || "—"}
      </Box>
    )
  }

  return (
    <input
      ref={ref}
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => { onChange(draft); setEditing(false) }}
      onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false) } }}
      style={{
        width: "100%", border: "none", outline: "2px solid #1565c0",
        borderRadius: 4, padding: "2px 6px", fontSize: "0.78rem",
        textAlign: center ? "center" : "left", background: "#fff",
        boxSizing: "border-box", height: 32,
      }}
    />
  )
}

// ── Team select cell (dropdown for schedule table) ───────────────────────────

function TeamSelectCell({
  value, onChange, allTeams, disabled,
}: {
  value: string; onChange: (v: string) => void
  allTeams: string[]; disabled?: boolean
}) {
  if (disabled) {
    return (
      <Box sx={{ px: 1, color: "#aaa", fontStyle: "italic", fontSize: "0.78rem", lineHeight: "32px" }}>
        {value || "—"}
      </Box>
    )
  }
  // Include current value even if not in list (edge case)
  const options = allTeams.includes(value) || !value ? allTeams : [value, ...allTeams]
  return (
    <FormControl size="small" fullWidth variant="standard" sx={{ "& .MuiInput-root": { fontSize: "0.78rem" } }}>
      <Select
        value={value}
        onChange={e => onChange(e.target.value)}
        displayEmpty
        disableUnderline
        sx={{ fontSize: "0.78rem", pl: 1, "& .MuiSelect-select": { py: "5px" } }}
        renderValue={v => v ? String(v) : <em style={{ color: "#bbb" }}>—</em>}
        MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
      >
        {options.map(name => (
          <MenuItem key={name} value={name} sx={{ fontSize: "0.82rem" }}>{name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

// ── Weekday config ────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { label: "Mon", value: 0 }, { label: "Tue", value: 1 },
  { label: "Wed", value: 2 }, { label: "Thu", value: 3 },
  { label: "Fri", value: 4 }, { label: "Sat", value: 5 },
  { label: "Sun", value: 6 },
]

const LOCATION_OPTIONS = [
  "WT",
  "Away",
  "TBD",
]

const FIELD_OPTIONS = [
  "Diamond 1",
  "Diamond 2",
  "Diamond 3",
  "Diamond 4",
  "Diamond 5",
  "Diamond 6",
  "Diamond 7",
  "Diamond 8",
  "TBD",
]

// Weekend time options 9:00am – 2:00pm in 30-min steps
const WEEKEND_TIMES: string[] = Array.from({ length: 11 }, (_, i) => {
  const total = 540 + i * 30
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
})


// Conflict severity
type ConflictLevel = "red" | "purple" | "pink"
interface ConflictInfo { level: ConflictLevel; message: string }

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScheduleGeneratorPage() {
  // ── Sport + division state ────────────────────────────────────────────────
  const [sport, setSport] = useState<Sport>("")
  const [divisions, setDivisions] = useState<Division[]>([])
  const [divisionId, setDivisionId] = useState<number | "">("")
  const [eventType, setEventType] = useState<EventType>("GAME")

  // ── Config state ─────────────────────────────────────────────────────────
  const [divisionTeams, setDivisionTeams] = useState<string[]>([])  // options loaded from division
  const [teams, setTeams] = useState<string[]>(["", ""])             // selected team slots
  const [title, setTitle] = useState("2026 Schedule")
  const [rounds, setRounds] = useState("")          // empty = auto
  const [startDate, setStartDate] = useState("")
  const [gameDays, setGameDays] = useState<number[]>([])
  const [timeSlots, setTimeSlots] = useState<string[]>(["18:00"])
  const [durationHours, setDurationHours] = useState("2")
  const [location, setLocation] = useState("WT")
  const [field, setField] = useState("")

  // ── Generated schedule ───────────────────────────────────────────────────
  const [games, setGames] = useState<Game[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [generatedEventType, setGeneratedEventType] = useState<EventType>("GAME")

  // ── Mode & automate stepper ──────────────────────────────────────────────
  const [mode, setMode] = useState<"custom" | "automate">("custom")
  const [autoOpen, setAutoOpen] = useState(false)
  const [autoStep, setAutoStep] = useState(0)

  // Automate step 1: Division & Games (shares sport/divisionId/divisionTeams)
  const [autoGamesPerTeam, setAutoGamesPerTeam] = useState("14")

  // Automate step 2: Dates & Days
  const [autoStartDate, setAutoStartDate] = useState("")
  const [autoGameDays, setAutoGameDays] = useState<number[]>([])

  // Automate step 0 extra
  const [autoEventType, setAutoEventType] = useState<"GAME" | "PRACTICE">("GAME")

  // Automate step 1: Other Leagues (GAME only)
  const [autoOtherLeagues, setAutoOtherLeagues] = useState<{ name: string; teams: string[] }[]>([])

  // Automate step: Times
  const [autoWeeknightTime, setAutoWeeknightTime] = useState("18:00")
  const [autoWeekendTimes, setAutoWeekendTimes] = useState<string[]>([])

  // Automate step: Location & Fields
  const [autoLocation, setAutoLocation] = useState("WT")
  const [autoField, setAutoField] = useState("")

  // Automate step: Practice-specific
  const [autoTeamsPerDay, setAutoTeamsPerDay] = useState("1")

  // Coach conflict results
  const [conflicts, setConflicts] = useState<Record<number, ConflictInfo>>({})

  // ── Reset teams when event type changes ──────────────────────────────────
  useEffect(() => {
    setTeams(eventType === "GAME" ? ["", ""] : [""])
  }, [eventType])

  // ── Load divisions when sport changes ────────────────────────────────────
  useEffect(() => {
    if (!sport) { setDivisions([]); setDivisionId(""); setDivisionTeams([]); setTeams(eventType === "GAME" ? ["", ""] : [""]); return }
    const params: Record<string, string> = {}
    if (sport) params.sport = sport
    client.get("/divisions/", { params })
      .then(r => { setDivisions(r.data ?? []); setDivisionId("") })
      .catch(() => {})
  }, [sport])

  // ── When division changes: load team options + set field default ─────────
  useEffect(() => {
    if (!divisionId) {
      setDivisionTeams([])
      setTeams(eventType === "GAME" ? ["", ""] : [""])
      return
    }
    // Load team names as dropdown options only — do NOT auto-fill slots
    client.get("/teams/", { params: { division: divisionId, is_active: true } })
      .then(r => {
        const rows = r.data?.data ?? r.data ?? []
        const names: string[] = rows.map((t: any) => t.name).sort()
        setDivisionTeams(names)
        setTeams(eventType === "GAME" ? ["", ""] : [""])
      })
      .catch(() => {})
    // Smart field default
    const div = divisions.find(d => d.id === divisionId)
    if (div) {
      const defaultField = getFieldDefault(div.name, sport)
      if (defaultField) setField(defaultField)
    }
  }, [divisionId])

  // ── Team list helpers ────────────────────────────────────────────────────
  const setTeam = (i: number, v: string) =>
    setTeams(prev => prev.map((t, idx) => idx === i ? v : t))
  const addTeam = () => setTeams(prev => [...prev, "TBD"])
  const removeTeam = (i: number) => setTeams(prev => prev.filter((_, idx) => idx !== i))

  // ── Time slot helpers ────────────────────────────────────────────────────
  const setSlot = (i: number, v: string) =>
    setTimeSlots(prev => prev.map((s, idx) => idx === i ? v : s))
  const addSlot = () => setTimeSlots(prev => [...prev, ""])
  const removeSlot = (i: number) => setTimeSlots(prev => prev.filter((_, idx) => idx !== i))

  const toggleDay = (d: number) =>
    setGameDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())

  // ── Generate schedule ────────────────────────────────────────────────────
  const generate = async () => {
    const cleanTeams = teams.map(t => t.trim()).filter(t => t && t !== "")
    if (eventType === "GAME" && cleanTeams.length < 2) {
      setGenError("Select at least 2 teams.")
      return
    }
    if (eventType !== "GAME" && cleanTeams.length < 1) {
      setGenError("Select a team.")
      return
    }
    setGenerating(true)
    setGenError(null)
    setConflicts({})
    try {
      const res = await client.post("/schedules/generate/", {
        teams: cleanTeams,
        event_type: eventType,
        rounds: rounds ? parseInt(rounds) : undefined,
        start_date: startDate || undefined,
        game_days: gameDays.length ? gameDays : undefined,
        time_slots: timeSlots.filter(Boolean).length ? timeSlots.filter(Boolean) : undefined,
        duration_hours: parseFloat(durationHours) || 2,
        location: location || undefined,
        field: field || undefined,
      })
      setGames(res.data.games)
      setGeneratedEventType(eventType)
      if (eventType === "GAME") fetchConflicts(res.data.games)
    } catch (e: any) {
      setGenError(e?.response?.data?.error ?? "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  // ── In-table game mutations ──────────────────────────────────────────────
  const updateGame = (idx: number, key: keyof Game, value: string) => {
    setGames(prev => prev.map((g, i) => i === idx ? { ...g, [key]: value || null } : g))
  }
  const deleteGame = (idx: number) => {
    setGames(prev => {
      const next = prev.filter((_, i) => i !== idx)
      return next.map((g, i) => ({ ...g, order: i + 1 }))
    })
  }

  // ── Export ───────────────────────────────────────────────────────────────
  const exportXlsx = async () => {
    if (!games.length) return
    setExporting(true)
    try {
      const res = await client.post(
        "/schedules/export/",
        { games, title },
        { responseType: "blob" }
      )
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "_")}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  // ── Automate: run generation ──────────────────────────────────────────────
  const runAutomate = async () => {
    if (!divisionTeams.length) { setGenError("Select a division first."); return }

    // Build full team list: division teams + other league teams
    const externalTeams = autoOtherLeagues.flatMap(lg => lg.teams.filter(t => t.trim()))
    const allTeams = [...divisionTeams, ...externalTeams]

    const hasWeekdays = autoGameDays.some(d => d < 5)
    const hasWeekends = autoGameDays.some(d => d >= 5)
    const timeSlots: string[] = [
      ...(hasWeekdays && autoWeeknightTime ? [autoWeeknightTime] : []),
      ...(hasWeekends ? autoWeekendTimes : []),
    ]

    setGenerating(true)
    setGenError(null)
    try {
      const res = await client.post("/schedules/generate/", {
        teams: allTeams,
        event_type: autoEventType,
        rounds: autoGamesPerTeam ? parseInt(autoGamesPerTeam) : undefined,
        start_date: autoStartDate || undefined,
        game_days: autoGameDays.length ? autoGameDays : undefined,
        time_slots: timeSlots.length ? timeSlots : undefined,
        duration_hours: parseFloat(durationHours) || 2,
        location: autoLocation || "WT",
        field: autoField || field || undefined,
        ...(autoEventType === "PRACTICE" && { teams_per_day: parseInt(autoTeamsPerDay) || 1 }),
      })
      setGames(res.data.games)
      setGeneratedEventType(autoEventType)
      setConflicts({})
      setAutoOpen(false)
      if (autoEventType === "GAME") fetchConflicts(res.data.games)
    } catch (e: any) {
      setGenError(e?.response?.data?.error ?? "Generation failed.")
    } finally {
      setGenerating(false)
    }
  }

  // ── Coach conflict detection ───────────────────────────────────────────────
  const fetchConflicts = async (gameList: Game[]) => {
    try {
      const tRes = await client.get("/teams/", { params: { is_active: true } })
      const allT: any[] = tRes.data?.data ?? tRes.data ?? []

      let boardNames = new Set<string>()
      try {
        const bRes = await client.get("/board-members/")
        const bList: any[] = bRes.data?.data ?? bRes.data ?? []
        boardNames = new Set(bList.map((b: any) => `${b.first_name} ${b.last_name}`.trim().toLowerCase()))
      } catch {}

      // teamName (lowercase) → {head, asst} coach name strings
      const teamCoachMap: Record<string, { head: string; asst: string }> = {}
      for (const t of allT) {
        teamCoachMap[t.name.toLowerCase()] = {
          head: (t.coach ?? "").trim(),
          asst: (t.assistant_coach ?? "").trim(),
        }
      }

      // coachName (lowercase) → [{teamName, role}]
      const coachToTeams: Record<string, { teamName: string; role: "head" | "asst" }[]> = {}
      for (const t of allT) {
        if (t.coach?.trim()) {
          const key = t.coach.trim().toLowerCase()
          if (!coachToTeams[key]) coachToTeams[key] = []
          coachToTeams[key].push({ teamName: t.name, role: "head" })
        }
        // Assistant coaches may be comma-separated
        const asstNames = (t.assistant_coach ?? "").split(",").map((s: string) => s.trim()).filter(Boolean)
        for (const aName of asstNames) {
          const key = aName.toLowerCase()
          if (!coachToTeams[key]) coachToTeams[key] = []
          coachToTeams[key].push({ teamName: t.name, role: "asst" })
        }
      }

      // Parse HH:MM to minutes
      const toMins = (t: string | null): number => {
        if (!t) return -1
        const parts = t.split(":")
        if (parts.length < 2) return -1
        return parseInt(parts[0]) * 60 + parseInt(parts[1])
      }

      // Do two games overlap in date+time?
      const overlaps = (g1: Game, g2: Game): boolean => {
        if (!g1.date || !g2.date || g1.date !== g2.date) return false
        const s1 = toMins(g1.start_time), e1 = toMins(g1.end_time)
        const s2 = toMins(g2.start_time), e2 = toMins(g2.end_time)
        if (s1 < 0 || e1 < 0 || s2 < 0 || e2 < 0) return false
        return s1 < e2 && s2 < e1
      }

      const priority: Record<ConflictLevel, number> = { red: 3, purple: 2, pink: 1 }
      const next: Record<number, ConflictInfo> = {}

      const bump = (gameOrder: number, level: ConflictLevel, message: string) => {
        const cur = next[gameOrder]
        if (!cur || priority[level] > priority[cur.level]) next[gameOrder] = { level, message }
      }

      for (let i = 0; i < gameList.length; i++) {
        const game = gameList[i]
        if (game.away_team === "Bye") continue
        const teamsInGame = [game.away_team, game.home_team].filter(Boolean)

        for (const teamName of teamsInGame) {
          const coaches = teamCoachMap[teamName.toLowerCase()]
          if (!coaches) continue

          const coachEntries: { name: string; role: "head" | "asst" }[] = [
            { name: coaches.head, role: "head" as const },
            // Support comma-separated assistants
            ...coaches.asst.split(",").map((n: string): { name: string; role: "head" | "asst" } => ({ name: n.trim(), role: "asst" })),
          ].filter(c => c.name)

          for (const { name: coachName, role } of coachEntries) {
            const key = coachName.toLowerCase()

            // Board member → pink (informational flag, no time check)
            if (boardNames.has(key)) bump(game.order, "pink", `${coachName} is a board member`)

            // Check for time-overlapping games involving other teams this coach coaches
            const otherTeams = (coachToTeams[key] ?? []).filter(
              e => e.teamName.toLowerCase() !== teamName.toLowerCase()
            )

            for (const { teamName: otherTeam, role: otherRole } of otherTeams) {
              for (let j = 0; j < gameList.length; j++) {
                if (j === i) continue
                const other = gameList[j]
                if (other.away_team === "Bye") continue
                const otherInGame = [other.away_team, other.home_team]
                  .some(t => t?.toLowerCase() === otherTeam.toLowerCase())
                if (!otherInGame) continue
                if (!overlaps(game, other)) continue

                // Found time-overlapping games for this coach
                const msg = `${coachName} coaches ${teamName} (${role}) and ${otherTeam} (${otherRole}) — games overlap`
                if (role === "head" && otherRole === "head") {
                  bump(game.order, "red", msg)
                } else {
                  bump(game.order, "purple", msg)
                }
              }
            }
          }
        }
      }

      setConflicts(next)
    } catch (e) {
      console.warn("Conflict detection failed", e)
    }
  }

  // ── Grouped division menu items ──────────────────────────────────────────
  const grouped = groupDivisions(divisions)
  const divMenuItems: React.ReactNode[] = [
    <MenuItem key="__none" value="">— Select a division —</MenuItem>
  ]
  for (const groupKey of GROUP_ORDER) {
    const items = grouped[groupKey]
    if (!items?.length) continue
    const label = GROUP_LABEL[groupKey] ?? groupKey
    divMenuItems.push(
      <ListSubheader key={`grp_${groupKey}`} sx={{ fontWeight: 700, fontSize: "0.7rem", lineHeight: "28px", bgcolor: "#f5f5f5", color: "#666" }}>
        {label}
      </ListSubheader>
    )
    for (const d of items) {
      divMenuItems.push(
        <MenuItem key={d.id} value={d.id} sx={{ pl: 2.5, fontSize: "0.875rem" }}>
          {d.name}
        </MenuItem>
      )
    }
  }
  // Any leftover groups not in GROUP_ORDER
  for (const groupKey of Object.keys(grouped)) {
    if (GROUP_ORDER.includes(groupKey)) continue
    const items = grouped[groupKey]
    if (!items?.length) continue
    divMenuItems.push(
      <ListSubheader key={`grp_${groupKey}`} sx={{ fontWeight: 700, fontSize: "0.7rem", lineHeight: "28px", bgcolor: "#f5f5f5", color: "#666" }}>
        {groupKey}
      </ListSubheader>
    )
    for (const d of items) {
      divMenuItems.push(
        <MenuItem key={d.id} value={d.id} sx={{ pl: 2.5, fontSize: "0.875rem" }}>{d.name}</MenuItem>
      )
    }
  }

  // ── All unique team names from generated schedule ─────────────────────────
  const scheduleTeams = useMemo(() => {
    const names = new Set<string>()
    games.forEach(g => {
      if (g.away_team && !["Bye", "Practice", "Other"].includes(g.away_team)) names.add(g.away_team)
      if (g.home_team && !["Bye", "Practice", "Other"].includes(g.home_team)) names.add(g.home_team)
    })
    return Array.from(names).sort()
  }, [games])

  // ── WTLL team stats (division teams in generated schedule) ────────────────
  const wtllTeamStats = useMemo(() => {
    if (!divisionTeams.length || !games.length) return []
    return divisionTeams
      .filter(name => scheduleTeams.includes(name))
      .map(name => {
        const played = games.filter(g =>
          !["Bye", "Practice", "Other"].includes(g.away_team) &&
          (g.away_team === name || g.home_team === name)
        )
        return { name, total: played.length, home: played.filter(g => g.home_team === name).length }
      })
  }, [divisionTeams, scheduleTeams, games])

  // ── Stats ────────────────────────────────────────────────────────────────
  const isGameType = generatedEventType === "GAME"
  const labelRows = games.filter(g => g.away_team === "Bye" || (!isGameType && ["Practice", "Other"].includes(g.away_team)))
  const nonLabelCount = games.length - labelRows.length
  const byeCount = games.filter(g => g.away_team === "Bye").length
  const totalRounds = games.length ? Math.max(...games.map(g => g.round)) : 0

  // ── Generate button label ────────────────────────────────────────────────
  const genLabel = eventType === "GAME" ? "Generate Schedule"
    : eventType === "PRACTICE" ? "Generate Practices"
    : "Generate Events"

  // ── Render ────────────────────────────────────────────────────────────────

  // Reusable team dropdown
  const teamSelect = (i: number, placeholder: string) => (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      {divisionTeams.length > 0 ? (
        <FormControl size="small" fullWidth>
          <Select
            value={teams[i] ?? ""}
            onChange={e => setTeam(i, e.target.value)}
            displayEmpty
            sx={{ fontSize: "0.8rem" }}
            renderValue={v => v || <em style={{ color: "#bbb" }}>{placeholder}</em>}
          >
            <MenuItem value="" disabled sx={{ display: "none" }} />
            {divisionTeams.map(name => (
              <MenuItem key={name} value={name} sx={{ fontSize: "0.8rem" }}>{name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <TextField size="small" fullWidth value={teams[i] ?? ""} placeholder={placeholder}
          onChange={e => setTeam(i, e.target.value)}
          sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" } }} />
      )}
      {eventType === "GAME" && teams.length > 2 && (
        <IconButton size="small" onClick={() => removeTeam(i)}
          sx={{ color: "#bbb", "&:hover": { color: "#ef5350" } }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  )

  return (
    <Box>
      {/* ── Page header ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#00838f", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Schedule Generator</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "0.85rem !important" }} />}
            label="Automate"
            size="small"
            clickable
            onClick={() => { setMode("automate"); setAutoStep(0); setAutoOpen(true) }}
            sx={{
              fontWeight: 700, fontSize: "0.75rem",
              bgcolor: mode === "automate" ? "#7c3aed" : "#f3f0ff",
              color: mode === "automate" ? "#fff" : "#7c3aed",
              "& .MuiChip-icon": { color: mode === "automate" ? "#fff" : "#7c3aed" },
              "&:hover": { bgcolor: mode === "automate" ? "#6d28d9" : "#ede9fe" },
            }}
          />
          <Chip
            icon={<TuneIcon sx={{ fontSize: "0.85rem !important" }} />}
            label="Custom"
            size="small"
            clickable
            onClick={() => setMode("custom")}
            sx={{
              fontWeight: 700, fontSize: "0.75rem",
              bgcolor: mode === "custom" ? "#00838f" : "#e0f7fa",
              color: mode === "custom" ? "#fff" : "#006064",
              "& .MuiChip-icon": { color: mode === "custom" ? "#fff" : "#006064" },
              "&:hover": { bgcolor: mode === "custom" ? "#006064" : "#b2ebf2" },
            }}
          />
        </Box>
      </Box>

      {/* ── Automate Stepper Dialog ── */}
      {(() => {
        // Dynamic steps based on event type
        const steps = autoEventType === "GAME"
          ? ["Setup", "Other Leagues", "Dates & Days", "Start Times", "Location & Fields"]
          : ["Setup", "Dates & Days", "Start Times", "Location & Fields"]

        // Map autoStep + eventType → semantic key
        const stepKey = (): "setup" | "other_leagues" | "dates" | "times" | "location" => {
          if (autoStep === 0) return "setup"
          return autoEventType === "GAME"
            ? (["other_leagues", "dates", "times", "location"] as const)[autoStep - 1]
            : (["dates", "times", "location"] as const)[autoStep - 1]
        }

        const selectedDiv = divisions.find(d => d.id === divisionId)
        const subTitle = selectedDiv
          ? `${sport === "baseball" ? "Baseball" : "Softball"} · ${selectedDiv.name}`
          : null

        return (
          <Dialog open={autoOpen} onClose={() => setAutoOpen(false)} fullWidth maxWidth="sm"
            PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
                <AutoAwesomeIcon sx={{ color: "#7c3aed", fontSize: "1.2rem" }} />
                {subTitle ? `Automate ${subTitle} Schedule` : "Automate Schedule"}
              </Box>
              {subTitle && (
                <Typography sx={{ fontSize: "0.78rem", color: "#aaa", mt: 0.25, fontWeight: 400 }}>
                  {autoEventType === "GAME" ? "Game schedule" : "Practice schedule"}
                  {autoGamesPerTeam ? ` · ${autoGamesPerTeam} ${autoEventType === "GAME" ? "games" : "practices"} per team` : ""}
                </Typography>
              )}
            </DialogTitle>

            <Stepper activeStep={autoStep} sx={{ px: 3, pb: 2 }} alternativeLabel>
              {steps.map(label => (
                <Step key={label}>
                  <StepLabel sx={{ "& .MuiStepLabel-label": { fontSize: "0.72rem" } }}>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider />

            <DialogContent sx={{ pt: 3, minHeight: 300 }}>

              {/* ── Step: Setup ── */}
              {stepKey() === "setup" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 0.75 }}>Sport</Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {(["baseball", "softball"] as Sport[]).map(s => (
                        <Button key={s} size="small" variant={sport === s ? "contained" : "outlined"}
                          onClick={() => { setSport(s); setDivisionId(""); setGames([]) }}
                          sx={{
                            flex: 1, textTransform: "capitalize", fontWeight: sport === s ? 700 : 400, fontSize: "0.85rem",
                            ...(sport === s
                              ? { bgcolor: "#00838f", "&:hover": { bgcolor: "#006064" }, color: "#fff", borderColor: "#00838f" }
                              : { color: "#555", borderColor: "#ccc" }),
                          }}>
                          {s === "baseball" ? "⚾ Baseball" : "🥎 Softball"}
                        </Button>
                      ))}
                    </Box>
                  </Box>

                  <FormControl fullWidth disabled={!sport}>
                    <InputLabel>Division</InputLabel>
                    <Select value={divisionId} label="Division"
                      onChange={e => setDivisionId(e.target.value as number | "")}
                      MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}>
                      {divMenuItems}
                    </Select>
                  </FormControl>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 0.75 }}>Event Type</Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {(["GAME", "PRACTICE"] as const).map(et => (
                        <Button key={et} size="small"
                          variant={autoEventType === et ? "contained" : "outlined"}
                          onClick={() => { setAutoEventType(et); setAutoStep(0) }}
                          sx={{
                            flex: 1, fontWeight: autoEventType === et ? 700 : 400, fontSize: "0.85rem",
                            ...(autoEventType === et
                              ? { bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" }, color: "#fff", borderColor: "#7c3aed" }
                              : { color: "#555", borderColor: "#ccc" }),
                          }}>
                          {et === "GAME" ? "🏟 Game" : "🏋 Practice"}
                        </Button>
                      ))}
                    </Box>
                  </Box>

                  <TextField
                    label={autoEventType === "GAME" ? "Games per Team" : "Practices to Schedule"}
                    type="number" fullWidth
                    value={autoGamesPerTeam} onChange={e => setAutoGamesPerTeam(e.target.value)}
                    inputProps={{ min: 1 }}
                    helperText={autoEventType === "GAME"
                      ? "Each team will play this many games total"
                      : "Total number of practice rounds to generate"} />

                  {autoEventType === "PRACTICE" && (
                    <TextField
                      label="Teams per Day"
                      type="number" fullWidth
                      value={autoTeamsPerDay} onChange={e => setAutoTeamsPerDay(e.target.value)}
                      inputProps={{ min: 1 }}
                      helperText="How many teams share each day (stacked back-to-back). E.g. 4 = all 4 teams on one day, consecutive slots." />
                  )}
                </Box>
              )}

              {/* ── Step: Other Leagues (GAME only) ── */}
              {stepKey() === "other_leagues" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Typography sx={{ fontSize: "0.82rem", color: "#555" }}>
                    Add teams from other leagues to include in the schedule.
                    For example: ECLL (2 teams), BRHLL (5 teams).
                  </Typography>

                  {autoOtherLeagues.map((lg, li) => (
                    <Paper key={li} elevation={0}
                      sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, p: 1.5 }}>
                      <Box sx={{ display: "flex", gap: 1, mb: 1, alignItems: "center" }}>
                        <TextField size="small" label="League Name" value={lg.name}
                          onChange={e => setAutoOtherLeagues(prev => prev.map((x, i) =>
                            i === li ? { ...x, name: e.target.value } : x))}
                          sx={{ flex: 1 }} />
                        <IconButton size="small"
                          onClick={() => setAutoOtherLeagues(prev => prev.filter((_, i) => i !== li))}
                          sx={{ color: "#bbb", "&:hover": { color: "#ef5350" } }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, pl: 1 }}>
                        {lg.teams.map((tn, ti) => (
                          <Box key={ti} sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                            <TextField size="small" value={tn} placeholder={`Team ${ti + 1}`}
                              onChange={e => setAutoOtherLeagues(prev => prev.map((x, i) =>
                                i === li ? { ...x, teams: x.teams.map((t, j) => j === ti ? e.target.value : t) } : x))}
                              sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.8rem" } }} />
                            {lg.teams.length > 1 && (
                              <IconButton size="small"
                                onClick={() => setAutoOtherLeagues(prev => prev.map((x, i) =>
                                  i === li ? { ...x, teams: x.teams.filter((_, j) => j !== ti) } : x))}
                                sx={{ color: "#bbb", "&:hover": { color: "#ef5350" } }}>
                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                        <Button size="small" startIcon={<AddIcon />}
                          onClick={() => setAutoOtherLeagues(prev => prev.map((x, i) =>
                            i === li ? { ...x, teams: [...x.teams, ""] } : x))}
                          sx={{ alignSelf: "flex-start", fontSize: "0.72rem", color: "#555" }}>
                          Add Team
                        </Button>
                      </Box>
                    </Paper>
                  ))}

                  <Button startIcon={<AddIcon />} variant="outlined" size="small"
                    onClick={() => setAutoOtherLeagues(prev => [...prev, { name: "", teams: [""] }])}
                    sx={{ alignSelf: "flex-start", borderColor: "#7c3aed", color: "#7c3aed",
                      "&:hover": { borderColor: "#6d28d9", bgcolor: "#f3f0ff" } }}>
                    Add League
                  </Button>

                  {autoOtherLeagues.length === 0 && (
                    <Typography sx={{ fontSize: "0.78rem", color: "#aaa", fontStyle: "italic" }}>
                      No other leagues added — division teams only. Click Next to continue.
                    </Typography>
                  )}
                </Box>
              )}

              {/* ── Step: Dates & Days ── */}
              {stepKey() === "dates" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <TextField label="Season Start Date" type="date" fullWidth
                    value={autoStartDate} onChange={e => setAutoStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }} />
                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 1 }}>
                      {autoEventType === "GAME" ? "Game Days" : "Practice Days"}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {WEEKDAYS.map(d => (
                        <Chip key={d.value} label={d.label} clickable
                          onClick={() => setAutoGameDays(prev =>
                            prev.includes(d.value) ? prev.filter(x => x !== d.value) : [...prev, d.value].sort()
                          )}
                          sx={{
                            fontWeight: 600,
                            bgcolor: autoGameDays.includes(d.value) ? "#00838f" : "#f0f0f0",
                            color: autoGameDays.includes(d.value) ? "#fff" : "#555",
                            "&:hover": { bgcolor: autoGameDays.includes(d.value) ? "#006064" : "#e0e0e0" },
                          }} />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ── Step: Start Times ── */}
              {stepKey() === "times" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {autoGameDays.some(d => d < 5) && (
                    <Box>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 1 }}>
                        Weeknight Start Time (Mon – Fri)
                      </Typography>
                      <TextField size="small" value={autoWeeknightTime} placeholder="18:00"
                        onChange={e => setAutoWeeknightTime(e.target.value)} sx={{ width: 130 }} />
                    </Box>
                  )}
                  {autoGameDays.some(d => d >= 5) && (
                    <Box>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 0.5 }}>
                        Weekend Time Slots (9 am – 2 pm)
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "#aaa", mb: 1 }}>
                        Select all start times to use on Saturdays / Sundays
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {WEEKEND_TIMES.map(t => {
                          const [h, m] = t.split(":").map(Number)
                          const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`
                          const selected = autoWeekendTimes.includes(t)
                          return (
                            <Chip key={t} label={label} clickable size="small"
                              onClick={() => setAutoWeekendTimes(prev =>
                                prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort()
                              )}
                              sx={{
                                fontWeight: 600, fontSize: "0.78rem",
                                bgcolor: selected ? "#00838f" : "#f0f0f0",
                                color: selected ? "#fff" : "#555",
                                "&:hover": { bgcolor: selected ? "#006064" : "#e0e0e0" },
                              }} />
                          )
                        })}
                      </Box>
                    </Box>
                  )}
                  {!autoGameDays.length && (
                    <Alert severity="info">Go back and select at least one day.</Alert>
                  )}
                </Box>
              )}

              {/* ── Step: Location & Fields ── */}
              {stepKey() === "location" && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  <Autocomplete freeSolo options={LOCATION_OPTIONS} value={autoLocation}
                    onChange={(_, v) => setAutoLocation(v ?? "WT")} onInputChange={(_, v) => setAutoLocation(v)}
                    renderInput={(params) => <TextField {...params} label="Location"
                      helperText="Default location for all events" />} />
                  <Autocomplete freeSolo options={FIELD_OPTIONS} value={autoField}
                    onChange={(_, v) => setAutoField(v ?? "")} onInputChange={(_, v) => setAutoField(v)}
                    renderInput={(params) => <TextField {...params} label="Field"
                      helperText={autoField ? "" : "Auto-detected from division if left blank"} />} />
                </Box>
              )}

            </DialogContent>

            <Divider />
            <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
              <Button onClick={() => setAutoOpen(false)} color="inherit" sx={{ color: "#888" }}>Cancel</Button>
              <Box sx={{ display: "flex", gap: 1 }}>
                {autoStep > 0 && (
                  <Button variant="outlined" onClick={() => setAutoStep(s => s - 1)}>Back</Button>
                )}
                {autoStep < steps.length - 1 ? (
                  <Button variant="contained" onClick={() => setAutoStep(s => s + 1)}
                    disabled={autoStep === 0 && (!divisionId || !autoGamesPerTeam)}
                    sx={{ bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" } }}>
                    Next
                  </Button>
                ) : (
                  <Button variant="contained" onClick={runAutomate} disabled={generating}
                    startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                    sx={{ bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" }, fontWeight: 700 }}>
                    {generating ? "Generating…" : "Generate Schedule"}
                  </Button>
                )}
              </Box>
            </DialogActions>
          </Dialog>
        )
      })()}

      {/* ── Configuration card ── */}
      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2.5 }}>

        {/* Row 1: Title · Sport · Division · Event Type · Generate */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2, alignItems: "flex-end" }}>
          <TextField label="Schedule Title" size="small" value={title}
            onChange={e => setTitle(e.target.value)} sx={{ width: 220 }} />

          <Box>
            <Typography sx={{ fontSize: "0.72rem", color: "#888", mb: 0.5 }}>Sport</Typography>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              {(["baseball", "softball"] as Sport[]).map(s => (
                <Button key={s} size="small" variant={sport === s ? "contained" : "outlined"}
                  onClick={() => { setSport(s); setDivisionId(""); setGames([]) }}
                  sx={{
                    textTransform: "capitalize", fontWeight: sport === s ? 700 : 400, fontSize: "0.8rem",
                    minWidth: 100,
                    ...(sport === s
                      ? { bgcolor: "#00838f", "&:hover": { bgcolor: "#006064" }, color: "#fff", borderColor: "#00838f" }
                      : { color: "#555", borderColor: "#ccc" }),
                  }}>
                  {s === "baseball" ? "⚾ Baseball" : "🥎 Softball"}
                </Button>
              ))}
            </Box>
          </Box>

          <FormControl size="small" sx={{ minWidth: 200 }} disabled={!sport}>
            <InputLabel>Division</InputLabel>
            <Select value={divisionId} label="Division"
              onChange={e => setDivisionId(e.target.value as number | "")}
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}>
              {divMenuItems}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Event Type</InputLabel>
            <Select value={eventType} label="Event Type"
              onChange={e => setEventType(e.target.value as EventType)}>
              <MenuItem value="GAME">Game</MenuItem>
              <MenuItem value="PRACTICE">Practice</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ ml: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.75 }}>
            <Button variant="contained" onClick={generate} disabled={generating}
              startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <EventNoteIcon />}
              sx={{ bgcolor: "#00838f", "&:hover": { bgcolor: "#006064" }, fontWeight: 700, px: 3, whiteSpace: "nowrap" }}>
              {generating ? "Generating…" : genLabel}
            </Button>
            {genError && <Alert severity="error" sx={{ fontSize: "0.78rem", py: 0.5 }}>{genError}</Alert>}
          </Box>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {/* Row 2: Teams · Date Settings · Location — stretched full width */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 4, alignItems: "flex-start" }}>

          {/* Teams column */}
          <Box>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 1.5 }}>Teams</Typography>
            {eventType === "GAME" ? (
              <>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}>
                  {teams.map((_, i) => (
                    <Box key={i}>{teamSelect(i, i === 0 ? "Away Team" : i === 1 ? "Home Team" : `Team ${i + 1}`)}</Box>
                  ))}
                </Box>
                <Button size="small" startIcon={<AddIcon />} onClick={addTeam}
                  sx={{ fontSize: "0.75rem", color: "#555" }}>
                  Add Team
                </Button>
              </>
            ) : (
              teamSelect(0, "Add Team")
            )}
          </Box>

          {/* Date settings column — double width */}
          <Box>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 1.5 }}>
              Date Settings <Box component="span" sx={{ fontWeight: 400, color: "#aaa" }}>(optional)</Box>
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
              <TextField label="Start Date" size="small" type="date"
                value={startDate} onChange={e => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }} fullWidth />
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <TextField label="Duration (hrs)" size="small" type="number" fullWidth
                  value={durationHours} onChange={e => setDurationHours(e.target.value)}
                  inputProps={{ min: 0.5, step: 0.5 }} />
                <TextField label={eventType === "GAME" ? "Rounds" : "Sessions"} size="small" type="number" fullWidth
                  value={rounds} onChange={e => setRounds(e.target.value)}
                  inputProps={{ min: 1 }} />
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: "#888", mb: 0.75 }}>Game Days</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {WEEKDAYS.map(d => (
                    <Chip key={d.value} label={d.label} size="small" clickable
                      onClick={() => toggleDay(d.value)}
                      sx={{
                        fontSize: "0.72rem", height: 24,
                        bgcolor: gameDays.includes(d.value) ? "#00838f" : "#f0f0f0",
                        color: gameDays.includes(d.value) ? "#fff" : "#555",
                        "&:hover": { bgcolor: gameDays.includes(d.value) ? "#006064" : "#e0e0e0" },
                      }} />
                  ))}
                </Box>
              </Box>
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: "#888", mb: 0.75 }}>Start Times</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                  {timeSlots.map((s, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 0.25, alignItems: "center" }}>
                      <TextField size="small" value={s} placeholder="18:00"
                        onChange={e => setSlot(i, e.target.value)}
                        sx={{ width: 86, "& .MuiInputBase-input": { fontSize: "0.8rem" } }} />
                      {timeSlots.length > 1 && (
                        <IconButton size="small" onClick={() => removeSlot(i)} sx={{ color: "#bbb" }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={addSlot}
                    sx={{ fontSize: "0.72rem", color: "#555" }}>
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Location column */}
          <Box>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", mb: 1.5 }}>Location</Typography>
            <Autocomplete freeSolo options={LOCATION_OPTIONS} value={location}
              onChange={(_, v) => setLocation(v ?? "")} onInputChange={(_, v) => setLocation(v)}
              size="small"
              renderInput={(params) => <TextField {...params} label="Location" size="small" />}
              sx={{ mb: 2 }} />
            <Autocomplete freeSolo options={FIELD_OPTIONS} value={field}
              onChange={(_, v) => setField(v ?? "")} onInputChange={(_, v) => setField(v)}
              size="small"
              renderInput={(params) => <TextField {...params} label="Field" size="small" />} />
          </Box>
        </Box>
      </Paper>

      {/* ── Generated schedule ── */}
      {games.length === 0 ? (
        <Paper elevation={0} sx={{
          border: "1px dashed #ddd", borderRadius: 2, p: 5,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, color: "#aaa",
        }}>
          <SportsSoccerIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ fontSize: "0.9rem" }}>
            Configure above and click <strong>{genLabel}</strong> to generate.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Stats + actions bar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
            <Chip label={`${totalRounds} rounds`} size="small"
              sx={{ bgcolor: "#e0f7fa", color: "#006064", fontWeight: 700 }} />
            {isGameType ? (
              <Chip label={`${nonLabelCount} games`} size="small"
                sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }} />
            ) : (
              <Chip label={`${games.length} events`} size="small"
                sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }} />
            )}
            {byeCount > 0 && (
              <Chip label={`${byeCount} byes`} size="small"
                sx={{ bgcolor: "#f5f5f5", color: "#888", fontWeight: 700 }} />
            )}
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" color="inherit" startIcon={<RefreshIcon />}
              onClick={generate} disabled={generating} sx={{ fontSize: "0.75rem" }}>
              Regenerate
            </Button>
            <Button size="small" variant="contained" startIcon={
              exporting ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
              onClick={exportXlsx} disabled={exporting}
              sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" }, fontWeight: 700 }}>
              {exporting ? "Exporting…" : "Export xlsx"}
            </Button>
          </Box>

          <Typography sx={{ fontSize: "0.7rem", color: "#aaa", mb: 1 }}>
            Click any cell to edit inline. Team columns are dropdowns for quick reassignment.
          </Typography>

          {/* WTLL Teams Summary */}
          {wtllTeamStats.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#555", mb: 0.75, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                WTLL Teams
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {wtllTeamStats.map(s => (
                  <Box key={s.name} sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    bgcolor: "#f0f4ff", border: "1px solid #c5cae9",
                    borderRadius: 1.5, px: 1.25, py: 0.5,
                  }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a237e" }}>{s.name}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Chip label={`${s.total}G`} size="small"
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#1F497D", color: "#fff" }} />
                      <Chip label={`${s.home}H`} size="small"
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#00838f", color: "#fff" }} />
                      <Chip label={`${s.total - s.home}A`} size="small"
                        sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#6a1b9a", color: "#fff" }} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Table — columns differ for game vs practice */}
          {(() => {
            const practiceGrid = "6px 44px 52px 2fr 100px 78px 78px 110px 110px 36px"
            const gameGrid     = "6px 44px 52px 1fr 1fr 100px 78px 78px 110px 110px 36px"
            const gridCols = isGameType ? gameGrid : practiceGrid
            const gameHeaders = ["", "#", "Round", "Away Team", "Home Team", "Date", "Start", "End", "Location", "Field", ""]
            const practiceHeaders = ["", "#", "Round", "Team", "Date", "Start", "End", "Location", "Field", ""]
            const headers = isGameType ? gameHeaders : practiceHeaders

            return (
              <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: gridCols, bgcolor: "#1F497D", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}>
                  {headers.map((h, i) => (
                    <Box key={i} sx={{ px: i > 0 ? 1 : 0, py: 0.75, textAlign: i > 0 && i < (isGameType ? 6 : 5) ? "center" : "left" }}>{h}</Box>
                  ))}
                </Box>
                <Box sx={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
                  {games.map((g, idx) => {
                    const isBye = g.away_team === "Bye"
                    const isLabel = isBye || (!isGameType && ["Practice", "Other"].includes(g.away_team))
                    const isRoundStart = idx === 0 || games[idx - 1].round !== g.round
                    const conflict = conflicts[idx]
                    const conflictColor = conflict?.level === "red" ? "#ef5350"
                      : conflict?.level === "purple" ? "#9c27b0"
                      : conflict?.level === "pink" ? "#e91e63"
                      : "transparent"
                    return (
                      <Box key={idx} sx={{
                        display: "grid",
                        gridTemplateColumns: gridCols,
                        borderTop: isRoundStart && idx !== 0 ? "2px solid #e8eaf6" : "1px solid #f0f0f0",
                        bgcolor: isBye ? "#fafafa" : idx % 2 === 0 ? "#fff" : "#fafbff",
                        "&:hover": { bgcolor: isBye ? "#f5f5f5" : "#f0f4ff" },
                        transition: "background 0.1s",
                        alignItems: "center",
                      }}>
                        {/* Conflict indicator bar */}
                        <Tooltip title={conflict?.message ?? ""} placement="right" arrow>
                          <Box sx={{
                            alignSelf: "stretch",
                            bgcolor: conflictColor,
                            cursor: conflict ? "help" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {conflict && (
                              <WarningAmberIcon sx={{ fontSize: 11, color: "#fff", opacity: 0.9 }} />
                            )}
                          </Box>
                        </Tooltip>
                        <Box sx={{ textAlign: "center", fontSize: "0.72rem", color: "#999", px: 0.5 }}>{g.order}</Box>
                        <Box sx={{ textAlign: "center" }}>
                          {isRoundStart && (
                            <Chip label={g.round} size="small"
                              sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, bgcolor: "#e8eaf6", color: "#3949ab" }} />
                          )}
                        </Box>
                        {/* Game rows: Away + Home columns; Practice rows: single Team column */}
                        {isGameType ? (
                          <>
                            <TeamSelectCell value={g.away_team} allTeams={scheduleTeams} disabled={isLabel}
                              onChange={v => updateGame(idx, "away_team", v)} />
                            <TeamSelectCell value={g.home_team} allTeams={scheduleTeams} disabled={isBye}
                              onChange={v => updateGame(idx, "home_team", v)} />
                          </>
                        ) : (
                          // Practice: show home_team as the "Team" column
                          <TeamSelectCell value={g.home_team} allTeams={scheduleTeams} disabled={isBye}
                            onChange={v => updateGame(idx, "home_team", v)} />
                        )}
                        <EditCell value={g.date || ""} center placeholder="MM/DD/YYYY" disabled={isBye} onChange={v => updateGame(idx, "date", v)} />
                        <EditCell value={g.start_time || ""} center placeholder="HH:MM" disabled={isBye} onChange={v => updateGame(idx, "start_time", v)} />
                        <EditCell value={g.end_time || ""} center placeholder="HH:MM" disabled={isBye} onChange={v => updateGame(idx, "end_time", v)} />
                        <EditCell value={g.location || ""} disabled={isBye} onChange={v => updateGame(idx, "location", v)} />
                        <EditCell value={g.field || ""} disabled={isBye} onChange={v => updateGame(idx, "field", v)} />
                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                          <Tooltip title="Remove row">
                            <IconButton size="small" onClick={() => deleteGame(idx)}
                              sx={{ color: "#ddd", "&:hover": { color: "#ef5350" } }}>
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Paper>
            )
          })()}

          {/* Conflict legend — shown only when conflicts exist */}
          {Object.keys(conflicts).length > 0 && (
            <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
              {[
                { color: "#ef5350", label: "Head coach double-booked (overlapping games)" },
                { color: "#9c27b0", label: "Assistant coach double-booked (overlapping games)" },
                { color: "#e91e63", label: "Coach is also a board member" },
              ].map(({ color, label }) => (
                <Box key={color} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                  <Typography sx={{ fontSize: "0.72rem", color: "#777" }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
