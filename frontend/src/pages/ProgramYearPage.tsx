import { useEffect, useState, useCallback } from "react"
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, IconButton,
  MenuItem, Paper, Select, TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import LockOutlinedIcon from "@mui/icons-material/LockOutlined"
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined"
import EditIcon from "@mui/icons-material/Edit"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import SaveIcon from "@mui/icons-material/Save"
import CancelIcon from "@mui/icons-material/Cancel"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import client from "../api/client"

const RED = "#C41230"

interface ProgramInfo { id: number; name: string; program_type: string; program_type_label: string; season_year: number; sport: string; is_active: boolean; season_closed: boolean; closed_at: string | null }
interface YearGroup { year: number; programs: ProgramInfo[] }
interface DivisionInfo { id: number; name: string; sport: string; is_calendar_only: boolean }

const ALL_TYPES = [
  { value: "RECREATION",    label: "Recreation",    desc: "Spring regular season (Baseball + Softball)" },
  { value: "ALL_STARS",     label: "All Stars",     desc: "Post-season tournament teams" },
  { value: "SHOWCASE",      label: "Showcase",      desc: "Supplemental competitive program" },
  { value: "TEEN_BASEBALL", label: "Teen Baseball", desc: "Juniors & Seniors (no eval/draft)" },
  { value: "TEEN_SOFTBALL", label: "Teen Softball", desc: "Teen Softball program" },
  { value: "FALL_BALL",     label: "Fall Ball",     desc: "Fall supplemental season" },
]

const TYPE_COLORS: Record<string, string> = {
  RECREATION: "#1565c0", ALL_STARS: "#b45309", SHOWCASE: "#6a1b9a",
  TEEN_BASEBALL: "#2e7d32", TEEN_SOFTBALL: "#6a1b9a", FALL_BALL: "#c2410c",
}

async function getYears(): Promise<YearGroup[]> {
  const res = await client.get("/program-years/")
  return res.data ?? []
}
async function startYear(year: number, programTypes: string[]): Promise<any> {
  const res = await client.post("/program-years/start/", { year, program_types: programTypes })
  return res.data
}

// ── Division Panel ────────────────────────────────────────────────────────────

