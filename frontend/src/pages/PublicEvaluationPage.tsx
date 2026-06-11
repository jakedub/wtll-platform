/**
 * Public evaluation sign-up page.
 * UX: Division cards (collapsed) → expand → time slot chips → registration dialog.
 * No login required. No delete buttons.
 */
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog,
  DialogActions, DialogContent, DialogTitle, FormControl,
  FormControlLabel, InputLabel, MenuItem, Paper, Radio, RadioGroup,
  Select, TextField, Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import PublicNav from "../components/PublicNav"
import client from "../api/client"

const RED = "#C41230"
const SPECIALTY_DIVISIONS = ["majors", "aaa", "softball majors"]

interface SlotInfo { id: number; slot_time: string; display_time: string; slot_number: number; is_taken: boolean }
interface DivInfo { id: number; name: string; specialty_eligible: boolean }
interface EventInfo { id: number; name: string; eval_date: string; start_time: string; location: string; notes: string; slots: SlotInfo[]; divisions: DivInfo[]; available_count: number }

async function getPublicEvent(id: string): Promise<EventInfo | null> {
  const events = (await client.get("/eval-events/public/")).data ?? []
  return events.find((e: EventInfo) => String(e.id) === id) ?? null
}

async function register(payload: any) {
  return (await client.post("/eval-events/register/", payload)).data
}

// ── Division card ─────────────────────────────────────────────────────────────

