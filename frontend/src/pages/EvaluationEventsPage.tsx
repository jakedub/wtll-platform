import { useEffect, useState, useCallback } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  InputLabel, MenuItem, Paper, Select, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import SyncIcon from "@mui/icons-material/Sync"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import LinkIcon from "@mui/icons-material/Link"
import client from "../api/client"
import ContactActions from "../components/ContactActions"

const RED = "#C41230"

const SLOTS_PER_HOUR = [
  { value: 1, label: "1/hr (every 60 min)" },
  { value: 2, label: "2/hr (every 30 min)" },
  { value: 3, label: "3/hr (every 20 min)" },
  { value: 4, label: "4/hr (every 15 min)" },
  { value: 6, label: "6/hr (every 10 min)" },
]

interface EvalEvent {
  id: number; name: string; eval_date: string; start_time: string
  location: string; slots_per_hour: number; total_hours: number
  notes: string; is_public: boolean; program: number | null
  program_name: string | null; slot_count: number; registration_count: number
  interval_minutes: number; division_names?: string[]
}
interface Slot { id: number; slot_time: string; display_time: string; slot_number: number; is_taken: boolean; registrant?: any }

async function getEvents(): Promise<EvalEvent[]> { return (await client.get("/eval-events/")).data ?? [] }
async function createEvent(data: any): Promise<EvalEvent> { return (await client.post("/eval-events/", data)).data }
async function patchEvent(id: number, data: any): Promise<EvalEvent> { return (await client.patch(`/eval-events/${id}/`, data)).data }
async function deleteEvent(id: number): Promise<void> { await client.delete(`/eval-events/${id}/`) }
async function getDetail(id: number) { return (await client.get(`/eval-events/${id}/`)).data }
async function regenerate(id: number) { return (await client.post(`/eval-events/${id}/regenerate/`)).data }
async function deleteReg(id: number): Promise<void> { await client.delete(`/eval-events/registrations/${id}/`) }

function CreateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (e: EvalEvent) => void }) {
  const today = new Date().toISOString().split("T")[0]
  const [form, setForm] = useState({ name: "", eval_date: today, start_time: "09:00", location: "", slots_per_hour: 4, total_hours: 3, notes: "" })
  const [selectedDivIds, setSelectedDivIds] = useState<Set<number>>(new Set())
  const [divGroups, setDivGroups] = useState<Record<string, { id: number; name: string }[]>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) {
      client.get("/divisions-by-program/").then(r => setDivGroups(r.data ?? {})).catch(() => {})
      setSelectedDivIds(new Set())
    }
  }, [open])

  const toggleDiv = (id: number) => setSelectedDivIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const totalSlots = Math.round(form.slots_per_hour * Number(form.total_hours))
  const intervalMin = 60 / form.slots_per_hour

  const handleCreate = async () => {
    setSaving(true); setError(null)
    try {
      onCreated(await createEvent({ ...form, division_ids: Array.from(selectedDivIds) }))
      onClose()
    } catch (e: any) { setError(e?.response?.data?.detail ?? "Create failed.") }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Create Evaluation Event</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Event Name" size="small" fullWidth required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. 2026 Spring Baseball Evaluations" />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Date" type="date" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.eval_date} onChange={e => set("eval_date", e.target.value)} />
            <TextField label="Start Time" type="time" size="small" fullWidth InputLabelProps={{ shrink: true }} value={form.start_time} onChange={e => set("start_time", e.target.value)} />
          </Box>
          <TextField label="Location" size="small" fullWidth value={form.location} onChange={e => set("location", e.target.value)} />

          {/* Division selector grouped by program */}
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
              Divisions <Typography component="span" sx={{ fontWeight: 400, color: "#888", fontSize: "0.78rem" }}>(select which divisions participate)</Typography>
            </Typography>
            {Object.keys(divGroups).length === 0 ? (
              <Typography sx={{ fontSize: "0.8rem", color: "#aaa" }}>Loading divisions…</Typography>
            ) : (
              Object.entries(divGroups).map(([group, divs]) => (
                <Box key={group} sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: RED, mb: 0.75 }}>{group}</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {divs.map(d => {
                      const active = selectedDivIds.has(d.id)
                      return (
                        <Chip key={d.id} label={d.name} size="small" clickable
                          onClick={() => toggleDiv(d.id)}
                          sx={{
                            fontWeight: 600, fontSize: "0.78rem",
                            bgcolor: active ? RED : "#f4f4f5",
                            color: active ? "#fff" : "#555",
                            border: `1px solid ${active ? RED : "#e4e4e7"}`,
                            "&:hover": { bgcolor: active ? "#960E24" : "#ebebeb" },
                          }}
                        />
                      )
                    })}
                  </Box>
                </Box>
              ))
            )}
            {selectedDivIds.size > 0 && (
              <Typography sx={{ fontSize: "0.75rem", color: "#2e7d32", mt: 0.5 }}>
                ✓ {selectedDivIds.size} division{selectedDivIds.size !== 1 ? "s" : ""} selected
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel>Slots per Hour</InputLabel>
              <Select value={form.slots_per_hour} label="Slots per Hour" onChange={e => set("slots_per_hour", Number(e.target.value))}>
                {SLOTS_PER_HOUR.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Total Hours" type="number" size="small" sx={{ flex: 1 }} inputProps={{ min: 0.5, max: 8, step: 0.5 }} value={form.total_hours} onChange={e => set("total_hours", e.target.value)} />
          </Box>
          <Box sx={{ bgcolor: "#f4f4f5", borderRadius: 1.5, p: 1.5, fontSize: "0.82rem", color: "#555" }}>
            📅 This will create <strong>{totalSlots} time slots</strong>, one every <strong>{intervalMin} minutes</strong>.
          </Box>
          <TextField label="Notes (optional)" size="small" fullWidth multiline rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" disabled={saving || !form.name || !form.eval_date} onClick={handleCreate}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          {saving ? "Creating…" : "Create & Generate Slots"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function EventCard({ event, onUpdated, onDeleted }: { event: EvalEvent; onUpdated: (e: EvalEvent) => void; onDeleted: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<{ slots: Slot[]; divisions: any[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [regen, setRegen] = useState(false)
  const [regenMsg, setRegenMsg] = useState<string | null>(null)

  const loadDetail = async () => {
    setLoading(true)
    try { const d = await getDetail(event.id); setDetail({ slots: d.slots, divisions: d.divisions }) }
    finally { setLoading(false) }
  }

  const handleExpand = () => {
    if (!open && !detail) loadDetail()
    setOpen(v => !v)
  }

  const handleRegen = async () => {
    setRegen(true)
    try { const r = await regenerate(event.id); setRegenMsg(r.message); await loadDetail() }
    finally { setRegen(false) }
  }

  const handleDeleteReg = async (regId: number) => {
    if (!confirm("Cancel this registration?")) return
    await deleteReg(regId)
    await loadDetail()
  }

  const publicURL = `${window.location.origin}/public/evaluations/${event.id}`

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden", mb: 2 }}>
      <Box onClick={handleExpand} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, cursor: "pointer", bgcolor: "#fafafa", "&:hover": { bgcolor: "#f4f4f5" } }}>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>{event.name}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>
            {new Date(event.eval_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            {event.location && ` · ${event.location}`}
            {event.start_time && ` · starts ${event.start_time.slice(0,5)}`}
          </Typography>
        </Box>
        {event.division_names && event.division_names.length > 0 && (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {event.division_names.slice(0, 3).map((d: string) => (
              <Chip key={d} label={d} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#f0f0f0", color: "#555" }} />
            ))}
            {event.division_names.length > 3 && (
              <Chip label={`+${event.division_names.length - 3}`} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#f0f0f0", color: "#888" }} />
            )}
          </Box>
        )}
        <Chip label={`${event.slot_count} slots`} size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#f4f4f5" }} />
        <Chip label={`${event.registration_count} registered`} size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: event.registration_count > 0 ? "#e8f5e9" : "#f4f4f5", color: event.registration_count > 0 ? "#2e7d32" : "#888" }} />
        {open ? <ExpandLessIcon sx={{ fontSize: 18, color: "#aaa" }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#aaa" }} />}
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, p: 1.25, bgcolor: "#f4f4f5", border: "1px solid #e4e4e7", borderRadius: 1.5 }}>
            <LinkIcon sx={{ fontSize: 16, color: "#888" }} />
            <Typography sx={{ fontSize: "0.78rem", color: "#555", fontWeight: 600 }}>Public link: </Typography>
            <Typography component="a" href={publicURL} target="_blank" sx={{ fontSize: "0.75rem", color: "#1565c0" }}>{publicURL}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button size="small" variant="outlined" color="inherit" startIcon={regen ? <CircularProgress size={12} /> : <SyncIcon />}
              onClick={handleRegen} disabled={regen}>Regenerate Slots</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
              onClick={async () => { if (!confirm("Delete this evaluation event and all registrations?")) return; await deleteEvent(event.id); onDeleted(event.id) }}>
              Delete Event
            </Button>
          </Box>
          {regenMsg && <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setRegenMsg(null)}>{regenMsg}</Alert>}

          {loading ? <CircularProgress size={20} sx={{ color: RED }} /> : detail && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {["Slot", "Time", "Player", "Division", "Parent", "Phone", "Specialty", ""].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: RED, bgcolor: "#fafafa" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.slots.map(s => (
                    <TableRow key={s.id} sx={{ bgcolor: s.is_taken ? "rgba(46,125,50,0.04)" : "transparent" }}>
                      <TableCell sx={{ fontSize: "0.78rem", color: "#888" }}>#{s.slot_number}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>{s.display_time}</TableCell>
                      <TableCell sx={{ fontSize: "0.82rem" }}>{s.registrant?.player_name ?? <Typography sx={{ color: "#ccc", fontSize: "0.78rem" }}>Open</Typography>}</TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>{s.registrant?.division ?? "—"}</TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>
                        {s.registrant ? (
                          <Box>
                            <Typography sx={{ fontSize: "0.78rem" }}>{s.registrant.parent_name}</Typography>
                            <Typography sx={{ fontSize: "0.7rem", color: "#888" }}>{s.registrant.parent_email}</Typography>
                          </Box>
                        ) : "—"}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>{s.registrant?.parent_phone || "—"}</TableCell>
                      <TableCell>
                        {s.registrant?.specialty_position ? (
                          <Chip label={s.registrant.specialty_position} size="small"
                            sx={{ height: 18, fontSize: "0.65rem", bgcolor: s.registrant.specialty_position === "pitcher" ? "#e3f2fd" : "#fce4ec",
                              color: s.registrant.specialty_position === "pitcher" ? "#1565c0" : RED }} />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {s.registrant && (
                          <Box sx={{ display: "flex", gap: 0.5 }}>
                            <ContactActions name={s.registrant.parent_name} email={s.registrant.parent_email} phone={s.registrant.parent_phone} subject={`WTLL Evaluation — ${s.display_time}`} size={14} />
                            <Tooltip title="Cancel registration">
                              <Box component="span" onClick={() => handleDeleteReg(s.registrant.id)}
                                sx={{ cursor: "pointer", color: "#ccc", display: "flex", "&:hover": { color: RED } }}>
                                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                              </Box>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

export default function EvaluationEventsPage() {
  const [events, setEvents] = useState<EvalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => { setLoading(true); try { setEvents(await getEvents()) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Evaluation Events</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Create evaluation sessions with time slots. Enable public sign-up to let families register online.
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.25, bgcolor: "#f9f9f9", border: "1px solid #e4e4e7", borderRadius: 1.5 }}>
          <LinkIcon sx={{ fontSize: 16, color: "#888" }} />
          <Typography sx={{ fontSize: "0.75rem", color: "#555" }}>Public listing: </Typography>
          <Typography component="a" href={`${window.location.origin}/public/evaluations`} target="_blank"
            sx={{ fontSize: "0.75rem", color: "#1565c0" }}>
            {window.location.origin}/public/evaluations
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>New Evaluation Event</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress sx={{ color: RED }} /></Box>
        : events.length === 0 ? (
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 6, textAlign: "center" }}>
            <Typography sx={{ color: "#aaa" }}>No evaluation events yet.</Typography>
          </Paper>
        ) : events.map(e => (
          <EventCard key={e.id} event={e}
            onUpdated={updated => setEvents(prev => prev.map(x => x.id === updated.id ? updated : x))}
            onDeleted={id => setEvents(prev => prev.filter(x => x.id !== id))}
          />
        ))}
      <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={e => { setEvents(prev => [e, ...prev]); setCreateOpen(false) }} />
    </Box>
  )
}