function DivisionPanel({ programId }: { programId: number }) {
  const [divisions, setDivisions] = useState<DivisionInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add form
  const [addName, setAddName] = useState("")
  const [addSport, setAddSport] = useState<"baseball" | "softball">("baseball")
  const [adding, setAdding] = useState(false)

  // Rename state: divisionId → draft name
  const [renaming, setRenaming] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get(`/program-years/${programId}/divisions/`)
      setDivisions(res.data ?? [])
    } catch { setError("Failed to load divisions.") }
    finally { setLoading(false) }
  }, [programId])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!addName.trim()) return
    setAdding(true); setError(null)
    try {
      await client.post(`/program-years/${programId}/divisions/`, { name: addName.trim(), sport: addSport })
      setAddName("")
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to add division.")
    } finally { setAdding(false) }
  }

  const handleRename = async (divId: number) => {
    const name = (renaming[divId] ?? "").trim()
    if (!name) return
    setSaving(divId); setError(null)
    try {
      await client.patch(`/program-years/${programId}/divisions/${divId}/`, { name })
      setRenaming(prev => { const n = { ...prev }; delete n[divId]; return n })
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to rename division.")
    } finally { setSaving(null) }
  }

  const handleDelete = async (div: DivisionInfo) => {
    if (!confirm(`Delete division "${div.name}"? This cannot be undone.`)) return
    setError(null)
    try {
      await client.delete(`/program-years/${programId}/divisions/${div.id}/`)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to delete division.")
    }
  }

  if (loading) return <Box sx={{ py: 1.5, display: "flex", justifyContent: "center" }}><CircularProgress size={18} sx={{ color: RED }} /></Box>

  return (
    <Box sx={{ pt: 1 }}>
      {error && <Alert severity="error" sx={{ mb: 1, py: 0.5, fontSize: "0.78rem" }} onClose={() => setError(null)}>{error}</Alert>}

      {divisions.length === 0 && !loading && (
        <Typography sx={{ fontSize: "0.78rem", color: "#bbb", mb: 1 }}>No divisions yet.</Typography>
      )}

      {divisions.map(div => (
        <Box key={div.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.5, borderBottom: "1px solid #f0f0f0" }}>
          {renaming[div.id] !== undefined ? (
            <>
              <TextField
                size="small"
                value={renaming[div.id]}
                onChange={e => setRenaming(prev => ({ ...prev, [div.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") handleRename(div.id); if (e.key === "Escape") setRenaming(prev => { const n = { ...prev }; delete n[div.id]; return n }) }}
                autoFocus
                sx={{ flex: 1, "& input": { fontSize: "0.8rem", py: 0.5 } }}
              />
              <Tooltip title="Save">
                <IconButton size="small" onClick={() => handleRename(div.id)} disabled={saving === div.id}>
                  {saving === div.id ? <CircularProgress size={13} /> : <SaveIcon sx={{ fontSize: 14, color: "#2e7d32" }} />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton size="small" onClick={() => setRenaming(prev => { const n = { ...prev }; delete n[div.id]; return n })}>
                  <CancelIcon sx={{ fontSize: 14, color: "#aaa" }} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Typography sx={{ flex: 1, fontSize: "0.8rem" }}>{div.name}</Typography>
              <Chip
                label={div.sport === "softball" ? "Softball" : "Baseball"}
                size="small"
                sx={{ height: 16, fontSize: "0.62rem", bgcolor: div.sport === "softball" ? "#fce4ec" : "#e3f2fd", color: div.sport === "softball" ? "#880e4f" : "#0d47a1" }}
              />
              <Tooltip title="Rename">
                <IconButton size="small" onClick={() => setRenaming(prev => ({ ...prev, [div.id]: div.name }))}>
                  <EditIcon sx={{ fontSize: 13, color: "#ccc", "&:hover": { color: RED } }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => handleDelete(div)}>
                  <DeleteOutlineIcon sx={{ fontSize: 13, color: "#ccc", "&:hover": { color: RED } }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ))}

      {/* Add row */}
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", mt: 1.25 }}>
        <TextField
          size="small"
          placeholder="Division name"
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAdd() }}
          sx={{ flex: 1, "& input": { fontSize: "0.8rem", py: 0.6 } }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select value={addSport} onChange={e => setAddSport(e.target.value as "baseball" | "softball")} sx={{ fontSize: "0.78rem" }}>
            <MenuItem value="baseball" sx={{ fontSize: "0.8rem" }}>Baseball</MenuItem>
            <MenuItem value="softball" sx={{ fontSize: "0.8rem" }}>Softball</MenuItem>
          </Select>
        </FormControl>
        <Button
          size="small"
          variant="contained"
          disabled={adding || !addName.trim()}
          onClick={handleAdd}
          startIcon={adding ? <CircularProgress size={12} color="inherit" /> : <AddIcon sx={{ fontSize: 14 }} />}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, fontSize: "0.75rem", py: 0.6, whiteSpace: "nowrap" }}
        >
          Add
        </Button>
      </Box>
    </Box>
  )
}

// ── Start Year Dialog ─────────────────────────────────────────────────────────

function StartYearDialog({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: (result: any) => void }) {
  const [year, setYear] = useState(new Date().getFullYear() + 1)
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_TYPES.map(t => t.value)))
  const [starting, setStarting] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = (v: string) => setSelected(prev => {
    const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n
  })

  const handleStart = async () => {
    setStarting(true); setError(null)
    try {
      const r = await startYear(year, Array.from(selected))
      setResult(r)
      onStarted(r)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to start program year.")
    } finally { setStarting(false) }
  }

  const reset = () => { setResult(null); setError(null); setSelected(new Set(ALL_TYPES.map(t => t.value))) }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose() }} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        <RocketLaunchIcon sx={{ color: RED }} /> Start New Program Year
      </DialogTitle>
      <DialogContent dividers>
        {result ? (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 24 }} />
              <Typography sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "0.95rem" }}>{result.year} program year started!</Typography>
            </Box>
            <Typography sx={{ fontSize: "0.85rem", color: "#555", mb: 1 }}>{result.message}</Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {result.programs_created.map((p: string) => <Chip key={p} label={p} size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32" }} />)}
            </Box>
            {result.skipped?.length > 0 && (
              <Typography sx={{ fontSize: "0.78rem", color: "#aaa", mt: 1 }}>
                Skipped (already exist): {result.skipped.map((s: any) => s.reason).join(", ")}
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
              <TextField label="Season Year" type="number" size="small" sx={{ width: 130 }}
                value={year} onChange={e => setYear(parseInt(e.target.value) || year)}
                inputProps={{ min: 2020, max: 2035 }} />
              <Typography sx={{ fontSize: "0.82rem", color: "#888", pb: 0.5 }}>
                Creating new year will set all existing players to inactive until re-imported.
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1.5 }}>Programs to create:</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {ALL_TYPES.map(t => (
                  <Box key={t.value} onClick={() => toggle(t.value)}
                    sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 1.25,
                      border: `1px solid ${selected.has(t.value) ? TYPE_COLORS[t.value] + "60" : "#e4e4e7"}`,
                      borderRadius: 1.5, cursor: "pointer",
                      bgcolor: selected.has(t.value) ? `${TYPE_COLORS[t.value]}08` : "#fff",
                      "&:hover": { borderColor: TYPE_COLORS[t.value] + "80" } }}>
                    <Checkbox checked={selected.has(t.value)} size="small"
                      sx={{ p: 0, mt: 0.2, color: TYPE_COLORS[t.value], "&.Mui-checked": { color: TYPE_COLORS[t.value] } }} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{t.label}</Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{t.desc}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {result ? (
          <Button variant="contained" onClick={() => { reset(); onClose() }} sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>Done</Button>
        ) : (
          <>
            <Button onClick={() => { reset(); onClose() }} color="inherit">Cancel</Button>
            <Button variant="contained" onClick={handleStart} disabled={starting || selected.size === 0}
              startIcon={starting ? <CircularProgress size={14} color="inherit" /> : <RocketLaunchIcon />}
              sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
              {starting ? "Starting…" : `Start ${year}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ── Program Card ──────────────────────────────────────────────────────────────

function ProgramCard({ program: p, color, toggling, onToggleClose }: {
  program: ProgramInfo
  color: string
  toggling: number | null
  onToggleClose: (p: ProgramInfo) => void
}) {
  const [divisionsOpen, setDivisionsOpen] = useState(false)

  return (
    <Box sx={{
      border: `1px solid ${p.season_closed ? "#e4e4e7" : color + "30"}`,
      borderRadius: 1.5, p: 1.5,
      bgcolor: p.season_closed ? "#fafafa" : `${color}06`,
      opacity: p.season_closed ? 0.85 : 1,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.season_closed ? "#ccc" : color, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: p.season_closed ? "#999" : color }}>{p.program_type_label}</Typography>
      </Box>
      <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>
        {p.sport === "softball" ? "Softball" : p.sport === "both" ? "Baseball & Softball" : "Baseball"}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        {!p.is_active && <Chip label="Inactive" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "#f4f4f5", color: "#aaa" }} />}
        {p.season_closed && (
          <Chip
            label="Season Closed"
            size="small"
            icon={<LockOutlinedIcon sx={{ fontSize: "0.7rem !important" }} />}
            sx={{ height: 18, fontSize: "0.62rem", bgcolor: "#fff8e1", color: "#b45309", fontWeight: 700 }}
          />
        )}
      </Box>

      <Button
        size="small"
        startIcon={p.season_closed ? <LockOpenOutlinedIcon sx={{ fontSize: 13 }} /> : <LockOutlinedIcon sx={{ fontSize: 13 }} />}
        disabled={toggling === p.id}
        onClick={() => onToggleClose(p)}
        sx={{
          mt: 1, width: "100%",
          fontSize: "0.68rem", py: 0.3, px: 1,
          borderColor: p.season_closed ? "#2e7d32" : "#aaa",
          color: p.season_closed ? "#2e7d32" : "#777",
          "&:hover": {
            borderColor: p.season_closed ? "#1b5e20" : "#C41230",
            color: p.season_closed ? "#1b5e20" : "#C41230",
            bgcolor: p.season_closed ? "rgba(46,125,50,0.05)" : "rgba(196,18,48,0.05)",
          },
        }}
        variant="outlined"
      >
        {toggling === p.id ? "…" : p.season_closed ? "Re-open Season" : "Close Season"}
      </Button>

      {/* Divisions toggle */}
      <Button
        size="small"
        fullWidth
        endIcon={divisionsOpen ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        onClick={() => setDivisionsOpen(v => !v)}
        sx={{ mt: 0.75, fontSize: "0.68rem", color: "#888", justifyContent: "space-between", px: 0.5, py: 0.3 }}
      >
        Divisions
      </Button>

      <Collapse in={divisionsOpen}>
        <Divider sx={{ mt: 0.5, mb: 0.5 }} />
        <DivisionPanel programId={p.id} />
      </Collapse>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgramYearPage() {
  const [years, setYears] = useState<YearGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDialog, setStartDialog] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try { setYears(await getYears()) }
    catch { setError("Failed to load program years.") }
    finally { setLoading(false) }
  }

  const handleToggleClose = async (program: ProgramInfo) => {
    const action = program.season_closed ? "reopen" : "close"
    const msg = action === "close"
      ? `Close the ${program.program_type_label} ${program.season_year} season? This marks it as complete. Players stay active.`
      : `Re-open the ${program.program_type_label} ${program.season_year} season?`
    if (!confirm(msg)) return
    setToggling(program.id)
    try {
      await client.post(`/program-years/${program.id}/${action}/`)
      await load()
    } catch { setError("Failed to update season status.") }
    finally { setToggling(null) }
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Program Years</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Each program year contains Recreation, All Stars, Showcase, Teen Baseball/Softball, and Fall Ball.
          Starting a new year deactivates all players — they reactivate when imported via CSV.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2.5 }}>
        <Button variant="contained" startIcon={<RocketLaunchIcon />} onClick={() => setStartDialog(true)}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          Start New Program Year
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: RED }} /></Box>
      ) : years.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 8, textAlign: "center" }}>
          <RocketLaunchIcon sx={{ fontSize: 52, color: "#e4e4e7", mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: "#aaa", mb: 0.5 }}>No program years yet</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#bbb" }}>
            Click "Start New Program Year" to create your first season.
          </Typography>
        </Paper>
      ) : (
        years.map(yg => (
          <Paper key={yg.year} elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, mb: 2.5, overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#f9f9f9", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>{yg.year}</Typography>
              <Chip label={`${yg.programs.length} programs`} size="small" sx={{ bgcolor: "#e4e4e7", fontSize: "0.7rem" }} />
            </Box>
            <Box sx={{ p: 2, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 1.5 }}>
              {yg.programs.map(p => {
                const color = TYPE_COLORS[p.program_type] ?? "#555"
                return (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    color={color}
                    toggling={toggling}
                    onToggleClose={handleToggleClose}
                  />
                )
              })}
            </Box>
          </Paper>
        ))
      )}

      <StartYearDialog open={startDialog} onClose={() => setStartDialog(false)} onStarted={() => { load() }} />
    </Box>
  )
}
