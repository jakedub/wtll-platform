import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, InputLabel,
  MenuItem, Paper, Select, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography, FormControlLabel,
} from "@mui/material"
import PublicLinkBar from "../components/PublicLinkBar"
import { useAppSettings } from "../context/AppSettingsContext"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import LockIcon from "@mui/icons-material/Lock"
import { getDivisions, type Division } from "../api/divisions"
import client from "../api/client"

const RED = "#C41230"

interface EvalWindow {
  id: number; season_year: number; division: number | null; division_name: string
  eval_date: string | null; eval_location: string; eval_time: string
  is_open: boolean; notes: string; signup_count: number
}

interface EvalSignup {
  id: number; season_year: number; division: number | null; division_name: string | null
  player_first_name: string; player_last_name: string; player_dob: string | null
  parent_name: string; parent_email: string; parent_phone: string
  notes: string; signed_up_at: string
}

async function getWindows(year?: number): Promise<EvalWindow[]> {
  const res = await client.get("/eval-signups/windows/", { params: year ? { year } : {} })
  return res.data ?? []
}
async function createWindow(data: Partial<EvalWindow>): Promise<EvalWindow> {
  const res = await client.post("/eval-signups/windows/", data); return res.data
}
async function updateWindow(id: number, data: Partial<EvalWindow>): Promise<EvalWindow> {
  const res = await client.patch(`/eval-signups/windows/${id}/`, data); return res.data
}
async function deleteWindow(id: number): Promise<void> {
  await client.delete(`/eval-signups/windows/${id}/`)
}
async function getSignups(year?: number, division?: number): Promise<EvalSignup[]> {
  const res = await client.get("/eval-signups/", { params: { ...(year ? { year } : {}), ...(division ? { division } : {}) } })
  return res.data ?? []
}
async function deleteSignup(id: number): Promise<void> {
  await client.delete(`/eval-signups/${id}/`)
}
async function addSignup(data: Partial<EvalSignup>): Promise<EvalSignup> {
  const res = await client.post("/eval-signups/", data); return res.data
}

// ── Window dialog ──────────────────────────────────────────────────────────────

