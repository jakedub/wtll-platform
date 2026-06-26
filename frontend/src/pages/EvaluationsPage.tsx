import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import client from "../api/client"
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import DownloadIcon from "@mui/icons-material/Download"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from "@mui/icons-material/Add"
import RefreshIcon from "@mui/icons-material/Refresh"
import TableRowsIcon from "@mui/icons-material/TableRows"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import {
  getEvaluations,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
  importEvaluationCSV,
  getEvaluationExportURL,
} from "../api/evaluations"
import { getPlayers } from "../api/players"
import type { Evaluation, ScoreField } from "../models/evaluation"
import type { Player } from "../models/player"
import SportChip from "../components/SportChip"

// ── Constants ─────────────────────────────────────────────────────────────────

const SCORE_FIELDS: { label: string; field: ScoreField; group: string }[] = [
  { label: "Power", field: "hitting_power", group: "Hitting" },
  { label: "Contact", field: "hitting_contact", group: "Hitting" },
  { label: "Form", field: "hitting_form", group: "Hitting" },
  { label: "Form", field: "fielding_form", group: "Fielding" },
  { label: "Glove", field: "fielding_glove", group: "Fielding" },
  { label: "Hustle", field: "fielding_hustle", group: "Fielding" },
  { label: "Form", field: "throwing_form", group: "Throwing" },
  { label: "Speed", field: "throwing_speed", group: "Throwing" },
  { label: "Accuracy", field: "throwing_accuracy", group: "Throwing" },
  { label: "Speed", field: "pitching_speed", group: "Pitching" },
  { label: "Accuracy", field: "pitching_accuracy", group: "Pitching" },
  { label: "Receiving", field: "catcher_receiving", group: "Catcher" },
  { label: "Blocking", field: "catcher_blocking", group: "Catcher" },
]

// Groups where the whole category can be N/A
const OPTIONAL_GROUPS = new Set(["Pitching", "Catcher"])

const TIER_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: "#1a237e", fg: "#fff" },
  2: { bg: "#1565c0", fg: "#fff" },
  3: { bg: "#2e7d32", fg: "#fff" },
  4: { bg: "#ed6c02", fg: "#fff" },
  5: { bg: "#C41230", fg: "#fff" },
}

const EMPTY_FORM = (): Partial<Evaluation> => ({
  player: undefined,
  season_year: new Date().getFullYear(),
  evaluation_type: "pre",
  hitting_power: null,
  hitting_contact: null,
  hitting_form: null,
  fielding_form: null,
  fielding_glove: null,
  fielding_hustle: null,
  throwing_form: null,
  throwing_speed: null,
  throwing_accuracy: null,
  pitching_speed: null,
  pitching_accuracy: null,
  catcher_receiving: null,
  catcher_blocking: null,
})

// ── Small helpers ──────────────────────────────────────────────────────────────

function TierChip({ tier }: { tier: number | null }) {
  if (!tier) return <Chip label="—" size="small" sx={{ bgcolor: "#f4f4f5", color: "#aaa" }} />
  const { bg, fg } = TIER_COLORS[tier] ?? { bg: "#888", fg: "#fff" }
  return (
    <Chip label={`Tier ${tier}`} size="small" sx={{ bgcolor: bg, color: fg, fontWeight: 700, fontSize: "0.72rem" }} />
  )
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <Typography sx={{ fontSize: "0.8rem", color: "#ccc" }}>—</Typography>
  const colors = ["", "#C41230", "#ed6c02", "#f9a825", "#43a047", "#1b5e20"]
  return <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: colors[value] }}>{value}</Typography>
}

// ── Score input (single digit, 1-5) ───────────────────────────────────────────

function ScoreInput({
  label,
  value,
  disabled,
  onChange,
  onKeyDown,
  inputRef,
}: {
  label: string
  value: number | null
  disabled?: boolean
  onChange: (v: number | null) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <TextField
      inputRef={inputRef}
      label={label}
      type="number"
      size="small"
      sx={{ width: 72 }}
      inputProps={{ min: 1, max: 5, style: { textAlign: "center" } }}
      value={value ?? ""}
      disabled={disabled}
      helperText={disabled ? "N/A" : "1–5"}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === "") { onChange(null); return }
        const n = Math.min(5, Math.max(1, parseInt(raw) || 1))
        onChange(n)
      }}
      onKeyDown={onKeyDown}
    />
  )
}

// ── Single Add/Edit Dialog ─────────────────────────────────────────────────────

