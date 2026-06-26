import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Collapse,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, InputLabel, MenuItem, OutlinedInput, Paper, Select,
  TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import SaveIcon from "@mui/icons-material/Save"
import CancelIcon from "@mui/icons-material/Cancel"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import client from "../api/client"

const RED = "#C41230"

const PROGRAM_FILTERS = [
  { value: "ALL",          label: "All",          color: "#555" },
  { value: "RECREATION",   label: "Recreation",   color: "#1565c0" },
  { value: "SHOWCASE",     label: "Showcase",     color: "#6a1b9a" },
  { value: "ALL_STARS",    label: "All Stars",    color: "#b45309" },
  { value: "TEEN_BASEBALL",label: "Teen Baseball",color: "#2e7d32" },
  { value: "TEEN_SOFTBALL",label: "Teen Softball",color: "#6a1b9a" },
  { value: "FALL_BALL",    label: "Fall Ball",    color: "#c2410c" },
]

interface TeamPlayer { id: number; first_name: string; last_name: string; jersey_size: string; is_pitcher: boolean; is_catcher: boolean }
interface TeamData { id: number; name: string; year: number; division: number | null; division_name: string | null; coach: string; assistant_coach: string; home_location: string; jersey_color: string; sport: string; program_type: string | null; program_label: string | null; roster: TeamPlayer[] }
interface FreeAgent { id: number; first_name: string; last_name: string; date_of_birth: string | null }

async function getTeams(sport?: string, year?: number): Promise<TeamData[]> {
  const res = await client.get("/team-manage/", { params: { ...(sport ? { sport } : {}), ...(year ? { year } : {}) } })
  return res.data ?? []
}
async function createTeam(data: any): Promise<TeamData> {
  const res = await client.post("/teams-manage/", data); return res.data
}
async function deleteTeam(id: number): Promise<void> {
  await client.delete(`/teams-manage/${id}/`)
}
async function updateTeam(id: number, data: Partial<TeamData>): Promise<TeamData> {
  const res = await client.patch(`/team-manage/${id}/`, data); return res.data
}
async function assignPlayer(teamId: number, playerId: number): Promise<void> {
  await client.post(`/team-manage/${teamId}/assign/`, { player_id: playerId })
}
async function removePlayer(teamId: number, playerId: number): Promise<void> {
  await client.delete(`/team-manage/${teamId}/players/${playerId}/`)
}
async function getFreeAgents(divisionId?: number): Promise<FreeAgent[]> {
  const res = await client.get("/team-manage/free-agents/", { params: divisionId ? { division: divisionId } : {} })
  return res.data ?? []
}

// ── Edit row ──────────────────────────────────────────────────────────────────

function EditableField({ label, value, onSave, placeholder }: { label: string; value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  const save = () => { onSave(val); setEditing(false) }

  if (editing) {
    return (
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
        <TextField size="small" label={label} value={val} onChange={e => setVal(e.target.value)}
          placeholder={placeholder} sx={{ flex: 1, "& input": { fontSize: "0.83rem" } }}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setVal(value); setEditing(false) } }}
          autoFocus />
        <Tooltip title="Save"><Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#2e7d32" }} onClick={save}><SaveIcon sx={{ fontSize: 16 }} /></Button></Tooltip>
        <Tooltip title="Cancel"><Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#aaa" }} onClick={() => { setVal(value); setEditing(false) }}><CancelIcon sx={{ fontSize: 16 }} /></Button></Tooltip>
      </Box>
    )
  }
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 28 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: "0.68rem", color: "#aaa", lineHeight: 1 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.83rem", color: val ? "#111" : "#bbb" }}>{val || `—`}</Typography>
      </Box>
      <Tooltip title={`Edit ${label}`}>
        <Button size="small" sx={{ minWidth: 0, p: 0.4, color: "#ccc", "&:hover": { color: RED } }} onClick={() => setEditing(true)}>
          <EditIcon sx={{ fontSize: 14 }} />
        </Button>
      </Tooltip>
    </Box>
  )
}

// ── Coach field with board-member autocomplete ────────────────────────────────

