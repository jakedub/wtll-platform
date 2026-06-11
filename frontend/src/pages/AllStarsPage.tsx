import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import StarIcon from "@mui/icons-material/Star"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import EditIcon from "@mui/icons-material/Edit"
import DownloadIcon from "@mui/icons-material/Download"
import {
  getAllStarSelections,
  getAllStarSummary,
  createAllStarSelection,
  updateAllStarSelection,
  deleteAllStarSelection,
  getAllStarFormURL,
} from "../api/allstars"
import { getPlayers } from "../api/players"
import { getDivisions } from "../api/divisions"
import type { AllStarSelection, AllStarSummary } from "../models/allstar"
import type { Player } from "../models/player"
import type { Division } from "../api/divisions"

const RED = "#C41230"

// ── Local recompute — mirrors backend AllStarSelection computed properties ────
// Keeps paperwork_complete, docs_complete, docs_required in sync with checkbox
// changes without waiting for a server round-trip.
function recomputeDocFields(s: AllStarSelection): Pick<AllStarSelection, "paperwork_complete" | "docs_complete" | "docs_required"> {
  const base =
    !!s.doc_tournament_verification &&
    !!s.doc_team_affidavit &&
    !!s.doc_uniforms_ordered &&
    !!s.doc_ll_patches
  const paperwork_complete = s.is_returning
    ? base
    : base && !!s.doc_drivers_license && !!s.doc_birth_certificate && !!s.doc_residency_proof
  const docs_required = s.is_returning ? 4 : 7
  const docs_complete = [
    s.doc_tournament_verification,
    s.doc_team_affidavit,
    s.doc_uniforms_ordered,
    s.doc_ll_patches,
    ...(!s.is_returning ? [s.doc_drivers_license, s.doc_birth_certificate, s.doc_residency_proof] : []),
  ].filter(Boolean).length
  return { paperwork_complete, docs_complete, docs_required }
}

// ── Doc checklist definition ─────────────────────────────────────────────────

const ALL_DOCS: {
  key: keyof AllStarSelection
  label: string
  note: string
  returningOnly: false
  newOnly: boolean
}[] = [
  { key: "doc_tournament_verification", label: "Tournament Verification Form",       note: "Required for all players",                                               returningOnly: false, newOnly: false },
  { key: "doc_team_affidavit",           label: "Player Added to Affidavit",          note: "Tournament Team Affidavit — one per team, completed by league",          returningOnly: false, newOnly: false },
  { key: "doc_uniforms_ordered",         label: "Uniforms Ordered",                   note: "Required for all players",                                               returningOnly: false, newOnly: false },
  { key: "doc_ll_patches",               label: "Little League Patches",              note: "Required for all players",                                               returningOnly: false, newOnly: false },
  { key: "doc_drivers_license",          label: "Parent/Guardian Driver's License",   note: "Copy required — new players only",                                       returningOnly: false, newOnly: true  },
  { key: "doc_birth_certificate",        label: "Hardcopy Birth Certificate",         note: "New players only",                                                       returningOnly: false, newOnly: true  },
  { key: "doc_residency_proof",          label: "Proof of Residency",                 note: "School enrollment form OR utility bill — new players only",              returningOnly: false, newOnly: true  },
]

// ── Summary stat cards ────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon?: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2, flex: 1, minWidth: 110 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        {icon && <Box sx={{ color, display: "flex" }}>{icon}</Box>}
        <Typography sx={{ fontSize: "0.72rem", color: "#888", fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color }}>{value}</Typography>
    </Paper>
  )
}

// ── Paperwork progress bar ────────────────────────────────────────────────────