function EvalFormDialog({
  open,
  initial,
  players,
  onSave,
  onClose,
  saving,
}: {
  open: boolean
  initial: Partial<Evaluation> | null
  players: Player[]
  onSave: (data: Partial<Evaluation>) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<Partial<Evaluation>>(EMPTY_FORM())
  const [naPitching, setNaPitching] = useState(false)
  const [naCatcher, setNaCatcher] = useState(false)

  useEffect(() => {
    if (!open) return
    const base = initial ? { ...EMPTY_FORM(), ...initial } : EMPTY_FORM()
    setForm(base)
    setNaPitching(!initial?.id && base.pitching_speed == null && base.pitching_accuracy == null)
    setNaCatcher(!initial?.id && base.catcher_receiving == null && base.catcher_blocking == null)
  }, [initial, open])

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }))
  const setScore = (field: ScoreField, raw: string) => {
    const n = raw === "" ? null : Math.min(5, Math.max(1, parseInt(raw) || 1))
    set(field, n)
  }

  const toggleNa = (group: string, isNa: boolean) => {
    if (group === "Pitching") {
      setNaPitching(isNa)
      if (isNa) { set("pitching_speed", null); set("pitching_accuracy", null) }
    } else if (group === "Catcher") {
      setNaCatcher(isNa)
      if (isNa) { set("catcher_receiving", null); set("catcher_blocking", null) }
    }
  }

  const isNa = (group: string) => group === "Pitching" ? naPitching : group === "Catcher" ? naCatcher : false
  const groups = ["Hitting", "Fielding", "Throwing", "Pitching", "Catcher"]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {initial?.id ? "Edit Evaluation" : "Add Evaluation"}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 200 }} size="small" disabled={!!initial?.id}>
            <InputLabel>Player</InputLabel>
            <Select value={form.player ?? ""} label="Player" onChange={(e) => set("player", e.target.value)}>
              {players.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.last_name}, {p.first_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Season Year" type="number" size="small" sx={{ width: 110 }}
            value={form.season_year ?? ""}
            onChange={(e) => set("season_year", parseInt(e.target.value) || new Date().getFullYear())}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select value={form.evaluation_type ?? "pre"} label="Type" onChange={(e) => set("evaluation_type", e.target.value)}>
              <MenuItem value="pre">Pre-Season</MenuItem>
              <MenuItem value="post">Post-Season</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {groups.map((group) => {
          const fields = SCORE_FIELDS.filter((f) => f.group === group)
          const optional = OPTIONAL_GROUPS.has(group)
          const naActive = isNa(group)
          return (
            <Box key={group} sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>
                  {group}
                </Typography>
                {optional && (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={naActive}
                        onChange={(e) => toggleNa(group, e.target.checked)}
                        sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#888" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#bbb" } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: "0.7rem", color: "#999" }}>N/A</Typography>}
                    sx={{ m: 0 }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                {fields.map(({ label, field }) => (
                  <ScoreInput
                    key={field}
                    label={label}
                    value={(form as any)[field] ?? null}
                    disabled={naActive}
                    onChange={(v) => set(field, v)}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(form)}
          disabled={saving || !form.player}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Bulk Entry Panel ───────────────────────────────────────────────────────────

const BULK_FIELDS: { label: string; field: ScoreField; group: string }[] = SCORE_FIELDS

function BulkEntryPanel({
  players,
  year,
  evalType,
  onSaved,
  onClose,
}: {
  players: Player[]
  year: number
  evalType: "pre" | "post"
  onSaved: () => void
  onClose: () => void
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [scores, setScores] = useState<Partial<Record<ScoreField, number | null>>>(
    Object.fromEntries(BULK_FIELDS.map((f) => [f.field, null])) as any
  )
  const [naPitching, setNaPitching] = useState(false)
  const [naCatcher, setNaCatcher] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNames, setSavedNames] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Refs for each score input for keyboard navigation
  const fieldOrder = BULK_FIELDS.map((f) => f.field)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const playerInputRef = useRef<HTMLInputElement | null>(null)

  const resetScores = () => {
    setScores(Object.fromEntries(BULK_FIELDS.map((f) => [f.field, null])) as any)
    setNaPitching(false)
    setNaCatcher(false)
  }

  const isFieldDisabled = (field: ScoreField) => {
    if (naPitching && (field === "pitching_speed" || field === "pitching_accuracy")) return true
    if (naCatcher && (field === "catcher_receiving" || field === "catcher_blocking")) return true
    return false
  }

  const handleKeyDown = (field: ScoreField, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      // Find next non-disabled field
      let idx = fieldOrder.indexOf(field) + 1
      while (idx < fieldOrder.length) {
        if (!isFieldDisabled(fieldOrder[idx])) {
          inputRefs.current[fieldOrder[idx]]?.focus()
          return
        }
        idx++
      }
      // Past last field — save and reset to player search
      handleSave()
    }
  }

  const handleSave = async () => {
    if (!selectedPlayer) return
    setSaving(true)
    setError(null)
    try {
      const payload: Partial<Evaluation> = {
        player: selectedPlayer.id,
        season_year: year,
        evaluation_type: evalType,
        ...scores,
        ...(naPitching ? { pitching_speed: null, pitching_accuracy: null } : {}),
        ...(naCatcher ? { catcher_receiving: null, catcher_blocking: null } : {}),
      }
      // Try update first (patch if exists), then create
      const existing = await getEvaluations({ year }).then((list) =>
        list.find((e) => e.player === selectedPlayer.id && e.evaluation_type === evalType)
      )
      if (existing) {
        await updateEvaluation(existing.id, payload)
      } else {
        await createEvaluation(payload)
      }
      setSavedNames((prev) => [`${selectedPlayer.last_name}, ${selectedPlayer.first_name}`, ...prev.slice(0, 9)])
      setSelectedPlayer(null)
      resetScores()
      onSaved()
      // Return focus to player search
      setTimeout(() => playerInputRef.current?.focus(), 50)
    } catch {
      setError("Save failed. Check that the player + year + type combination doesn't already exist.")
    } finally {
      setSaving(false)
    }
  }

  const groups = ["Hitting", "Fielding", "Throwing", "Pitching", "Catcher"]

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 3, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Bulk Entry Mode</Typography>
          <Typography sx={{ color: "#888", fontSize: "0.8rem" }}>
            Search for a player, tab through scores (1–5), press Enter or Tab past the last field to save and move on.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" color="inherit" onClick={onClose}>
          Exit Bulk Entry
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap", mb: 3 }}>
        {/* Player search */}
        <Autocomplete
          options={players}
          getOptionLabel={(p) => `${p.last_name}, ${p.first_name}`}
          value={selectedPlayer}
          onChange={(_, val) => {
            setSelectedPlayer(val)
            if (val) setTimeout(() => inputRefs.current["hitting_power"]?.focus(), 80)
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={playerInputRef}
              label="Player"
              size="small"
              placeholder="Search by name…"
              onKeyDown={(e) => {
                if (e.key === "Tab" && selectedPlayer) {
                  e.preventDefault()
                  inputRefs.current["hitting_power"]?.focus()
                }
              }}
            />
          )}
          sx={{ width: 260 }}
          autoHighlight
          blurOnSelect={false}
        />

        {/* Year + type (inherited from parent filters) */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", pt: 0.5 }}>
          <Chip label={`${year}`} size="small" sx={{ bgcolor: "#f4f4f5", fontWeight: 600 }} />
          <Chip label={evalType === "pre" ? "Pre-Season" : "Post-Season"} size="small" sx={{ bgcolor: "#f4f4f5", fontWeight: 600 }} />
        </Box>
      </Box>

      {/* Score groups */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 2.5 }}>
        {groups.map((group) => {
          const fields = BULK_FIELDS.filter((f) => f.group === group)
          const optional = OPTIONAL_GROUPS.has(group)
          const naActive = group === "Pitching" ? naPitching : group === "Catcher" ? naCatcher : false
          return (
            <Box key={group}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>
                  {group}
                </Typography>
                {optional && (
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={naActive}
                        onChange={(e) => {
                          const v = e.target.checked
                          if (group === "Pitching") setNaPitching(v)
                          if (group === "Catcher") setNaCatcher(v)
                          if (v) {
                            const toNull = fields.reduce((a, f) => ({ ...a, [f.field]: null }), {})
                            setScores((s) => ({ ...s, ...toNull }))
                          }
                        }}
                        sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#aaa" } }}
                      />
                    }
                    label={<Typography sx={{ fontSize: "0.68rem", color: "#aaa" }}>N/A</Typography>}
                    sx={{ m: 0 }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                {fields.map(({ label, field }) => (
                  <ScoreInput
                    key={field}
                    label={label}
                    value={scores[field] ?? null}
                    disabled={isFieldDisabled(field) || !selectedPlayer}
                    inputRef={(el: HTMLInputElement | null) => { inputRefs.current[field] = el }}
                    onChange={(v) => setScores((s) => ({ ...s, [field]: v }))}
                    onKeyDown={(e) => handleKeyDown(field, e)}
                  />
                ))}
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Save row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!selectedPlayer || saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Saving…" : "Save & Next"}
        </Button>
        <Button variant="outlined" color="inherit" size="small" onClick={() => { setSelectedPlayer(null); resetScores() }}>
          Clear
        </Button>
        {savedNames.length > 0 && (
          <Typography sx={{ fontSize: "0.78rem", color: "#666" }}>
            Saved: {savedNames.slice(0, 3).join(" · ")}{savedNames.length > 3 ? ` +${savedNames.length - 3} more` : ""}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EvaluationsPage() {
  const [searchParams] = useSearchParams()
  const sportFilter = searchParams.get('sport') ?? undefined

  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bulkMode, setBulkMode] = useState(false)

  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState<"" | "pre" | "post">("")
  const [filterDivision, setFilterDivision] = useState<number | "">("")
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([])

  // Load divisions once for the filter dropdown
  useEffect(() => {
    const sport = sportFilter || "baseball"
    client.get("/divisions/", { params: { sport } })
      .then((res) => setDivisions(res.data ?? []))
      .catch(() => {/* non-fatal */})
  }, [sportFilter])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEval, setEditEval] = useState<Partial<Evaluation> | null>(null)
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setEvaluations([])
    setPlayers([])
    try {
      const sport = sportFilter || "baseball"
      const params: any = { year: filterYear, sport }
      if (filterType) params.type = filterType
      if (filterDivision) params.division = filterDivision
      const [evals, pls] = await Promise.all([
        getEvaluations(params),
        getPlayers({ sport } as any),
      ])
      const sorted = [...evals].sort((a, b) => {
        const t = (a.tier_spot ?? 99) - (b.tier_spot ?? 99)
        return t !== 0 ? t : (b.overall_total ?? 0) - (a.overall_total ?? 0)
      })
      setEvaluations(sorted)
      setPlayers(pls)
    } catch {
      setError("Failed to load evaluations.")
    } finally {
      setLoading(false)
    }
  }, [filterYear, filterType, filterDivision, sportFilter])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: Partial<Evaluation>) => {
    setSaving(true)
    try {
      if (editEval?.id) await updateEvaluation(editEval.id, data)
      else await createEvaluation(data)
      setDialogOpen(false)
      setEditEval(null)
      await load()
    } catch { setError("Save failed.") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this evaluation?")) return
    try { await deleteEvaluation(id); await load() }
    catch { setError("Delete failed.") }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await importEvaluationCSV(file, filterYear)
      setImportResult(result)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Import failed.")
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const exportURL = getEvaluationExportURL({ year: filterYear })
  const years = Array.from(new Set([new Date().getFullYear(), ...evaluations.map((e) => e.season_year)])).sort((a, b) => b - a)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>
            {sportFilter === "softball" ? "Softball Evaluations" : "Baseball Evaluations"}
          </Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Score players on hitting, fielding, throwing, pitching, and catching (1–5 scale).
        </Typography>
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select value={filterYear} label="Year" onChange={(e) => setFilterYear(Number(e.target.value))}>
            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value as any)}>
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="pre">Pre-Season</MenuItem>
            <MenuItem value="post">Post-Season</MenuItem>
          </Select>
        </FormControl>
        {divisions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Division</InputLabel>
            <Select value={filterDivision} label="Division" onChange={(e) => setFilterDivision(e.target.value as number | "")}>
              <MenuItem value="">All Divisions</MenuItem>
              {divisions.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" onClick={load} startIcon={<RefreshIcon />} color="inherit">Refresh</Button>
        <Button size="small" variant="outlined" component="a" href={exportURL} download={`evaluations_${filterYear}.csv`} startIcon={<DownloadIcon />} color="inherit">Export CSV</Button>
        <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()} disabled={importing} startIcon={importing ? <CircularProgress size={14} /> : <UploadFileIcon />} color="inherit">Import CSV</Button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: "none" }} />
        {/* Bulk entry is primary */}
        <Button
          variant="contained"
          onClick={() => setBulkMode(true)}
          startIcon={<TableRowsIcon />}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
        >
          Bulk Entry
        </Button>
        <Button
          variant="outlined"
          onClick={() => { setEditEval(null); setDialogOpen(true) }}
          startIcon={<AddIcon />}
          color="inherit"
        >
          Add Entry
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {importResult && (
        <Alert severity={importResult.failure_count > 0 ? "warning" : "success"} sx={{ mb: 2 }} onClose={() => setImportResult(null)}>
          Imported {importResult.processed} evaluations.{importResult.failure_count > 0 ? ` ${importResult.failure_count} failures.` : ""}
        </Alert>
      )}

      {/* Bulk entry panel (inline, not modal) */}
      {bulkMode && (
        <BulkEntryPanel
          players={players}
          year={filterYear}
          evalType={(filterType as "pre" | "post") || "pre"}
          onSaved={load}
          onClose={() => setBulkMode(false)}
        />
      )}

      {/* Table */}
      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Player Rankings</Typography>
          <Chip label={evaluations.length} size="small" sx={{ bgcolor: "#e4e4e7", fontWeight: 700, fontSize: "0.75rem", height: 20 }} />
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={28} sx={{ color: "#C41230" }} />
          </Box>
        ) : evaluations.length === 0 ? (
          <Typography sx={{ color: "#aaa", py: 3, textAlign: "center", fontSize: "0.875rem" }}>
            No evaluations for {filterYear}. Use Bulk Entry or Add Entry above.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Tier</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Player</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>Division</TableCell>
                  <TableCell colSpan={4} sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Hitting</TableCell>
                  <TableCell colSpan={4} sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Fielding</TableCell>
                  <TableCell colSpan={4} sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Throwing</TableCell>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Pitching</TableCell>
                  <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Catcher</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", borderLeft: "2px solid #e4e4e7" }}>Overall</TableCell>
                  <TableCell />
                </TableRow>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell /><TableCell /><TableCell />
                  {[["h", "Pwr","Cnt","Frm","Tot"], ["f", "Frm","Glv","Hsl","Tot"], ["t", "Frm","Spd","Acc","Tot"]].map(([prefix, ...subs]) =>
                    subs.map((h, i) => (
                      <TableCell key={`${prefix}-${h}`} sx={{ fontSize: "0.68rem", color: "#888", borderLeft: i === 0 ? "2px solid #e4e4e7" : undefined }}>{h}</TableCell>
                    ))
                  )}
                  {[["p", "Spd","Acc","Tot"], ["c", "Rcv","Blk","Tot"]].map(([prefix, ...subs]) =>
                    subs.map((h, i) => (
                      <TableCell key={`${prefix}-${h}`} sx={{ fontSize: "0.68rem", color: "#888", borderLeft: i === 0 ? "2px solid #e4e4e7" : undefined }}>{h}</TableCell>
                    ))
                  )}
                  <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }} /><TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {evaluations.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell><TierChip tier={e.tier_spot} /></TableCell>
                    <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <span>{e.player_detail?.last_name}, {e.player_detail?.first_name}</span>
                        <SportChip sport={e.player_detail?.sport} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#666" }}>{e.player_detail?.division ?? "—"}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}><ScoreCell value={e.hitting_power} /></TableCell>
                    <TableCell><ScoreCell value={e.hitting_contact} /></TableCell>
                    <TableCell><ScoreCell value={e.hitting_form} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.total_hitting}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}><ScoreCell value={e.fielding_form} /></TableCell>
                    <TableCell><ScoreCell value={e.fielding_glove} /></TableCell>
                    <TableCell><ScoreCell value={e.fielding_hustle} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.total_fielding}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}><ScoreCell value={e.throwing_form} /></TableCell>
                    <TableCell><ScoreCell value={e.throwing_speed} /></TableCell>
                    <TableCell><ScoreCell value={e.throwing_accuracy} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.total_throwing}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}><ScoreCell value={e.pitching_speed} /></TableCell>
                    <TableCell><ScoreCell value={e.pitching_accuracy} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.total_pitching || <Typography sx={{ fontSize: "0.78rem", color: "#ccc" }}>N/A</Typography>}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}><ScoreCell value={e.catcher_receiving} /></TableCell>
                    <TableCell><ScoreCell value={e.catcher_blocking} /></TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{e.total_catcher || <Typography sx={{ fontSize: "0.78rem", color: "#ccc" }}>N/A</Typography>}</TableCell>
                    <TableCell sx={{ borderLeft: "2px solid #e4e4e7" }}>
                      <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{e.overall_total}</Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Edit">
                        <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#666" }} onClick={() => { setEditEval(e); setDialogOpen(true) }}>
                          <EditIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#C41230" }} onClick={() => handleDelete(e.id)}>
                          <DeleteIcon fontSize="small" />
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ fontSize: "0.72rem", color: "#aaa" }}>
          Import CSV columns: Player · Hitting Form · Hitting Power · Hitting Contact · Fielding Form · Fielding Glove · Fielding Hustle · Throwing Form · Throwing Speed · Throwing Accuracy · Pitching Speed · Pitching Accuracy (optional) · Catcher Receiving · Catcher Blocking (optional) · Season Year · Evaluation Type (pre/post)
        </Typography>
      </Box>

      <EvalFormDialog
        open={dialogOpen}
        initial={editEval}
        players={players}
        onSave={handleSave}
        onClose={() => { setDialogOpen(false); setEditEval(null) }}
        saving={saving}
      />
    </Box>
  )
}
