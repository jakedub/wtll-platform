import { useEffect, useState, useMemo } from "react"
import {
  Box, Typography, IconButton, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, TextField, MenuItem,
  Tooltip, CircularProgress,
} from "@mui/material"
import AddIcon       from "@mui/icons-material/Add"
import EditIcon      from "@mui/icons-material/Edit"
import DeleteIcon    from "@mui/icons-material/Delete"
import { Notice, RED } from "./shared"
import {
  CalendarEvent, CalendarColor,
  CALENDAR_COLOR_OPTIONS,
  getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
} from "../../api/boardHub"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  red: RED, gold: "#d97706", green: "#2e7d32", blue: "#1565c0", purple: "#6a1b9a", orange: "#c2410c",
}

const MONTH_ORDER = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

function monthSortKey(monthYear: string) {
  const [m, y] = monthYear.split(" ")
  const mi = MONTH_ORDER.indexOf(m)
  return (parseInt(y) * 12) + (mi >= 0 ? mi : 0)
}

// ─── Event Edit Dialog ────────────────────────────────────────────────────────

interface EventDialogProps {
  open:      boolean
  initial?:  Partial<CalendarEvent>
  onClose:   () => void
  onSave:    (data: Omit<CalendarEvent, "id">) => Promise<void>
  onDelete?: () => Promise<void>
}

const EMPTY_EVENT = (): Omit<CalendarEvent, "id"> => ({
  month_year: "", phase: "", text: "", owner: "", color: "red" as CalendarColor,
  year: new Date().getFullYear(), sort_order: 0,
})

