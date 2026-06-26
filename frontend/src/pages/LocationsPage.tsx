/**
 * LocationsPage — manage league locations (parks, complexes) and their fields.
 *
 * GET    /api/locations/                       → list
 * POST   /api/locations/                       → create
 * PATCH  /api/locations/<id>/                  → update
 * DELETE /api/locations/<id>/                  → delete
 * POST   /api/locations/<id>/fields/           → add field
 * PATCH  /api/locations/<id>/fields/<fid>/     → update field
 * DELETE /api/locations/<id>/fields/<fid>/     → delete field
 */
import { useEffect, useState } from "react"
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Paper, Switch,
  TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditIcon from "@mui/icons-material/Edit"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import HomeIcon from "@mui/icons-material/Home"
import PlaceIcon from "@mui/icons-material/Place"
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer"
import client from "../api/client"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BoundaryLeagueOption {
  id: number
  league_name: string
  league_location: string
  address: string
  district: number | null
}

// LL → Little League display helper (mirrors BoundariesPage logic)
function expandLL(raw: string): string {
  return raw
    .replace(/\bLL\b/g, 'Little League')
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase())
    .replace(/little league/gi, 'Little League')
}

interface LocationField {
  id: number
  name: string
  division_tag: string
  sort_order: number
}

interface LeagueLocation {
  id: number
  name: string
  short_name: string
  address: string
  city: string
  state: string
  zip_code: string
  district: string
  is_home: boolean
  notes: string
  fields: LocationField[]
  league_id: number | null
  league_name: string | null
}

const EMPTY_LOC: Omit<LeagueLocation, "id" | "fields"> = {
  name: "", short_name: "", address: "", city: "",
  state: "OH", zip_code: "", district: "", is_home: false, notes: "",
  league_id: null, league_name: null,
}

const EMPTY_FIELD: Omit<LocationField, "id"> = {
  name: "", division_tag: "", sort_order: 0,
}

// ── FieldRow component ────────────────────────────────────────────────────────

