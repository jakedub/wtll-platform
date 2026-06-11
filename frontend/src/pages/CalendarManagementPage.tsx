/**
 * Manage ICS calendar subscriptions per team.
 * Add, edit, delete GameChanger (or any ICS) feed URLs.
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, InputLabel, MenuItem,
  Paper, Select, Switch, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import SyncIcon from "@mui/icons-material/Sync"
import LinkIcon from "@mui/icons-material/Link"
import client from "../api/client"

const RED = "#C41230"

interface TeamCal {
  id: number; team: number; team_name: string; division_name: string | null
  ics_url: string; source: string; is_active: boolean
  last_synced_at: string | null; last_synced_display: string
}
interface TeamOption { id: number; name: string; division_name: string | null }

const SOURCES = [
  { value: "TEAM_CENTRAL", label: "GameChanger / Team Central" },
  { value: "ADMIN",        label: "Admin Schedule" },
]

async function getCalendars(): Promise<TeamCal[]> {
  return (await client.get("/team-calendars-manage/")).data ?? []
}
async function getTeams(): Promise<TeamOption[]> {
  const res = await client.get("/team-manage/")
  return (res.data ?? []).map((t: any) => ({ id: t.id, name: t.name, division_name: t.division_name }))
}
async function createCal(data: any): Promise<TeamCal> {
  return (await client.post("/team-calendars-manage/", data)).data
}
async function updateCal(id: number, data: any): Promise<TeamCal> {
  return (await client.patch(`/team-calendars-manage/${id}/`, data)).data
}
async function deleteCal(id: number): Promise<void> {
  await client.delete(`/team-calendars-manage/${id}/`)
}
async function syncAll(): Promise<any> {
  return (await client.post("/calendars/sync/")).data
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

function CalDialog({ open, initial, teams, onSave, onClose }: {
  open: boolean
  initial: TeamCal | null
  teams: TeamOption[]
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [teamId, setTeamId] = useState<number | "">("")
  const [url, setUrl] = useState("")
  const [source, setSource] = useState("TEAM_CENTRAL")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTeamId(initial?.team ?? "")
      setUrl(initial?.ics_url ?? "")
      setSource(initial?.source ?? "TEAM_CENTRAL")
      setError(null)
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!teamId || !url.trim()) { setError("Team and ICS URL are required."); return }
    setSaving(true); setError(null)
    try { onSave({ team: teamId, ics_url: url.trim(), source }) }
    catch (e: any) { setError(e?.response?.data?.ics_url?.[0] ?? e?.response?.data?.detail ?? "Save failed.") }
    finally { setSaving(false) }
  }

  // Group teams by division for the selector
  const byDiv: Record<string, TeamOption[]> = {}
  for (const t of teams) {
    const d = t.division_name ?? "No Division"
    if (!byDiv[d]) byDiv[d] = []
    byDiv[d].push(t)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial ? "Edit Calendar Subscription" : "Add Calendar Subscription"}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>

          {/* Team selector grouped by division */}
          <FormControl size="small" fullWidth disabled={!!initial}>
            <InputLabel>Team</InputLabel>
            <Select value={teamId} label="Team" onChange={e => setTeamId(Number(e.target.value) || "")}>
              <MenuItem value="">— Select Team —</MenuItem>
              {Object.entries(byDiv).sort(([a], [b]) => a.localeCompare(b)).map(([div, ts]) => [
                <MenuItem key={`d-${div}`} disabled sx={{ fontSize: "0.7rem", fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: "0.06em", opacity: "1 !important" }}>
                  {div}
                </MenuItem>,
                ...ts.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                  <MenuItem key={t.id} value={t.id} sx={{ pl: 3, fontSize: "0.85rem" }}>{t.name}</MenuItem>
                ))
              ])}
            </Select>
          </FormControl>

          <TextField
            label="ICS / Calendar URL"
            size="small"
            fullWidth
            required
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="webcal://... or https://..."
            helperText="Paste the GameChanger ICS URL. webcal:// is automatically converted to https://"
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Source</InputLabel>
            <Select value={source} label="Source" onChange={e => setSource(e.target.value)}>
              {SOURCES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={handleSave}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          {saving ? "Saving…" : initial ? "Update" : "Add Subscription"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalendarManagementPage() {
  const [calendars, setCalendars] = useState<TeamCal[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeamCal | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { const [c, t] = await Promise.all([getCalendars(), getTeams()]); setCalendars(c); setTeams(t) }
    catch { setError("Failed to load.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data: any) => {
    try {
      if (editTarget) await updateCal(editTarget.id, data)
      else await createCal(data)
      setDialogOpen(false); setEditTarget(null); await load()
    } catch (e: any) {
      setError(e?.response?.data?.ics_url?.[0] ?? e?.response?.data?.detail ?? "Save failed.")
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove calendar subscription for ${name}?`)) return
    try { await deleteCal(id); await load() }
    catch { setError("Delete failed.") }
  }

  const handleToggleActive = async (cal: TeamCal) => {
    try {
      const updated = await updateCal(cal.id, { is_active: !cal.is_active })
      setCalendars(prev => prev.map(c => c.id === updated.id ? updated : c))
    } catch { setError("Update failed.") }
  }

  const handleSyncAll = async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const r = await syncAll()
      setSyncResult(`Synced ${r.synced} calendar${r.synced !== 1 ? "s" : ""} — ${r.total_created} new, ${r.total_updated} updated events.`)
      await load()
    } catch { setSyncResult("Sync failed — check server logs.") }
    finally { setSyncing(false) }
  }

  // Group by division
  const byDiv: Record<string, TeamCal[]> = {}
  for (const c of calendars) {
    const d = c.division_name ?? "No Division"
    if (!byDiv[d]) byDiv[d] = []
    byDiv[d].push(c)
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Calendar Subscriptions</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Manage ICS feed URLs for each team. Add GameChanger calendar links here, then Sync to pull the latest schedule.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditTarget(null); setDialogOpen(true) }}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          Add Subscription
        </Button>
        <Button variant="outlined" startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
          onClick={handleSyncAll} disabled={syncing} color="inherit">
          {syncing ? "Syncing…" : "Sync All Calendars"}
        </Button>
        <Typography sx={{ fontSize: "0.8rem", color: "#888", alignSelf: "center" }}>
          {calendars.length} subscriptions · {calendars.filter(c => c.is_active).length} active
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {syncResult && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setSyncResult(null)}>{syncResult}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: RED }} /></Box>
      ) : calendars.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 6, textAlign: "center" }}>
          <LinkIcon sx={{ fontSize: 48, color: "#e4e4e7", mb: 1.5 }} />
          <Typography sx={{ fontWeight: 600, color: "#aaa", mb: 0.5 }}>No calendar subscriptions yet</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "#bbb" }}>
            Click "Add Subscription" and paste a team's GameChanger ICS URL.
          </Typography>
        </Paper>
      ) : (
        Object.entries(byDiv).sort(([a], [b]) => a.localeCompare(b)).map(([div, cals]) => (
          <Box key={div} sx={{ mb: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#444" }}>{div}</Typography>
              <Box sx={{ flex: 1, height: "1px", bgcolor: "#e4e4e7" }} />
            </Box>
            <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Team", "Source", "ICS URL", "Last Synced", "Active", ""].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cals.map(c => (
                    <TableRow key={c.id} hover sx={{ opacity: c.is_active ? 1 : 0.5 }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.team_name}</TableCell>
                      <TableCell>
                        <Chip label={SOURCES.find(s => s.value === c.source)?.label ?? c.source}
                          size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#f4f4f5" }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Tooltip title={c.ics_url}>
                          <Typography sx={{ fontSize: "0.75rem", color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                            {c.ics_url}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#888", whiteSpace: "nowrap" }}>
                        {c.last_synced_display}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.is_active} size="small" onChange={() => handleToggleActive(c)}
                          sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2e7d32" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#2e7d32" } }} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Edit URL or source">
                          <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#888" }}
                            onClick={() => { setEditTarget(c); setDialogOpen(true) }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </Button>
                        </Tooltip>
                        <Tooltip title="Remove subscription">
                          <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#ccc", "&:hover": { color: RED } }}
                            onClick={() => handleDelete(c.id, c.team_name)}>
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        ))
      )}

      <CalDialog open={dialogOpen} initial={editTarget} teams={teams}
        onSave={handleSave} onClose={() => { setDialogOpen(false); setEditTarget(null) }} />
    </Box>
  )
}