function CoachEditableField({
  label, value, onSave, placeholder, suggestions, helperText,
}: {
  label: string; value: string; onSave: (v: string) => void
  placeholder?: string; suggestions: string[]; helperText?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  const save = () => { onSave(val.trim()); setEditing(false) }

  if (editing) {
    return (
      <Box>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}>
          <Autocomplete
            freeSolo
            options={suggestions}
            value={val}
            onInputChange={(_, newVal) => setVal(newVal)}
            onChange={(_, newVal) => { if (typeof newVal === "string") setVal(newVal) }}
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={label}
                placeholder={placeholder}
                autoFocus
                sx={{ "& input": { fontSize: "0.83rem" } }}
                onKeyDown={e => {
                  if (e.key === "Enter") save()
                  if (e.key === "Escape") { setVal(value); setEditing(false) }
                }}
              />
            )}
          />
          <Tooltip title="Save">
            <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#2e7d32", mt: 0.5 }} onClick={save}>
              <SaveIcon sx={{ fontSize: 16 }} />
            </Button>
          </Tooltip>
          <Tooltip title="Cancel">
            <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#aaa", mt: 0.5 }} onClick={() => { setVal(value); setEditing(false) }}>
              <CancelIcon sx={{ fontSize: 16 }} />
            </Button>
          </Tooltip>
        </Box>
        {helperText && (
          <Typography sx={{ fontSize: "0.68rem", color: "#aaa", mt: 0.4, ml: 0.5 }}>{helperText}</Typography>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minHeight: 28 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: "0.68rem", color: "#aaa", lineHeight: 1 }}>{label}</Typography>
        <Typography sx={{ fontSize: "0.83rem", color: val ? "#111" : "#bbb" }}>{val || "—"}</Typography>
      </Box>
      <Tooltip title={`Edit ${label}`}>
        <Button size="small" sx={{ minWidth: 0, p: 0.4, color: "#ccc", "&:hover": { color: RED } }} onClick={() => setEditing(true)}>
          <EditIcon sx={{ fontSize: 14 }} />
        </Button>
      </Tooltip>
    </Box>
  )
}

// ── Team card ─────────────────────────────────────────────────────────────────

function TeamCard({ team, onUpdate, onAssign, onRemove, onDelete, boardMemberNames }: {
  team: TeamData
  onUpdate: (id: number, data: Partial<TeamData>) => void
  onAssign: (teamId: number, divisionId: number | null) => void
  onRemove: (teamId: number, playerId: number, name: string) => void
  onDelete: (teamId: number, teamName: string) => void
  boardMemberNames: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
      {/* Header */}
      <Box onClick={() => setOpen(v => !v)} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.25, cursor: "pointer", "&:hover": { bgcolor: "#fafafa" } }}>
        {team.jersey_color && <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: team.jersey_color, border: "1px solid #ddd", flexShrink: 0 }} />}
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>{team.name}</Typography>
        {team.coach && <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>Coach: {team.coach}</Typography>}
        <Chip label={`${team.roster.length}`} size="small" sx={{ height: 18, fontSize: "0.68rem", bgcolor: "#f4f4f5" }} />
        <Tooltip title="Delete team">
          <Box component="span"
            onClick={e => { e.stopPropagation(); onDelete(team.id, team.name) }}
            sx={{ color: "#ccc", cursor: "pointer", display: "flex", "&:hover": { color: RED } }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </Box>
        </Tooltip>
        {open ? <ExpandLessIcon sx={{ fontSize: 16, color: "#aaa" }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: "#aaa" }} />}
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <CoachEditableField label="Head Coach" value={team.coach || ""} placeholder="Coach name"
              suggestions={boardMemberNames}
              onSave={v => onUpdate(team.id, { coach: v })} />
            <CoachEditableField label="Assistant Coach" value={team.assistant_coach || ""} placeholder="Asst. coach name"
              suggestions={boardMemberNames}
              helperText="Separate multiple coaches with a comma, e.g. John Smith, Jane Doe"
              onSave={v => onUpdate(team.id, { assistant_coach: v })} />