function DivisionCard({
  division, slots, onSelectSlot,
}: {
  division: DivInfo
  slots: SlotInfo[]
  onSelectSlot: (slot: SlotInfo, div: DivInfo) => void
}) {
  const [open, setOpen] = useState(false)
  const available = slots.filter(s => !s.is_taken)

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden", mb: 1.5 }}>
      <Box onClick={() => setOpen(v => !v)}
        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, cursor: "pointer", "&:hover": { bgcolor: "#fafafa" } }}>
        <Box sx={{ width: 4, height: 18, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", flex: 1 }}>{division.name}</Typography>
        <Chip
          label={available.length > 0 ? `${available.length} open` : "Full"}
          size="small"
          sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700,
            bgcolor: available.length > 0 ? "#e8f5e9" : "#fdecea",
            color: available.length > 0 ? "#2e7d32" : RED }}
        />
        {open ? <ExpandLessIcon sx={{ fontSize: 18, color: "#aaa" }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#aaa" }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2.5, pb: 2 }}>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 1.25 }}>
            Select an available time slot:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {slots.map(slot => (
              <Chip
                key={slot.id}
                label={slot.display_time}
                onClick={slot.is_taken ? undefined : () => onSelectSlot(slot, division)}
                disabled={slot.is_taken}
                sx={{
                  fontWeight: 600, fontSize: "0.82rem", height: 32, px: 0.5,
                  bgcolor: slot.is_taken ? "#f4f4f5" : "#fff",
                  color: slot.is_taken ? "#bbb" : "#111",
                  border: `1px solid ${slot.is_taken ? "#e4e4e7" : "#C41230"}`,
                  cursor: slot.is_taken ? "default" : "pointer",
                  "&:hover:not(.Mui-disabled)": { bgcolor: `${RED}12` },
                  textDecoration: slot.is_taken ? "line-through" : "none",
                }}
              />
            ))}
          </Box>
          {division.specialty_eligible && (
            <Typography sx={{ fontSize: "0.72rem", color: "#888", mt: 1, fontStyle: "italic" }}>
              ⭐ Pitcher/Catcher specialty designation available for this division
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

// ── Registration dialog ───────────────────────────────────────────────────────

function RegDialog({
  open, slot, division, eventId,
  onClose, onRegistered,
}: {
  open: boolean
  slot: SlotInfo | null
  division: DivInfo | null
  eventId: number
  onClose: () => void
  onRegistered: (slotId: number) => void
}) {
  const [form, setForm] = useState({ parent_name: "", parent_email: "", parent_phone: "", player_name: "", specialty_position: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) setForm({ parent_name: "", parent_email: "", parent_phone: "", player_name: "", specialty_position: "", notes: "" })
    setError(null)
  }, [open])

  const handleSubmit = async () => {
    if (!form.parent_name.trim() || !form.player_name.trim()) { setError("Parent name and player name are required."); return }
    setSaving(true); setError(null)
    try {
      await register({
        event_id: eventId,
        slot_id: slot!.id,
        division_id: division!.id,
        ...form,
      })
      onRegistered(slot!.id)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Registration failed. That slot may have just been taken.")
    } finally { setSaving(false) }
  }

  const isSpecialtyDiv = division && SPECIALTY_DIVISIONS.includes(division.name.toLowerCase())

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Sign Up for Evaluation
        {slot && division && (
          <Typography sx={{ fontSize: "0.8rem", color: "#777", fontWeight: 400 }}>
            {division.name} · {slot.display_time}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Player Name" size="small" fullWidth required value={form.player_name} onChange={e => set("player_name", e.target.value)} placeholder="First and last name" />

          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", mt: 0.5 }}>Parent / Guardian</Typography>

          <TextField label="Parent/Guardian Name" size="small" fullWidth required value={form.parent_name} onChange={e => set("parent_name", e.target.value)} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Email" type="email" size="small" sx={{ flex: 1 }} value={form.parent_email} onChange={e => set("parent_email", e.target.value)} />
            <TextField label="Phone" type="tel" size="small" sx={{ flex: 1 }} value={form.parent_phone} onChange={e => set("parent_phone", e.target.value)} placeholder="317-555-1234" />
          </Box>

          {isSpecialtyDiv && (
            <Box sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, mb: 0.75 }}>Specialty Position (optional)</Typography>
              <RadioGroup row value={form.specialty_position} onChange={e => set("specialty_position", e.target.value)}>
                <FormControlLabel value="" control={<Radio size="small" />} label={<Typography sx={{ fontSize: "0.82rem" }}>None</Typography>} />
                <FormControlLabel value="pitcher" control={<Radio size="small" />} label={<Typography sx={{ fontSize: "0.82rem" }}>Pitcher</Typography>} />
                <FormControlLabel value="catcher" control={<Radio size="small" />} label={<Typography sx={{ fontSize: "0.82rem" }}>Catcher</Typography>} />
              </RadioGroup>
              <Typography sx={{ fontSize: "0.72rem", color: "#888", mt: 0.5 }}>
                Select if your player is a pitcher or catcher so evaluators can note it.
              </Typography>
            </Box>
          )}

          <TextField label="Notes (optional)" size="small" fullWidth multiline rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Anything evaluators should know..." />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          {saving ? "Registering…" : "Confirm Registration"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main public page ──────────────────────────────────────────────────────────

export default function PublicEvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null)
  const [selectedDiv, setSelectedDiv] = useState<DivInfo | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getPublicEvent(id)
      .then(e => { setEvent(e); if (e) setSlots(e.slots) })
      .catch(() => setEvent(null))
      .finally(() => setLoading(false))
  }, [id])

  const handleRegistered = (slotId: number) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, is_taken: true } : s))
    setSuccess(`You're registered! Check your email for confirmation.`)
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
        <PublicNav />
        <Box sx={{ display: "flex", justifyContent: "center", pt: 10 }}><CircularProgress sx={{ color: RED }} /></Box>
      </Box>
    )
  }

  if (!event) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
        <PublicNav />
        <Box sx={{ maxWidth: 600, mx: "auto", px: 3, py: 8, textAlign: "center" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#555", mb: 1 }}>Evaluation Not Available</Typography>
          <Typography sx={{ color: "#888" }}>This evaluation sign-up is not currently open or does not exist.</Typography>
        </Box>
      </Box>
    )
  }

  const evalDate = new Date(event.eval_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f4f5" }}>
      <PublicNav />
      <Box sx={{ maxWidth: 760, mx: "auto", px: 2, py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#111", mb: 0.5 }}>{event.name}</Typography>
          <Typography sx={{ color: "#555", fontSize: "0.9rem" }}>
            📅 {evalDate}
            {event.location && <> · 📍 {event.location}</>}
          </Typography>
          {event.notes && <Typography sx={{ color: "#777", fontSize: "0.85rem", mt: 0.5, fontStyle: "italic" }}>{event.notes}</Typography>}
        </Box>

        {success && (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#888", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Select your division, then choose a time slot:
        </Typography>

        {event.divisions.map(div => (
          <DivisionCard
            key={div.id}
            division={div}
            slots={slots}
            onSelectSlot={(slot, d) => { setSelectedSlot(slot); setSelectedDiv(d) }}
          />
        ))}

        <Typography sx={{ fontSize: "0.75rem", color: "#bbb", mt: 2, textAlign: "center" }}>
          Slots marked with strikethrough are already taken. Refresh the page to see the latest availability.
        </Typography>
      </Box>

      <RegDialog
        open={!!selectedSlot}
        slot={selectedSlot}
        division={selectedDiv}
        eventId={event.id}
        onClose={() => { setSelectedSlot(null); setSelectedDiv(null) }}
        onRegistered={handleRegistered}
      />
    </Box>
  )
}