function DocProgress({ selection }: { selection: AllStarSelection }) {
  const pct = selection.docs_required > 0
    ? Math.round((selection.docs_complete / selection.docs_required) * 100)
    : 0
  const color = pct === 100 ? "#2e7d32" : pct > 0 ? "#ed6c02" : "#bbb"

  return (
    <Box sx={{ minWidth: 80 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
        <Typography sx={{ fontSize: "0.7rem", color: "#888" }}>{selection.docs_complete}/{selection.docs_required}</Typography>
        {pct === 100
          ? <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32" }} />
          : <WarningAmberIcon sx={{ fontSize: 14, color: "#ed6c02" }} />}
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{ height: 5, borderRadius: 3, bgcolor: "#f0f0f0", "& .MuiLinearProgress-bar": { bgcolor: color } }}
      />
    </Box>
  )
}

// ── Inline doc toggle row ─────────────────────────────────────────────────────

function DocCheckRow({
  docKey,
  label,
  note,
  checked,
  disabled,
  onChange,
}: {
  docKey: string
  label: string
  note: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        py: 0.5,
        opacity: disabled ? 0.35 : 1,
        borderBottom: "1px solid #f4f4f5",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Checkbox
        size="small"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        sx={{ p: 0.25, color: "#ccc", "&.Mui-checked": { color: "#2e7d32" }, mt: 0.1 }}
      />
      <Box>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: checked ? 500 : 400, textDecoration: checked ? "line-through" : "none", color: checked ? "#888" : "#111" }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "#aaa" }}>{note}</Typography>
      </Box>
    </Box>
  )
}

// ── Player card (expanded row) ────────────────────────────────────────────────