function EventDialog({ open, initial, onClose, onSave, onDelete }: EventDialogProps) {
  const [form, setForm] = useState(EMPTY_EVENT())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY_EVENT(), ...initial } : EMPTY_EVENT())
      setConfirmDelete(false)
    }
  }, [open, initial])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.text.trim() || !form.month_year.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setSaving(true)
    try { await onDelete() } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?.id ? "Edit Event" : "Add Event"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Month / Year" size="small" required
            placeholder="e.g. June 2026"
            value={form.month_year} onChange={set("month_year")}
          />
          <TextField
            label="Year" size="small" type="number"
            value={form.year} onChange={set("year")}
          />
        </Box>
        <TextField
          label="Phase label" size="small"
          placeholder="e.g. Fall Ball Launch"
          value={form.phase} onChange={set("phase")}
        />
        <TextField
          label="Event text" size="small" required multiline rows={2}
          value={form.text} onChange={set("text")}
        />
        <TextField
          label="Owner(s)" size="small"
          placeholder="e.g. VP Baseball · Equipment Manager"
          value={form.owner} onChange={set("owner")}
        />
        <TextField
          select label="Color" size="small"
          value={form.color}
          onChange={e => setForm(f => ({ ...f, color: e.target.value as CalendarColor }))}
        >
          {CALENDAR_COLOR_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: o.hex }} />
                {o.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <Box>
          {onDelete && !confirmDelete && (
            <Button color="error" size="small" onClick={() => setConfirmDelete(true)}>Delete</Button>
          )}
          {confirmDelete && (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.8rem", color: "#c62828" }}>Sure?</Typography>
              <Button color="error" size="small" onClick={handleDelete} disabled={saving}>Yes, delete</Button>
              <Button size="small" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.text.trim() || !form.month_year.trim()}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e28" } }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarTab() {
  const [events,   setEvents]   = useState<CalendarEvent[]>([])
  const [loading,  setLoading]  = useState(true)
  const [yearFilter, setYearFilter] = useState<number | null>(null)

  // Dialog state
  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [dialogInitial, setDialogInitial] = useState<Partial<CalendarEvent> | undefined>(undefined)
  const [editingId,     setEditingId]     = useState<number | null>(null)
  // For "add event" with a pre-filled month
  const [preMonth,      setPreMonth]      = useState<{ month_year: string; phase: string; year: number } | null>(null)

  const load = async () => {
    setLoading(true)
    try { setEvents(await getCalendarEvents()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Derive available years
  const years = useMemo(() => {
    const s = new Set(events.map(e => e.year))
    return Array.from(s).sort()
  }, [events])

  // Filter by selected year
  const filtered = useMemo(() =>
    yearFilter ? events.filter(e => e.year === yearFilter) : events,
    [events, yearFilter]
  )

  // Group into months, sorted chronologically
  const months = useMemo(() => {
    const map = new Map<string, { phase: string; year: number; events: CalendarEvent[] }>()
    for (const ev of filtered) {
      if (!map.has(ev.month_year)) map.set(ev.month_year, { phase: ev.phase, year: ev.year, events: [] })
      map.get(ev.month_year)!.events.push(ev)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => monthSortKey(a) - monthSortKey(b))
      .map(([month_year, { phase, year, events: evs }]) => ({ month_year, phase, year, events: evs }))
  }, [filtered])

  const openAdd = (monthYear: string, phase: string, year: number) => {
    setEditingId(null)
    setPreMonth({ month_year: monthYear, phase, year })
    setDialogInitial({ month_year: monthYear, phase, year, color: "blue" })
    setDialogOpen(true)
  }

  const openAddGlobal = () => {
    setEditingId(null)
    setPreMonth(null)
    setDialogInitial(undefined)
    setDialogOpen(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    setEditingId(ev.id)
    setDialogInitial(ev)
    setDialogOpen(true)
  }

  const handleSave = async (data: Omit<CalendarEvent, "id">) => {
    if (editingId !== null) {
      const updated = await updateCalendarEvent(editingId, data)
      setEvents(prev => prev.map(e => e.id === editingId ? updated : e))
    } else {
      const created = await createCalendarEvent(data)
      setEvents(prev => [...prev, created])
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (editingId === null) return
    await deleteCalendarEvent(editingId)
    setEvents(prev => prev.filter(e => e.id !== editingId))
    setDialogOpen(false)
  }

  return (
    <Box>
      {/* Year filter + add button */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Chip
          label="All Years"
          size="small"
          onClick={() => setYearFilter(null)}
          sx={yearFilter === null
            ? { bgcolor: RED, color: "#fff", fontWeight: 700, fontSize: "0.78rem" }
            : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.78rem", "&:hover": { bgcolor: "#e8e8eb" } }}
        />
        {years.map(y => (
          <Chip
            key={y}
            label={String(y)}
            size="small"
            onClick={() => setYearFilter(y)}
            sx={yearFilter === y
              ? { bgcolor: RED, color: "#fff", fontWeight: 700, fontSize: "0.78rem" }
              : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.78rem", "&:hover": { bgcolor: "#e8e8eb" } }}
          />
        ))}
        <Box sx={{ ml: "auto" }}>
          <Button
            startIcon={<AddIcon />} size="small" variant="outlined"
            onClick={openAddGlobal}
            sx={{ color: RED, borderColor: RED, "&:hover": { borderColor: RED, bgcolor: "rgba(196,18,48,0.06)" }, fontWeight: 700, textTransform: "none", fontSize: "0.8rem" }}
          >
            Add Event
          </Button>
        </Box>
      </Box>

      <Notice color="gold">
        <strong>Key Fixed Dates: </strong>
        Opening Day = 2nd Saturday of April &nbsp;·&nbsp; Playoffs = 1st week of June &nbsp;·&nbsp;
        Championship = Saturday of first full week of June &nbsp;·&nbsp; No games Memorial Day &nbsp;·&nbsp;
        All Star paperwork due before end of school year &nbsp;·&nbsp; Fall Ball ends October 1
      </Notice>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      )}

      {!loading && (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 2 }}>
          {months.map(m => (
            <Box key={m.month_year} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
              {/* Month header */}
              <Box sx={{
                bgcolor: RED, color: "#fff", px: 2, py: 1.25,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{m.month_year}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography sx={{ fontSize: "0.68rem", opacity: 0.85 }}>{m.phase}</Typography>
                  <Tooltip title="Add event to this month">
                    <IconButton size="small" onClick={() => openAdd(m.month_year, m.phase, m.year)}
                      sx={{ color: "#fff", opacity: 0.75, "&:hover": { opacity: 1 }, p: 0.25, ml: 0.5 }}>
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Events */}
              <Box sx={{ p: 1.5 }}>
                {m.events
                  .slice()
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((ev, i) => (
                  <Box
                    key={ev.id}
                    sx={{
                      display: "flex", gap: 1, py: 0.6,
                      borderBottom: i < m.events.length - 1 ? "1px solid #f4f4f5" : "none",
                      "&:hover .event-actions": { opacity: 1 },
                    }}
                  >
                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: DOT_COLORS[ev.color] ?? "#999", flexShrink: 0, mt: "5px" }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: "0.8rem", lineHeight: 1.45 }}>{ev.text}</Typography>
                      <Typography sx={{ fontSize: "0.68rem", color: "#888", mt: 0.25 }}>{ev.owner}</Typography>
                    </Box>
                    <Box className="event-actions" sx={{ opacity: 0, transition: "opacity 0.15s", flexShrink: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(ev)} sx={{ p: 0.5 }}>
                          <EditIcon sx={{ fontSize: 13, color: "#888" }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}

                {m.events.length === 0 && (
                  <Typography sx={{ fontSize: "0.78rem", color: "#aaa", py: 1, textAlign: "center" }}>
                    No events — click + to add
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <EventDialog
        open={dialogOpen}
        initial={dialogInitial}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingId !== null ? handleDelete : undefined}
      />
    </Box>
  )
}