function WindowDialog({ open, initial, divisions, year, onSave, onClose }: {
  open: boolean; initial: Partial<EvalWindow> | null; divisions: Division[]
  year: number; onSave: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState<any>({})
  useEffect(() => {
    setForm(initial ? { ...initial } : { season_year: year, division: "", is_open: false, eval_location: "", eval_time: "", eval_date: "", notes: "" })
  }, [initial, open, year])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?.id ? "Edit Sign-up Window" : "Create Sign-up Window"}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Season Year" type="number" size="small" sx={{ flex: 1 }}
              value={form.season_year ?? year} onChange={e => set("season_year", parseInt(e.target.value))} />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Division</InputLabel>
              <Select value={form.division ?? ""} label="Division" onChange={e => set("division", e.target.value || null)}>
                <MenuItem value="">All Divisions</MenuItem>
                {divisions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Evaluation Date" type="date" size="small" sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }} value={form.eval_date ?? ""} onChange={e => set("eval_date", e.target.value || null)} />
            <TextField label="Time" size="small" sx={{ flex: 1 }} placeholder="e.g. 9:00 AM – 12:00 PM"
              value={form.eval_time ?? ""} onChange={e => set("eval_time", e.target.value)} />
          </Box>
          <TextField label="Location" size="small" fullWidth value={form.eval_location ?? ""} onChange={e => set("eval_location", e.target.value)} />
          <TextField label="Notes (shown on sign-up form)" size="small" fullWidth multiline rows={2}
            value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
          <FormControlLabel
            control={<Switch checked={!!form.is_open} onChange={e => set("is_open", e.target.checked)}
              sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#2e7d32" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#2e7d32" } }} />}
            label={<Typography sx={{ fontSize: "0.85rem" }}>Mark window as active</Typography>}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Add signup dialog ─────────────────────────────────────────────────────────

function AddSignupDialog({ open, divisions, year, onSave, onClose }: {
  open: boolean; divisions: Division[]; year: number
  onSave: (d: any) => void; onClose: () => void
}) {
  const [form, setForm] = useState<any>({ season_year: year })
  useEffect(() => { if (open) setForm({ season_year: year }) }, [open, year])
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Evaluation Sign-Up</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Player First Name" size="small" sx={{ flex: 1 }} required
              value={form.player_first_name ?? ""} onChange={e => set("player_first_name", e.target.value)} />
            <TextField label="Player Last Name" size="small" sx={{ flex: 1 }} required
              value={form.player_last_name ?? ""} onChange={e => set("player_last_name", e.target.value)} />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Date of Birth" type="date" size="small" sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }} value={form.player_dob ?? ""} onChange={e => set("player_dob", e.target.value || null)} />
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Division</InputLabel>
              <Select value={form.division ?? ""} label="Division" onChange={e => set("division", e.target.value || null)}>
                <MenuItem value="">—</MenuItem>
                {divisions.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField label="Parent/Guardian Name" size="small" fullWidth
            value={form.parent_name ?? ""} onChange={e => set("parent_name", e.target.value)} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Email" size="small" sx={{ flex: 1 }}
              value={form.parent_email ?? ""} onChange={e => set("parent_email", e.target.value)} />
            <TextField label="Phone" size="small" sx={{ flex: 1 }}
              value={form.parent_phone ?? ""} onChange={e => set("parent_phone", e.target.value)} />
          </Box>
          <TextField label="Notes" size="small" fullWidth value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.player_first_name || !form.player_last_name}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EvaluationSignupPage() {
  const { settings } = useAppSettings()
  const [windows, setWindows] = useState<EvalWindow[]>([])
  const [signups, setSignups] = useState<EvalSignup[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [windowDialog, setWindowDialog] = useState(false)
  const [editWindow, setEditWindow] = useState<Partial<EvalWindow> | null>(null)
  const [signupDialog, setSignupDialog] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [w, s, d] = await Promise.all([getWindows(year), getSignups(year), getDivisions()])
      setWindows(w); setSignups(s); setDivisions(d)
    } catch { setError("Failed to load.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [year])

  const handleToggleOpen = async (w: EvalWindow) => {
    try { await updateWindow(w.id, { is_open: !w.is_open }); await load() }
    catch { setError("Failed to update window.") }
  }

  const handleSaveWindow = async (data: any) => {
    try {
      if (editWindow?.id) await updateWindow(editWindow.id, data)
      else await createWindow(data)
      setWindowDialog(false); setEditWindow(null); await load()
    } catch { setError("Save failed.") }
  }

  const handleDeleteWindow = async (id: number) => {
    if (!confirm("Delete this sign-up window?")) return
    try { await deleteWindow(id); await load() } catch { setError("Delete failed.") }
  }

  const handleAddSignup = async (data: any) => {
    try { await addSignup(data); setSignupDialog(false); await load() }
    catch { setError("Failed to add sign-up.") }
  }

  const handleDeleteSignup = async (id: number) => {
    if (!confirm("Remove this sign-up?")) return
    try { await deleteSignup(id); await load() } catch { setError("Delete failed.") }
  }

  return (
    <Box>
      {/* Public link bar */}
      <PublicLinkBar
        publicPath="/public/evaluations"
        live={settings.signups.evaluation}
        secondaryColor={settings.secondaryColor}
      />

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Evaluation Sign-Ups</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Internal sign-up management for player evaluations. Track who is signed up by division and year.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={e => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" color="inherit"
          onClick={() => { setSignupDialog(true) }} startIcon={<AddIcon />}>Add Sign-Up</Button>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditWindow(null); setWindowDialog(true) }}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>New Window</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Sign-up windows */}
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Sign-up Windows</Typography>
      {windows.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 4, textAlign: "center", mb: 3 }}>
          <Typography sx={{ color: "#aaa" }}>No sign-up windows for {year}. Create one to allow registrations.</Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2, mb: 3 }}>
          {windows.map(w => (
            <Paper key={w.id} elevation={0} sx={{ border: `1px solid ${w.is_open ? "#2e7d32" : "#e4e4e7"}`, borderRadius: 2, p: 2, position: "relative" }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{w.division_name}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{w.season_year}</Typography>
                </Box>
                <Chip
                  label={w.is_open ? "Open" : "Closed"}
                  size="small"
                  icon={w.is_open ? <LockOpenIcon sx={{ fontSize: 12 }} /> : <LockIcon sx={{ fontSize: 12 }} />}
                  onClick={() => handleToggleOpen(w)}
                  sx={{
                    bgcolor: w.is_open ? "#e8f5e9" : "#f4f4f5",
                    color: w.is_open ? "#2e7d32" : "#888",
                    fontWeight: 700, cursor: "pointer",
                    "& .MuiChip-icon": { color: "inherit" },
                  }}
                />
              </Box>
              {w.eval_date && <Typography sx={{ fontSize: "0.8rem", mb: 0.25 }}>📅 {w.eval_date}{w.eval_time ? ` · ${w.eval_time}` : ""}</Typography>}
              {w.eval_location && <Typography sx={{ fontSize: "0.8rem", color: "#555", mb: 0.25 }}>📍 {w.eval_location}</Typography>}
              <Typography sx={{ fontSize: "0.78rem", color: RED, fontWeight: 600, mt: 0.5 }}>{w.signup_count} signed up</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 1.5 }}>
                <Button size="small" onClick={() => { setEditWindow(w); setWindowDialog(true) }}
                  sx={{ minWidth: 0, p: 0.5, color: "#888" }}><EditIcon sx={{ fontSize: 15 }} /></Button>
                <Button size="small" onClick={() => handleDeleteWindow(w.id)}
                  sx={{ minWidth: 0, p: 0.5, color: "#ccc", "&:hover": { color: RED } }}>
                  <DeleteOutlineIcon sx={{ fontSize: 15 }} /></Button>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Sign-ups table */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>Sign-ups</Typography>
        <Chip label={signups.length} size="small" sx={{ bgcolor: "#f4f4f5", fontWeight: 700, height: 20, fontSize: "0.72rem" }} />
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress sx={{ color: RED }} /></Box>
      ) : signups.length === 0 ? (
        <Typography sx={{ color: "#aaa", py: 2, fontSize: "0.875rem" }}>No sign-ups for {year} yet.</Typography>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Player", "DOB", "Division", "Parent", "Email", "Phone", "Signed Up", ""].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {signups.map(s => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{s.player_last_name}, {s.player_first_name}</TableCell>
                    <TableCell sx={{ fontSize: "0.8rem" }}>{s.player_dob ?? "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.8rem" }}>{s.division_name ?? "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.8rem" }}>{s.parent_name || "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#555" }}>{s.parent_email || "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem" }}>{s.parent_phone || "—"}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "#888" }}>{new Date(s.signed_up_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Tooltip title="Remove">
                        <Button size="small" sx={{ minWidth: 0, p: 0.4, color: "#ccc", "&:hover": { color: RED } }}
                          onClick={() => handleDeleteSignup(s.id)}>
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} /></Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}


      <WindowDialog open={windowDialog} initial={editWindow} divisions={divisions} year={year}
        onSave={handleSaveWindow} onClose={() => { setWindowDialog(false); setEditWindow(null) }} />
      <AddSignupDialog open={signupDialog} divisions={divisions} year={year}
        onSave={handleAddSignup} onClose={() => setSignupDialog(false)} />
    </Box>
  )
}