function PlayerCard({
  selection,
  onUpdate,
  onDelete,
}: {
  selection: AllStarSelection
  onUpdate: (id: number, patch: Partial<AllStarSelection>) => void
  onDelete: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const handleDoc = (key: keyof AllStarSelection, val: boolean) => {
    onUpdate(selection.id, { [key]: val } as Partial<AllStarSelection>)
  }

  const requiresResidency = !selection.is_returning

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          cursor: "pointer",
          "&:hover": { bgcolor: "#fafafa" },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Completion indicator */}
        {selection.paperwork_complete
          ? <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 18, flexShrink: 0 }} />
          : <WarningAmberIcon sx={{ color: "#ed6c02", fontSize: 18, flexShrink: 0 }} />}

        {/* Name */}
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>
          {selection.player_last_name}, {selection.player_first_name}
        </Typography>

        {/* Division */}
        {selection.division_name && (
          <Chip label={selection.division_name} size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#f4f4f5" }} />
        )}

        {/* Returning badge */}
        {selection.is_returning
          ? <Chip label="Returning" size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }} />
          : <Chip label="New" size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }} />}

        {/* Progress */}
        <Box sx={{ width: 100 }}>
          <DocProgress selection={selection} />
        </Box>

        {/* Delete */}
        <Tooltip title="Remove from All Stars">
          <Box
            component="span"
            onClick={(e) => { e.stopPropagation(); onDelete(selection.id) }}
            sx={{ color: "#ccc", cursor: "pointer", display: "flex", "&:hover": { color: RED }, ml: 0.5 }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>

      {/* Expanded checklist */}
      {expanded && (
        <Box sx={{ borderTop: "1px solid #f0f0f0", px: 2.5, py: 1.5, bgcolor: "#fafafa" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>

            {/* Left: doc checklist */}
            <Box>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: RED, mb: 1 }}>
                Paperwork Checklist
              </Typography>
              {selection.is_returning ? (
                /* Returning players: ONLY affidavit item */
                <DocCheckRow
                  key="doc_team_affidavit"
                  docKey="doc_team_affidavit"
                  label="Player Added to Affidavit"
                  note="Tournament Team Affidavit — one per team, completed by league"
                  checked={!!selection.doc_team_affidavit}
                  disabled={false}
                  onChange={(val) => handleDoc("doc_team_affidavit", val)}
                />
              ) : (
                /* New players: full checklist */
                <>
                  {ALL_DOCS.map(({ key, label, note }) => (
                    <DocCheckRow
                      key={key}
                      docKey={key}
                      label={label}
                      note={note}
                      checked={!!selection[key]}
                      disabled={false}
                      onChange={(val) => handleDoc(key, val)}
                    />
                  ))}

                  {/* Residency type selector */}
                  {selection.doc_residency_proof && (
                    <Box sx={{ mt: 1.5, pl: 1 }}>
                      <FormLabel sx={{ fontSize: "0.75rem", color: "#555" }}>Residency document type:</FormLabel>
                      <RadioGroup
                        row
                        value={selection.residency_type || ""}
                        onChange={(e) => onUpdate(selection.id, { residency_type: e.target.value as "SCHOOL" | "UTILITY" })}
                        sx={{ mt: 0.25 }}
                      >
                        <FormControlLabel value="SCHOOL" control={<Radio size="small" />} label={<Typography sx={{ fontSize: "0.8rem" }}>School Enrollment Form</Typography>} />
                        <FormControlLabel value="UTILITY" control={<Radio size="small" />} label={<Typography sx={{ fontSize: "0.8rem" }}>Utility Bill</Typography>} />
                      </RadioGroup>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Right: player info + notes */}
            <Box>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", mb: 1 }}>
                Player Info
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
                {[
                  ["DOB", selection.player_dob ?? "—"],
                  ["School", selection.player_school || "—"],
                  ["Eligible", selection.player_is_eligible ? "✅ Yes" : "❌ No"],
                  ["Returning", selection.is_returning ? "Yes — reduced docs" : "No — full docs required"],
                ].map(([label, val]) => (
                  <Box key={label} sx={{ display: "flex", gap: 1 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, minWidth: 70 }}>{label}:</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "#555" }}>{val}</Typography>
                  </Box>
                ))}
              </Box>

              <TextField
                label="Notes"
                multiline
                rows={2}
                size="small"
                fullWidth
                value={selection.notes}
                placeholder="e.g. birth cert pending, address mismatch resolved..."
                onChange={(e) => onUpdate(selection.id, { notes: e.target.value })}
                onBlur={(e) => onUpdate(selection.id, { notes: e.target.value })}
              />

              {/* Form downloads — only for new players */}
              {!selection.is_returning && (
                <Box sx={{ mt: 2 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", mb: 1 }}>
                    Pre-filled Forms
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      size="small" variant="outlined" component="a"
                      href={getAllStarFormURL(selection.id, "tvf")} download
                      startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                      sx={{ fontSize: "0.75rem", borderColor: RED, color: RED, "&:hover": { borderColor: RED, bgcolor: `${RED}08` } }}
                    >
                      Tournament Verification Form
                    </Button>
                    {selection.residency_type !== "UTILITY" && (() => {
                      const isSoftball = selection.player_sport?.toLowerCase() === "softball"
                      return isSoftball ? (
                        <Button size="small" variant="outlined" component="a"
                          href={getAllStarFormURL(selection.id, "enrollment-softball")} download
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          sx={{ fontSize: "0.75rem", borderColor: "#d97706", color: "#d97706", "&:hover": { borderColor: "#d97706", bgcolor: "#d9770608" } }}>
                          Softball School Enrollment Form
                        </Button>
                      ) : (
                        <Button size="small" variant="outlined" component="a"
                          href={getAllStarFormURL(selection.id, "enrollment")} download
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          sx={{ fontSize: "0.75rem", borderColor: "#1565c0", color: "#1565c0", "&:hover": { borderColor: "#1565c0", bgcolor: "#1565c008" } }}>
                          Baseball School Enrollment Form
                        </Button>
                      )
                    })()}
                  </Box>
                  {selection.residency_type === "UTILITY" && (
                    <Typography sx={{ fontSize: "0.7rem", color: "#aaa", mt: 0.5 }}>
                      Enrollment form not needed — player is using utility bill for residency.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  )
}

// ── Add player dialog ─────────────────────────────────────────────────────────

function AddPlayerDialog({
  open,
  players,
  divisions,
  year,
  existingPlayerIds,
  onAdd,
  onClose,
}: {
  open: boolean
  players: Player[]
  divisions: Division[]
  year: number
  existingPlayerIds: Set<number>
  onAdd: (data: Partial<AllStarSelection>) => void
  onClose: () => void
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [divisionId, setDivisionId] = useState<number | "">("")
  const [isReturning, setIsReturning] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setSelectedPlayer(null); setDivisionId(""); setIsReturning(false) }
  }, [open])

  // Divisions list is already pre-filtered in load(); this is a safety net
  // in case any edge-case names slip through.
  const EXCLUDED_DIVISIONS = ["field rental", "showcase", "fall ball", "calendar"]
  const filteredDivisions = divisions.filter(
    d => !EXCLUDED_DIVISIONS.some(ex => d.name.toLowerCase().includes(ex))
  )

  // Filter players by selected division (via their enrollment) and exclude already-added
  const eligiblePlayers = players.filter((p) => {
    if (existingPlayerIds.has(p.id)) return false
    if (!divisionId) return false   // require division selection first
    // player's division_name needs to match selected division
    const selectedDiv = filteredDivisions.find(d => d.id === divisionId)
    if (!selectedDiv) return false
    return (p as any).division_name === selectedDiv.name
  })

  const handleAdd = async () => {
    if (!selectedPlayer) return
    setSaving(true)
    try {
      await onAdd({
        player: selectedPlayer.id,
        division: divisionId ? (divisionId as number) : null,
        season_year: year,
        is_returning: isReturning,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Player to All Stars — {year}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* Division first */}
          <FormControl size="small" fullWidth>
            <InputLabel>Division</InputLabel>
            <Select
              value={divisionId}
              label="Division"
              onChange={(e) => { setDivisionId(Number(e.target.value) || ""); setSelectedPlayer(null) }}
            >
              <MenuItem value="">— Select Division First —</MenuItem>
              {filteredDivisions.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Player filtered to selected division */}
          <Autocomplete
            options={divisionId ? eligiblePlayers : []}
            getOptionLabel={(p) => `${p.last_name}, ${p.first_name}`}
            value={selectedPlayer}
            onChange={(_, v) => setSelectedPlayer(v)}
            disabled={!divisionId}
            noOptionsText={
              !divisionId
                ? "Select a division first"
                : eligiblePlayers.length === 0
                ? "No eligible players in this division"
                : "No matches"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Player"
                size="small"
                placeholder={divisionId ? "Search by name…" : "Select a division first"}
              />
            )}
            autoHighlight
          />

          <Box sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, p: 1.5 }}>
            <FormLabel sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#333" }}>Player history:</FormLabel>
            <RadioGroup
              row
              value={isReturning ? "returning" : "new"}
              onChange={(e) => setIsReturning(e.target.value === "returning")}
              sx={{ mt: 0.5 }}
            >
              <FormControlLabel
                value="new"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: "0.82rem" }}>New — full docs required (driver's license, birth cert, residency, verification form)</Typography>}
              />
              <FormControlLabel
                value="returning"
                control={<Radio size="small" />}
                label={<Typography sx={{ fontSize: "0.82rem" }}>Returning — reduced docs (verification form + affidavit only)</Typography>}
              />
            </RadioGroup>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={saving || !selectedPlayer || !divisionId}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Adding…" : "Add to All Stars"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AllStarsPage() {
  const [searchParams] = useSearchParams()
  const sportFilter = searchParams.get('sport') ?? undefined

  const [selections, setSelections] = useState<AllStarSelection[]>([])
  const [summary, setSummary] = useState<AllStarSummary | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [year, setYear] = useState(new Date().getFullYear())
  const [filterDivision, setFilterDivision] = useState<number | "">("")
  const [filterStatus, setFilterStatus] = useState<"" | "complete" | "incomplete">("")
  const [dialogOpen, setDialogOpen] = useState(false)

  // Debounced patch queue — avoids hammering API on checkbox clicks
  const [pendingPatches, setPendingPatches] = useState<Map<number, Partial<AllStarSelection>>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sport = sportFilter || "baseball"
      const params: any = { year, sport }
      if (filterDivision) params.division = filterDivision
      // Note: paperwork_complete filtering is done client-side so checkboxes update instantly
      const [sels, summ, pls, allDivs] = await Promise.all([
        getAllStarSelections(params),
        getAllStarSummary(year),
        getPlayers({ sport } as any),
        getDivisions(),
      ])
      setSelections(sels)
      setSummary(summ)
      setPlayers(pls)
      // Filter divisions to sport, and strip out showcase / calendar-only divisions
      // that should never be used as All Stars assignment divisions.
      const EXCLUDED = ["showcase", "field rental", "fall ball", "teen baseball", "calendar"]
      const sportDivs = allDivs.filter((d: any) => {
        const name = (d.name || "").toLowerCase()
        if (EXCLUDED.some(ex => name.includes(ex))) return false
        return sport === "softball"
          ? name.includes("softball") || name.includes("all star")
          : !name.includes("softball")
      })
      setDivisions(sportDivs)
    } catch {
      setError("Failed to load All Stars data.")
    } finally {
      setLoading(false)
    }
  }, [year, filterDivision, filterStatus, sportFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Optimistic update: apply patch locally (recomputing doc fields instantly), then persist
  const handleUpdate = useCallback(async (id: number, patch: Partial<AllStarSelection>) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const updated = { ...s, ...patch }
        return { ...updated, ...recomputeDocFields(updated) }
      })
    )
    try {
      await updateAllStarSelection(id, patch)
    } catch {
      setError("Save failed — refreshing.")
      await load()
    }
  }, [load])

  const handleAdd = async (data: Partial<AllStarSelection>) => {
    try {
      const created = await createAllStarSelection(data)
      setSelections((prev) => [created, ...prev])
      setDialogOpen(false)
      // Refresh summary
      const summ = await getAllStarSummary(year)
      setSummary(summ)
    } catch (err: any) {
      setError(err?.response?.data?.non_field_errors?.[0] ?? "Failed to add player.")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this player from All Stars?")) return
    try {
      await deleteAllStarSelection(id)
      setSelections((prev) => prev.filter((s) => s.id !== id))
      const summ = await getAllStarSummary(year)
      setSummary(summ)
    } catch {
      setError("Failed to remove player.")
    }
  }

  // Client-side filter by paperwork status — updates instantly on checkbox change
  const visibleSelections = selections.filter(s => {
    if (filterStatus === "complete")   return s.paperwork_complete
    if (filterStatus === "incomplete") return !s.paperwork_complete
    return true
  })

  // Division sort order: Majors > AAA > AA > Softball Majors > Softball Minors > others
  const DIV_ORDER: Record<string, number> = {
    "all stars majors": 0,
    "all stars aaa":    1,
    "all stars aa":     2,
    "all stars softball": 3,
    "majors":           4,
    "aaa":              5,
    "softball majors":  6,
    "softball minors":  7,
  }
  function divSortKey(name: string): number {
    return DIV_ORDER[(name || "").toLowerCase()] ?? 99
  }

  const existingPlayerIds = new Set(selections.map((s) => s.player))
  const years = [year - 1, year, year + 1]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>All Stars</Typography>
          {sportFilter && (
            <Chip label={sportFilter.charAt(0).toUpperCase() + sportFilter.slice(1)} size="small"
              sx={{ bgcolor: "#6a1b9a", color: "#fff", fontWeight: 700 }} />
          )}
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Track selected players and their paperwork completion for district submission.
        </Typography>
      </Box>

      {/* Summary stats */}
      {summary && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <StatCard label="Total Selected" value={summary.total} color="#111" icon={<StarIcon fontSize="small" />} />
          <StatCard label="Paperwork Complete" value={summary.complete} color="#2e7d32" icon={<CheckCircleIcon fontSize="small" />} />
          <StatCard label="Incomplete" value={summary.incomplete} color={summary.incomplete > 0 ? "#ed6c02" : "#bbb"} icon={<WarningAmberIcon fontSize="small" />} />
          {Object.entries(summary.by_division).map(([div, d]) => (
            <StatCard key={div} label={div} value={`${d.complete}/${d.total}`} color={RED} />
          ))}
        </Box>
      )}

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Division</InputLabel>
          <Select value={filterDivision} label="Division" onChange={(e) => setFilterDivision(Number(e.target.value) || "")}>
            <MenuItem value="">All Divisions</MenuItem>
            {divisions.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Paperwork</InputLabel>
          <Select value={filterStatus} label="Paperwork" onChange={(e) => setFilterStatus(e.target.value as any)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="complete">Complete ✅</MenuItem>
            <MenuItem value="incomplete">Incomplete ⚠️</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
        >
          Add Player
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : visibleSelections.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 8, textAlign: "center" }}>
          <StarIcon sx={{ fontSize: 48, color: "#e4e4e7", mb: 1 }} />
          <Typography sx={{ color: "#aaa" }}>No All Stars selected for {year} yet.</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            sx={{ mt: 2, borderColor: RED, color: RED }}
          >
            Add First Player
          </Button>
        </Paper>
      ) : (
        <Box>
          {/* Group by division — sorted by defined division order */}
          {(() => {
            const byDiv: Record<string, AllStarSelection[]> = {}
            for (const s of visibleSelections) {
              const key = s.division_name ?? "No Division"
              if (!byDiv[key]) byDiv[key] = []
              byDiv[key].push(s)
            }
            const sortedDivs = Object.keys(byDiv).sort((a, b) => {
              const da = divSortKey(a), db = divSortKey(b)
              return da !== db ? da - db : a.localeCompare(b)
            })
            return sortedDivs.map(divName => {
              const divSelections = byDiv[divName]
              const affidavitCount = divSelections.filter((s) => s.doc_team_affidavit).length
              const affidavitDone = affidavitCount === divSelections.length && divSelections.length > 0
              return (
                <Box key={divName} sx={{ mb: 3 }}>
                  {/* Division header */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#444" }}>{divName}</Typography>
                    <Chip label={divSelections.length} size="small" sx={{ height: 20, bgcolor: "#f4f4f5", fontSize: "0.72rem", fontWeight: 700 }} />
                    <Box sx={{ flex: 1 }}><Divider /></Box>
                    <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>
                      {divSelections.filter((s) => s.paperwork_complete).length}/{divSelections.length} paperwork complete
                    </Typography>
                  </Box>

                  {/* Tournament Affidavit reminder for this division */}
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 1.5, mb: 1.5,
                    bgcolor: affidavitDone ? "#f1f8f1" : "#fff8f0",
                    border: `1px solid ${affidavitDone ? "#2e7d32" : "#ed6c02"}`,
                    borderRadius: 1.5, px: 2, py: 1,
                  }}>
                    {affidavitDone
                      ? <CheckCircleIcon sx={{ fontSize: 16, color: "#2e7d32", flexShrink: 0 }} />
                      : <WarningAmberIcon sx={{ fontSize: 16, color: "#ed6c02", flexShrink: 0 }} />}
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: affidavitDone ? "#2e7d32" : "#b45309" }}>
                        Tournament Team Affidavit — {divName}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "#777" }}>
                        {affidavitDone
                          ? `All ${divSelections.length} players marked as added to the affidavit.`
                          : `${affidavitCount} of ${divSelections.length} players marked as added. Complete the affidavit and check off each player below.`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: affidavitDone ? "#2e7d32" : "#ed6c02" }}>
                      {affidavitCount}/{divSelections.length}
                    </Typography>
                  </Box>

                  {divSelections.map((sel) => (
                    <PlayerCard
                      key={sel.id}
                      selection={sel}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </Box>
              )
            })
          })()}
        </Box>
      )}

      <AddPlayerDialog
        open={dialogOpen}
        players={players}
        divisions={divisions}
        year={year}
        existingPlayerIds={existingPlayerIds}
        onAdd={handleAdd}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  )
}