function FieldRow({
  field, locationId, onSaved, onDeleted,
}: {
  field: LocationField | null  // null = new row
  locationId: number
  onSaved: (f: LocationField) => void
  onDeleted?: (id: number) => void
}) {
  const isNew = field === null
  const [editing, setEditing] = useState(isNew)
  const [draft, setDraft] = useState<Omit<LocationField, "id">>(field ?? EMPTY_FIELD)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const save = async () => {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      if (isNew || !field) {
        const res = await client.post(`/locations/${locationId}/fields/`, draft)
        onSaved(res.data)
        setDraft(EMPTY_FIELD)
        if (isNew) setEditing(false)
      } else {
        const res = await client.patch(`/locations/${locationId}/fields/${field.id}/`, draft)
        onSaved(res.data)
        setEditing(false)
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!field) return
    setDeleting(true)
    try {
      await client.delete(`/locations/${locationId}/fields/${field.id}/`)
      onDeleted?.(field.id)
    } finally {
      setDeleting(false)
    }
  }

  if (!editing && field) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1 }}>
        <SportsSoccerIcon sx={{ fontSize: 14, color: "#aaa", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.82rem", flex: 1, fontWeight: 500 }}>{field.name}</Typography>
        {field.division_tag && (
          <Chip label={field.division_tag} size="small"
            sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#e3f2fd", color: "#1565c0" }} />
        )}
        <IconButton size="small" onClick={() => setEditing(true)}
          sx={{ color: "#bbb", "&:hover": { color: "#1565c0" } }}>
          <EditIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <IconButton size="small" onClick={del} disabled={deleting}
          sx={{ color: "#bbb", "&:hover": { color: "#ef5350" } }}>
          {deleting ? <CircularProgress size={12} /> : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1 }}>
      <TextField
        size="small" placeholder="Field name (e.g. Field 7)" value={draft.name}
        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
        sx={{ flex: 2, "& .MuiInputBase-input": { fontSize: "0.78rem" } }}
      />
      <TextField
        size="small" placeholder="Division tag (optional)" value={draft.division_tag}
        onChange={e => setDraft(d => ({ ...d, division_tag: e.target.value }))}
        sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.78rem" } }}
      />
      <Button size="small" variant="contained" onClick={save} disabled={saving || !draft.name.trim()}
        sx={{ minWidth: 56, bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" }, fontSize: "0.72rem" }}>
        {saving ? <CircularProgress size={14} color="inherit" /> : (isNew ? "Add" : "Save")}
      </Button>
      {!isNew && (
        <Button size="small" onClick={() => { setEditing(false); setDraft(field!) }}
          sx={{ fontSize: "0.72rem", color: "#888" }}>
          Cancel
        </Button>
      )}
    </Box>
  )
}

// ── Location form dialog ──────────────────────────────────────────────────────

function LocationDialog({
  open, initial, onClose, onSaved, boundaryLeagues,
}: {
  open: boolean
  initial: LeagueLocation | null  // null = create
  onClose: () => void
  onSaved: (loc: LeagueLocation) => void
  boundaryLeagues: BoundaryLeagueOption[]
}) {
  const isNew = initial === null
  const [form, setForm] = useState<Omit<LeagueLocation, "id" | "fields">>(
    initial ? { ...initial } : { ...EMPTY_LOC }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : { ...EMPTY_LOC })
      setError(null)
    }
  }, [open, initial])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  // Selected league option for the Autocomplete
  const selectedLeague = boundaryLeagues.find(l => l.id === form.league_id) ?? null

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return }
    setSaving(true)
    setError(null)
    try {
      const payload = { ...form, league_id: form.league_id ?? null }
      const res = isNew
        ? await client.post("/locations/", payload)
        : await client.patch(`/locations/${initial!.id}/`, payload)
      // Preserve existing fields when editing
      onSaved({ ...res.data, fields: initial?.fields ?? [] })
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {isNew ? "Add Location" : `Edit — ${initial?.name}`}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

        {/* Organization first — auto-fills city, state, and address */}
        <Autocomplete
          options={boundaryLeagues}
          value={selectedLeague}
          getOptionLabel={(opt) => expandLL(opt.league_name)}
          groupBy={(opt) => opt.district ? `District ${opt.district}` : "Other"}
          onChange={(_, val) => {
            let city = form.city
            let state = form.state
            let address = form.address
            // Auto-fill city/state from "City, State" league_location string
            if (val?.league_location) {
              const parts = val.league_location.split(",").map(s => s.trim())
              if (parts.length >= 2) {
                city = parts[0]
                state = parts[1]
              }
            }
            // Auto-fill address if the org has one saved
            if (val?.address) {
              address = val.address
            }
            setForm(p => ({
              ...p,
              league_id: val?.id ?? null,
              league_name: val?.league_name ?? null,
              city,
              state,
              address,
            }))
          }}
          renderInput={(params) => (
            <TextField {...params} label="Little League Organization" size="small" fullWidth
              helperText="Auto-fills address, city and state from the organization" />
          )}
          renderOption={(props, opt) => (
            <Box component="li" {...props} sx={{ fontSize: "0.82rem" }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{expandLL(opt.league_name)}</Typography>
                {opt.league_location && (
                  <Typography sx={{ fontSize: "0.7rem", color: "#aaa" }}>{opt.league_location}</Typography>
                )}
              </Box>
            </Box>
          )}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          clearOnEscape
          size="small"
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2 }}>
          <TextField label="Name *" placeholder="Field Name" value={form.name} onChange={set("name")} fullWidth size="small" />
          <TextField label="Short Name" value={form.short_name} onChange={set("short_name")} fullWidth size="small"
            helperText="Used in dropdowns" />
        </Box>

        <TextField label="Address" value={form.address} onChange={set("address")} fullWidth size="small"
          placeholder="Street address" />

        <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 2 }}>
          <TextField label="City" value={form.city} onChange={set("city")} fullWidth size="small" />
          <TextField label="State" value={form.state} onChange={set("state")} fullWidth size="small" />
          <TextField label="ZIP" value={form.zip_code} onChange={set("zip_code")} fullWidth size="small" />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, alignItems: "center" }}>
          <TextField label="District" value={form.district} onChange={set("district")} fullWidth size="small"
            placeholder="e.g. District 8" />
          <FormControlLabel
            control={<Switch checked={form.is_home} onChange={e => setForm(p => ({ ...p, is_home: e.target.checked }))} size="small" />}
            label={<Typography sx={{ fontSize: "0.82rem" }}>WTLL Home Field</Typography>}
          />
        </Box>

        <TextField label="Notes" value={form.notes} onChange={set("notes")} fullWidth size="small"
          multiline minRows={2} placeholder="Parking info, field directions, etc." />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ color: "#888" }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}
          sx={{ bgcolor: "#00838f", "&:hover": { bgcolor: "#006064" }, fontWeight: 700 }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : (isNew ? "Add Location" : "Save Changes")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── LocationCard ──────────────────────────────────────────────────────────────

function LocationCard({
  loc, onUpdated, onDeleted, boundaryLeagues,
}: {
  loc: LeagueLocation
  onUpdated: (l: LeagueLocation) => void
  onDeleted: (id: number) => void
  boundaryLeagues: BoundaryLeagueOption[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    if (!confirm(`Delete "${loc.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await client.delete(`/locations/${loc.id}/`)
      onDeleted(loc.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleFieldSaved = (f: LocationField) => {
    const existing = loc.fields.find(x => x.id === f.id)
    const newFields = existing
      ? loc.fields.map(x => x.id === f.id ? f : x)
      : [...loc.fields, f]
    onUpdated({ ...loc, fields: newFields })
  }

  const handleFieldDeleted = (fid: number) => {
    onUpdated({ ...loc, fields: loc.fields.filter(f => f.id !== fid) })
  }

  const addrParts = [loc.address, loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ")
  const mapsUrl = addrParts ? `https://maps.google.com/?q=${encodeURIComponent(addrParts)}` : null

  return (
    <>
      <LocationDialog
        open={editOpen} initial={loc}
        onClose={() => setEditOpen(false)}
        onSaved={updated => { onUpdated({ ...updated, fields: loc.fields }); setEditOpen(false) }}
        boundaryLeagues={boundaryLeagues}
      />
      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
        {/* Header */}
        <Box
          onClick={() => setExpanded(e => !e)}
          sx={{
            display: "flex", alignItems: "center", gap: 1.5,
            px: 2, py: 1.25, cursor: "pointer",
            bgcolor: "#1c1c1e",
            "&:hover": { bgcolor: "#2a2a2e" },
          }}
        >
          {loc.is_home && (
            <Tooltip title="WTLL Home Field">
              <HomeIcon sx={{ fontSize: 16, color: "#C41230", flexShrink: 0 }} />
            </Tooltip>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
              {loc.name}
              {loc.short_name && loc.short_name !== loc.name && (
                <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 400, ml: 1, fontSize: "0.8rem" }}>
                  ({loc.short_name})
                </Box>
              )}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {addrParts && (
                <Typography
                  component={mapsUrl ? "a" : "span"}
                  href={mapsUrl ?? undefined} target="_blank" rel="noopener"
                  onClick={e => e.stopPropagation()}
                  sx={{
                    fontSize: "0.7rem", color: "rgba(255,255,255,0.45)",
                    textDecoration: "none", "&:hover": { color: "rgba(255,255,255,0.75)" },
                    display: "flex", alignItems: "center", gap: 0.25,
                  }}>
                  <PlaceIcon sx={{ fontSize: 11 }} />{addrParts}
                </Typography>
              )}
              {loc.district && (
                <Chip label={loc.district} size="small"
                  sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }} />
              )}
              {loc.league_name && (
                <Chip label={expandLL(loc.league_name)} size="small"
                  sx={{ height: 16, fontSize: "0.62rem", bgcolor: "rgba(100,180,255,0.15)", color: "rgba(150,210,255,0.85)" }} />
              )}
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }} onClick={e => e.stopPropagation()}>
            <Chip
              label={`${loc.fields.length} field${loc.fields.length !== 1 ? "s" : ""}`}
              size="small"
              sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
            />
            <IconButton size="small" onClick={() => setEditOpen(true)}
              sx={{ color: "rgba(255,255,255,0.4)", "&:hover": { color: "#fff" } }}>
              <EditIcon sx={{ fontSize: 15 }} />
            </IconButton>
            <IconButton size="small" onClick={del} disabled={deleting}
              sx={{ color: "rgba(255,255,255,0.3)", "&:hover": { color: "#ef5350" } }}>
              {deleting ? <CircularProgress size={12} sx={{ color: "#fff" }} /> : <DeleteOutlineIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Box>
          <ExpandMoreIcon sx={{
            fontSize: 20, color: "rgba(255,255,255,0.4)",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }} />
        </Box>

        {/* Expanded fields section */}
        <Collapse in={expanded}>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "#fafbff", borderTop: "1px solid #f0f0f0" }}>
            {loc.notes && (
              <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 1.25, fontStyle: "italic" }}>
                {loc.notes}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75 }}>
              Fields
            </Typography>
            {loc.fields.length === 0 ? (
              <Typography sx={{ fontSize: "0.78rem", color: "#bbb", fontStyle: "italic", mb: 1 }}>
                No fields added yet.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", mb: 0.5 }}>
                {loc.fields.map(f => (
                  <FieldRow key={f.id} field={f} locationId={loc.id}
                    onSaved={handleFieldSaved} onDeleted={handleFieldDeleted} />
                ))}
              </Box>
            )}
            {/* Inline add-field row */}
            <Box sx={{ mt: 1, borderTop: "1px dashed #e0e0e0", pt: 1 }}>
              <FieldRow field={null} locationId={loc.id} onSaved={handleFieldSaved} />
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const [locations, setLocations] = useState<LeagueLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [boundaryLeagues, setBoundaryLeagues] = useState<BoundaryLeagueOption[]>([])

  useEffect(() => {
    client.get("/locations/")
      .then(r => setLocations(r.data ?? []))
      .catch(() => setError("Failed to load locations."))
      .finally(() => setLoading(false))
    // Load boundary leagues for the league selector
    client.get("/district/leagues/")
      .then(r => setBoundaryLeagues(r.data ?? []))
      .catch(() => {})
  }, [])

  const handleAdded = (loc: LeagueLocation) => {
    setLocations(prev => {
      const next = [...prev, loc]
      return next.sort((a, b) =>
        (b.is_home ? 1 : 0) - (a.is_home ? 1 : 0) || a.name.localeCompare(b.name)
      )
    })
  }

  const handleUpdated = (loc: LeagueLocation) => {
    setLocations(prev => prev.map(l => l.id === loc.id ? loc : l))
  }

  const handleDeleted = (id: number) => {
    setLocations(prev => prev.filter(l => l.id !== id))
  }

  const homeLocations  = locations.filter(l => l.is_home)
  const awayLocations  = locations.filter(l => !l.is_home)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#00838f", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Locations</Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
          sx={{ bgcolor: "#00838f", "&:hover": { bgcolor: "#006064" }, fontWeight: 700 }}>
          Add Location
        </Button>
      </Box>

      <LocationDialog
        open={addOpen} initial={null}
        onClose={() => setAddOpen(false)}
        onSaved={loc => { handleAdded(loc); setAddOpen(false) }}
        boundaryLeagues={boundaryLeagues}
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#00838f" }} />
        </Box>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && locations.length === 0 && (
        <Paper elevation={0} sx={{
          border: "1px dashed #ddd", borderRadius: 2, p: 5,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, color: "#aaa",
        }}>
          <PlaceIcon sx={{ fontSize: 40, opacity: 0.4 }} />
          <Typography sx={{ fontSize: "0.9rem" }}>No locations yet — click <strong>Add Location</strong> to get started.</Typography>
        </Paper>
      )}

      {homeLocations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <HomeIcon sx={{ fontSize: 15, color: "#C41230" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#C41230" }}>
              Home Fields
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {homeLocations.map(l => (
              <LocationCard key={l.id} loc={l} onUpdated={handleUpdated} onDeleted={handleDeleted} boundaryLeagues={boundaryLeagues} />
            ))}
          </Box>
        </Box>
      )}

      {awayLocations.length > 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <PlaceIcon sx={{ fontSize: 15, color: "#555" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#555" }}>
              Other Locations
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {awayLocations.map(l => (
              <LocationCard key={l.id} loc={l} onUpdated={handleUpdated} onDeleted={handleDeleted} boundaryLeagues={boundaryLeagues} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