<EditableField label="Jersey Color" value={team.jersey_color || ""} placeholder="e.g. Red"
              onSave={v => onUpdate(team.id, { jersey_color: v })} />
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Roster */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", flex: 1 }}>Roster</Typography>
            <Button size="small" variant="outlined" startIcon={<PersonAddIcon sx={{ fontSize: 14 }} />}
              onClick={() => onAssign(team.id, team.division)}
              sx={{ fontSize: "0.72rem", borderColor: RED, color: RED }}>
              Add Player
            </Button>
          </Box>

          {team.roster.length === 0 ? (
            <Typography sx={{ fontSize: "0.8rem", color: "#bbb", py: 1 }}>No players assigned yet.</Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {team.roster.map(p => (
                <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.5, borderRadius: 1, "&:hover": { bgcolor: "#fafafa" } }}>
                  <Typography sx={{ fontSize: "0.83rem", flex: 1 }}>{p.last_name}, {p.first_name}</Typography>
                  {p.jersey_size && <Typography sx={{ fontSize: "0.72rem", color: "#aaa" }}>{p.jersey_size}</Typography>}
                  {p.is_pitcher && <Chip label="P" size="small" sx={{ height: 16, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(21,101,192,0.1)", color: "#1565c0" }} />}
                  {p.is_catcher && <Chip label="C" size="small" sx={{ height: 16, fontSize: "0.62rem", fontWeight: 700, bgcolor: "rgba(196,18,48,0.08)", color: RED }} />}
                  <Tooltip title="Remove from team">
                    <Button size="small" sx={{ minWidth: 0, p: 0.3, color: "#ccc", "&:hover": { color: RED } }}
                      onClick={() => onRemove(team.id, p.id, `${p.first_name} ${p.last_name}`)}>
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </Button>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamManagementPage() {
  const [searchParams] = useSearchParams()
  const sportParam = searchParams.get("sport") ?? undefined

  const [teams, setTeams] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [createOpen, setCreateOpen] = useState(false)
  const [boardMemberNames, setBoardMemberNames] = useState<string[]>([])
  // Filters
  const [programFilter, setProgramFilter] = useState("ALL")
  const [teamFilter, setTeamFilter] = useState<string[]>([])

  // Add-player dialog
  const [assignDialog, setAssignDialog] = useState<{ teamId: number; divisionId: number | null } | null>(null)
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<FreeAgent | null>(null)
  const [assigning, setAssigning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setTeams(await getTeams(sportParam, year)) }
    catch { setError("Failed to load teams.") }
    finally { setLoading(false) }
  }, [sportParam, year])

  useEffect(() => { load() }, [load])

  // Load board member names for coach autocomplete
  useEffect(() => {
    client.get("/board-members/")
      .then(r => {
        const list: any[] = r.data?.data ?? r.data ?? []
        setBoardMemberNames(list.map((b: any) => `${b.first_name} ${b.last_name}`.trim()).filter(Boolean).sort())
      })
      .catch(() => {})
  }, [])

  const handleUpdate = async (id: number, data: Partial<TeamData>) => {
    try {
      const updated = await updateTeam(id, data)
      setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    } catch { setError("Save failed.") }
  }

  const openAssign = async (teamId: number, divisionId: number | null) => {
    setAssignDialog({ teamId, divisionId })
    setSelectedAgent(null)
    try { setFreeAgents(await getFreeAgents(divisionId ?? undefined)) }
    catch { setFreeAgents([]) }
  }

  const handleAssign = async () => {
    if (!assignDialog || !selectedAgent) return
    setAssigning(true)
    try {
      await assignPlayer(assignDialog.teamId, selectedAgent.id)
      setAssignDialog(null)
      await load()
    } catch { setError("Assign failed.") }
    finally { setAssigning(false) }
  }

  const handleRemove = async (teamId: number, playerId: number, name: string) => {
    if (!confirm(`Remove ${name} from this team? They will become a Free Agent.`)) return
    try { await removePlayer(teamId, playerId); await load() }
    catch { setError("Remove failed.") }
  }

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    if (!confirm(`Delete team "${teamName}"? This cannot be undone. All players must be removed first.`)) return
    try { await deleteTeam(teamId); await load() }
    catch (err: any) { setError(err?.response?.data?.error ?? "Delete failed.") }
  }

  // Apply client-side filters
  const filteredTeams = teams.filter(t => {
    if (programFilter !== "ALL" && t.program_type !== programFilter) return false
    if (teamFilter.length > 0 && !teamFilter.includes(t.name)) return false
    return true
  })

  // Group filtered teams by division (ordered)
  const byDiv: Record<string, TeamData[]> = {}
  for (const t of filteredTeams) {
    const d = t.division_name || "No Division"
    if (!byDiv[d]) byDiv[d] = []
    byDiv[d].push(t)
  }

  // Build team options for multi-select, grouped by division
  const teamsByDivision: Record<string, string[]> = {}
  for (const t of teams) {
    const d = t.division_name || "No Division"
    if (!teamsByDivision[d]) teamsByDivision[d] = []
    if (!teamsByDivision[d].includes(t.name)) teamsByDivision[d].push(t.name)
  }
  const allTeamNames = Object.values(teamsByDivision).flat()

  const sport = sportParam ? sportParam.charAt(0).toUpperCase() + sportParam.slice(1) : "All Sports"

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Team Management</Typography>
          {sportParam && <Chip label={sport} size="small" sx={{ bgcolor: sportParam === "softball" ? "#6a1b9a" : "#1565c0", color: "#fff", fontWeight: 700 }} />}
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Edit coaches, assign players, and update home locations for each team.
        </Typography>
      </Box>

      {/* New Team button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          New Team
        </Button>
      </Box>

      {/* Row 1: Year + program type filter buttons */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Program type buttons */}
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {PROGRAM_FILTERS.map(f => {
            const active = programFilter === f.value
            return (
              <Button
                key={f.value}
                size="small"
                variant={active ? "contained" : "outlined"}
                onClick={() => setProgramFilter(f.value)}
                sx={{
                  fontSize: "0.75rem", fontWeight: 600, px: 1.5, py: 0.4,
                  bgcolor: active ? f.color : "transparent",
                  borderColor: active ? f.color : "#d4d4d8",
                  color: active ? "#fff" : f.color,
                  "&:hover": { bgcolor: active ? f.color : `${f.color}12`, borderColor: f.color },
                }}
              >
                {f.label}
              </Button>
            )
          })}
        </Box>

        <Typography sx={{ fontSize: "0.8rem", color: "#aaa", ml: "auto" }}>
          {filteredTeams.length} of {teams.length} teams
        </Typography>
      </Box>

      {/* Row 2: Team multi-select */}
      <Box sx={{ mb: 2.5 }}>
        <FormControl size="small" sx={{ width: "100%", maxWidth: 500 }}>
          <InputLabel>Filter by team</InputLabel>
          <Select
            multiple
            value={teamFilter}
            onChange={e => setTeamFilter(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value as string[])}
            input={<OutlinedInput label="Filter by team" />}
            renderValue={(selected) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {(selected as string[]).map(v => (
                  <Chip key={v} label={v} size="small" sx={{ height: 20, fontSize: "0.72rem" }}
                    onMouseDown={e => e.stopPropagation()}
                    onDelete={() => setTeamFilter(prev => prev.filter(t => t !== v))} />
                ))}
              </Box>
            )}
            MenuProps={{ PaperProps: { sx: { maxHeight: 400 } } }}
          >
            {Object.entries(teamsByDivision).sort(([a], [b]) => a.localeCompare(b)).map(([div, names]) => [
              <MenuItem key={`div-${div}`} disabled sx={{ fontSize: "0.7rem", fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: "0.06em", py: 0.5, opacity: "1 !important" }}>
                {div}
              </MenuItem>,
              ...names.sort().map(name => (
                <MenuItem key={name} value={name} sx={{ fontSize: "0.85rem", pl: 3 }}>
                  {name}
                </MenuItem>
              ))
            ])}
          </Select>
        </FormControl>
        {teamFilter.length > 0 && (
          <Button size="small" onClick={() => setTeamFilter([])} sx={{ ml: 1, fontSize: "0.72rem", color: "#888" }}>
            Clear
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: RED }} /></Box>
      ) : filteredTeams.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 6, textAlign: "center" }}>
          <Typography sx={{ color: "#aaa" }}>
            {teams.length === 0 ? `No teams found for ${year}.` : "No teams match the selected filters."}
          </Typography>
        </Paper>
      ) : (
        Object.entries(byDiv).map(([div, divTeams]) => (
          <Box key={div} sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#444" }}>{div}</Typography>
              <Chip label={divTeams.length} size="small" sx={{ height: 18, bgcolor: "#f4f4f5", fontSize: "0.7rem" }} />
              <Box sx={{ flex: 1 }}><Divider /></Box>
            </Box>
            {divTeams.map(t => (
              <TeamCard key={t.id} team={t}
                onUpdate={handleUpdate}
                onAssign={openAssign}
                onRemove={handleRemove}
                onDelete={handleDeleteTeam}
                boardMemberNames={boardMemberNames}
              />
            ))}
          </Box>
        ))
      )}

      {/* Assign Player Dialog */}
      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Player to Team</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: "0.82rem", color: "#555", mb: 2 }}>
            Select a free agent (player not currently on a team in this division).
          </Typography>
          {freeAgents.length === 0 ? (
            <Typography sx={{ color: "#aaa", fontSize: "0.85rem" }}>No free agents available in this division.</Typography>
          ) : (
            <Autocomplete
              options={freeAgents}
              getOptionLabel={p => `${p.last_name}, ${p.first_name}${p.date_of_birth ? ` (${p.date_of_birth})` : ""}`}
              value={selectedAgent}
              onChange={(_, v) => setSelectedAgent(v)}
              renderInput={params => <TextField {...params} label="Select player" size="small" />}
              autoHighlight
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAssignDialog(null)} color="inherit">Cancel</Button>
          <Button variant="contained" disabled={!selectedAgent || assigning}
            onClick={handleAssign}
            startIcon={assigning ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
            {assigning ? "Assigning…" : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Team dialog */}
      <CreateTeamDialog
        open={createOpen}
        year={year}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => { setCreateOpen(false); await load() }}
      />
    </Box>
  )
}

