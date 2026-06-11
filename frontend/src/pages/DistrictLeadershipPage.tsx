/**
 * District Leadership
 * Manage district and HQ contacts — grouped by district number, with HQ at top.
 */
import { useEffect, useState } from "react"
import {
  Box, Typography, Paper, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Checkbox, MenuItem,
  CircularProgress, Alert, Chip, Divider,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import BusinessIcon from "@mui/icons-material/Business"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import EmailIcon from "@mui/icons-material/Email"
import PhoneIcon from "@mui/icons-material/Phone"
import client from "../api/client"

const RED = "#C41230"

interface DistrictLeader {
  id: number
  district_number: number
  is_hq: boolean
  name: string
  position: string
  contact_phone: string
  contact_email: string
}

interface Position {
  value: string
  label: string
}

const EMPTY_FORM = {
  district_number: "" as number | "",
  is_hq: false,
  name: "",
  position: "",
  contact_phone: "",
  contact_email: "",
}

type FormState = typeof EMPTY_FORM

export default function DistrictLeadershipPage() {
  const [leaders, setLeaders]       = useState<DistrictLeader[]>([])
  const [positions, setPositions]   = useState<Position[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Dialog
  const [open, setOpen]             = useState(false)
  const [editing, setEditing]       = useState<DistrictLeader | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<DistrictLeader | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([
      client.get("/district-leaders/"),
      client.get("/district-leaders/positions/"),
    ])
      .then(([lr, pr]) => {
        setLeaders(lr.data)
        setPositions(pr.data)
      })
      .catch(() => setError("Failed to load district leaders."))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // ── Group leaders ─────────────────────────────────────────────────────────────
  const hqLeaders = leaders.filter(l => l.is_hq)
  const districtMap = leaders
    .filter(l => !l.is_hq)
    .reduce<Record<number, DistrictLeader[]>>((acc, l) => {
      if (!acc[l.district_number]) acc[l.district_number] = []
      acc[l.district_number].push(l)
      return acc
    }, {})
  const districtNums = Object.keys(districtMap)
    .map(Number)
    .sort((a, b) => a - b)

  // ── Dialog helpers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSaveError(null)
    setOpen(true)
  }

  const openEdit = (l: DistrictLeader) => {
    setEditing(l)
    setForm({
      district_number: l.district_number,
      is_hq: l.is_hq,
      name: l.name,
      position: l.position,
      contact_phone: l.contact_phone,
      contact_email: l.contact_email,
    })
    setSaveError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (form.district_number === "" || form.district_number === null) {
      setSaveError("District number is required.")
      return
    }
    setSaving(true); setSaveError(null)
    try {
      const payload = { ...form, district_number: Number(form.district_number) }
      if (editing) {
        await client.patch(`/district-leaders/${editing.id}/`, payload)
      } else {
        await client.post("/district-leaders/", payload)
      }
      setOpen(false)
      load()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === "object" && !data.detail) {
        const msgs = Object.entries(data)
          .map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ")
        setSaveError(msgs)
      } else {
        setSaveError(data?.detail ?? "Save failed.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await client.delete(`/district-leaders/${deleteTarget.id}/`)
      setDeleteTarget(null)
      load()
    } catch {
      // leave dialog open on failure
    } finally {
      setDeleting(false)
    }
  }

  const set = (field: keyof FormState, value: unknown) =>
    setForm(f => ({ ...f, [field]: value }))

  // ── Card for a single leader ──────────────────────────────────────────────────
  const LeaderCard = ({ l }: { l: DistrictLeader }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        py: 1.5,
        px: 2,
        borderBottom: "1px solid #f0f0f0",
        "&:last-child": { borderBottom: "none" },
        "&:hover .leader-actions": { opacity: 1 },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {l.name || <span style={{ color: "#aaa", fontStyle: "italic" }}>Unnamed</span>}
          </Typography>
          {l.position && (
            <Chip
              label={l.position}
              size="small"
              sx={{
                fontSize: "0.7rem",
                height: 20,
                bgcolor: l.is_hq ? "#fff3e0" : "#e3f2fd",
                color: l.is_hq ? "#e65100" : "#1565c0",
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2.5, mt: 0.5, flexWrap: "wrap" }}>
          {l.contact_email && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <EmailIcon sx={{ fontSize: 13, color: "#aaa" }} />
              <Typography
                component="a"
                href={`mailto:${l.contact_email}`}
                sx={{ fontSize: "0.78rem", color: "#555", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                {l.contact_email}
              </Typography>
            </Box>
          )}
          {l.contact_phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <PhoneIcon sx={{ fontSize: 13, color: "#aaa" }} />
              <Typography
                component="a"
                href={`tel:${l.contact_phone}`}
                sx={{ fontSize: "0.78rem", color: "#555", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                {l.contact_phone}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Box className="leader-actions" sx={{ display: "flex", gap: 0.5, opacity: 0, transition: "opacity 0.15s" }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(l)} sx={{ color: "#888" }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => setDeleteTarget(l)} sx={{ color: "#888", "&:hover": { color: RED } }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  // ── Section card ──────────────────────────────────────────────────────────────
  const SectionCard = ({
    title,
    icon,
    color,
    count,
    children,
  }: {
    title: string
    icon: React.ReactNode
    color: string
    count: number
    children: React.ReactNode
  }) => (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, mb: 2, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 1.5, bgcolor: "#1c1c1e", display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ color, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.92rem", flex: 1 }}>{title}</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
          {count} contact{count !== 1 ? "s" : ""}
        </Typography>
      </Box>
      {count === 0 ? (
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "#bbb", fontStyle: "italic" }}>No contacts yet.</Typography>
        </Box>
      ) : children}
    </Paper>
  )

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#111", lineHeight: 1.1 }}>
              District Leadership
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>
              District and HQ contacts
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          Add Contact
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <>
          {/* HQ section */}
          <SectionCard
            title="Little League HQ"
            icon={<BusinessIcon fontSize="small" />}
            color="#e65100"
            count={hqLeaders.length}
          >
            {hqLeaders.map(l => <LeaderCard key={l.id} l={l} />)}
          </SectionCard>

          {/* District sections */}
          {districtNums.map(num => (
            <SectionCard
              key={num}
              title={`District ${num}`}
              icon={<LocationOnIcon fontSize="small" />}
              color="#1565c0"
              count={districtMap[num].length}
            >
              {districtMap[num].map(l => <LeaderCard key={l.id} l={l} />)}
            </SectionCard>
          ))}

          {leaders.length === 0 && (
            <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 5, textAlign: "center" }}>
              <Typography sx={{ color: "#888", mb: 1 }}>No district contacts yet.</Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={openAdd}
                sx={{ borderColor: RED, color: RED, "&:hover": { borderColor: "#a80f28", bgcolor: "#fff5f7" }, textTransform: "none" }}
              >
                Add First Contact
              </Button>
            </Paper>
          )}
        </>
      )}

      {/* ── Add/Edit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? "Edit Contact" : "Add District Contact"}
        </DialogTitle>
        <DialogContent dividers>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
            <TextField
              label="District Number"
              type="number"
              required
              value={form.district_number}
              onChange={e => set("district_number", e.target.value === "" ? "" : Number(e.target.value))}
              sx={{ width: 160 }}
              size="small"
              inputProps={{ min: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_hq}
                  onChange={e => set("is_hq", e.target.checked)}
                  sx={{ color: RED, "&.Mui-checked": { color: RED } }}
                />
              }
              label={<Typography sx={{ fontSize: "0.875rem" }}>Little League HQ contact</Typography>}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          <TextField
            label="Name"
            fullWidth
            value={form.name}
            onChange={e => set("name", e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />

          <TextField
            label="Position"
            fullWidth
            select
            value={form.position}
            onChange={e => set("position", e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          >
            <MenuItem value=""><em>— Select position —</em></MenuItem>
            {positions.map(p => (
              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Phone"
            fullWidth
            value={form.contact_phone}
            onChange={e => set("contact_phone", e.target.value)}
            sx={{ mb: 2 }}
            size="small"
          />

          <TextField
            label="Email"
            fullWidth
            type="email"
            value={form.contact_email}
            onChange={e => set("contact_email", e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none", color: "#666" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Contact?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.name || "this contact"}</strong> from{" "}
            {deleteTarget?.is_hq ? "HQ" : `District ${deleteTarget?.district_number}`}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", color: "#666" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