// ── Create Team dialog ────────────────────────────────────────────────────────

function CreateTeamDialog({ open, year, onClose, onCreated }: {
  open: boolean; year: number; onClose: () => void; onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [divisionId, setDivisionId] = useState<number | "">("")
  const [coach, setCoach] = useState("")
  const [assistantCoach, setAssistantCoach] = useState("")
  const [jerseyColor, setJerseyColor] = useState("")
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(""); setDivisionId(""); setCoach(""); setAssistantCoach(""); setJerseyColor(""); setError(null)
      client.get("/divisions/").then(r => setDivisions(r.data?.data ?? r.data ?? [])).catch(() => {})
    }
  }, [open])

  const handleCreate = async () => {
    if (!name.trim()) { setError("Team name is required."); return }
    setSaving(true); setError(null)
    try {
      await createTeam({ name: name.trim(), year, division: divisionId || null, coach, assistant_coach: assistantCoach, jersey_color: jerseyColor })
      onCreated()
    } catch (e: any) {
      setError(e?.response?.data?.name?.[0] ?? e?.response?.data?.detail ?? "Create failed.")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Create New Team</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Team Name" size="small" fullWidth required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cardinals" />
          <FormControl size="small" fullWidth>
            <InputLabel>Division</InputLabel>
            <Select value={divisionId} label="Division" onChange={e => setDivisionId(Number(e.target.value) || "")}>
              <MenuItem value="">— Select Division —</MenuItem>
              {divisions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Head Coach" size="small" sx={{ flex: 1 }} value={coach} onChange={e => setCoach(e.target.value)} />
            <TextField label="Assistant Coach" size="small" sx={{ flex: 1 }} value={assistantCoach} onChange={e => setAssistantCoach(e.target.value)} />
          </Box>
          <TextField label="Jersey Color" size="small" fullWidth value={jerseyColor} onChange={e => setJerseyColor(e.target.value)} placeholder="e.g. Red" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" disabled={saving || !name.trim()} onClick={handleCreate}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          {saving ? "Creating…" : "Create Team"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
