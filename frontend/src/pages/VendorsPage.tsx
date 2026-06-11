/**
 * Vendors
 * Manage league vendor/supplier contacts — grouped by category.
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, InputAdornment,
  MenuItem, Paper, TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import DeleteIcon from "@mui/icons-material/Delete"
import EmailIcon from "@mui/icons-material/Email"
import PhoneIcon from "@mui/icons-material/Phone"
import LanguageIcon from "@mui/icons-material/Language"
import PersonIcon from "@mui/icons-material/Person"
import SearchIcon from "@mui/icons-material/Search"
import StorefrontIcon from "@mui/icons-material/Storefront"
import client from "../api/client"

const RED = "#C41230"

interface Vendor {
  id: number
  name: string
  category: string
  category_display: string
  contact_name: string
  contact_phone: string
  contact_email: string
  website: string
  notes: string
  board_role: string
  board_role_display: string
}

interface Choice { value: string; label: string }

const CATEGORY_COLORS: Record<string, string> = {
  uniforms:     "#1565c0",
  equipment:    "#2e7d32",
  trophies:     "#b45309",
  photography:  "#6a1b9a",
  printing:     "#00695c",
  concessions:  "#e65100",
  facilities:   "#37474f",
  umpires:      "#C41230",
  sponsors:     "#d97706",
  other:        "#546e7a",
}

const CATEGORY_ICONS: Record<string, string> = {
  uniforms:     "👕",
  equipment:    "⚾",
  trophies:     "🏆",
  photography:  "📷",
  printing:     "🖨️",
  concessions:  "🍿",
  facilities:   "🏟️",
  umpires:      "👨‍⚖️",
  sponsors:     "🤝",
  other:        "📦",
}

const EMPTY_FORM = {
  name: "",
  category: "other",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  website: "",
  notes: "",
  board_role: "",
}
type FormState = typeof EMPTY_FORM

export default function VendorsPage() {
  const [vendors, setVendors]       = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Choice[]>([])
  const [boardRoles, setBoardRoles] = useState<Choice[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState("")
  const [catFilter, setCatFilter]   = useState<string>("all")

  // Dialog
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Vendor | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const load = () => {
    setLoading(true); setError(null)
    Promise.all([
      client.get("/vendors/"),
      client.get("/vendors/categories/"),
      client.get("/vendors/board-roles/"),
    ])
      .then(([vr, cr, br]) => {
        setVendors(vr.data)
        setCategories(cr.data)
        setBoardRoles(br.data)
      })
      .catch(() => setError("Failed to load vendors."))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // ── Filter ────────────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase()
  const filtered = vendors.filter(v => {
    if (catFilter !== "all" && v.category !== catFilter) return false
    if (!q) return true
    return [v.name, v.contact_name, v.contact_email, v.notes, v.board_role_display, v.category_display]
      .some(s => (s ?? "").toLowerCase().includes(q))
  })

  // Group by category, preserving CATEGORY_COLORS order
  const catOrder = Object.keys(CATEGORY_COLORS)
  const grouped = filtered.reduce<Record<string, Vendor[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = []
    acc[v.category].push(v)
    return acc
  }, {})
  const sortedCats = Object.keys(grouped).sort(
    (a, b) => (catOrder.indexOf(a) ?? 99) - (catOrder.indexOf(b) ?? 99)
  )

  // ── Dialog helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category: catFilter !== "all" ? catFilter : "other" })
    setSaveError(null)
    setOpen(true)
  }

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({
      name:          v.name,
      category:      v.category,
      contact_name:  v.contact_name,
      contact_phone: v.contact_phone,
      contact_email: v.contact_email,
      website:       v.website,
      notes:         v.notes,
      board_role:    v.board_role,
    })
    setSaveError(null)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveError("Vendor name is required."); return }
    setSaving(true); setSaveError(null)
    try {
      if (editing) {
        await client.patch(`/vendors/${editing.id}/`, form)
      } else {
        await client.post("/vendors/", form)
      }
      setOpen(false)
      load()
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === "object" && !data.detail) {
        setSaveError(Object.entries(data).map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | "))
      } else {
        setSaveError(data?.detail ?? "Save failed.")
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await client.delete(`/vendors/${deleteTarget.id}/`)
      setDeleteTarget(null)
      load()
    } finally { setDeleting(false) }
  }

  const set = (f: keyof FormState, v: string) => setForm(p => ({ ...p, [f]: v }))

  // ── Vendor card ────────────────────────────────────────────────────────────
  const VendorCard = ({ v }: { v: Vendor }) => {
    const color = CATEGORY_COLORS[v.category] ?? "#546e7a"
    return (
      <Box
        sx={{
          border: "1px solid #e8e8e8",
          borderRadius: 2,
          p: 2,
          bgcolor: "#fff",
          position: "relative",
          transition: "box-shadow 0.15s, border-color 0.15s",
          "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderColor: color + "60" },
          "&:hover .vendor-actions": { opacity: 1 },
        }}
      >
        {/* Action buttons */}
        <Box
          className="vendor-actions"
          sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 0.5, opacity: 0, transition: "opacity 0.15s" }}
        >
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(v)} sx={{ color: "#888", bgcolor: "#f5f5f5", width: 28, height: 28 }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => setDeleteTarget(v)} sx={{ color: "#888", bgcolor: "#f5f5f5", width: 28, height: 28, "&:hover": { color: RED, bgcolor: "#fdecea" } }}>
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Name */}
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", pr: 7, mb: 0.5, color: "#111" }}>
          {v.name}
        </Typography>

        {/* Board role badge */}
        {v.board_role && (
          <Chip
            label={v.board_role_display || v.board_role}
            size="small"
            sx={{ fontSize: "0.68rem", height: 18, bgcolor: `${color}15`, color, fontWeight: 600, mb: 1 }}
          />
        )}

        <Divider sx={{ my: 1 }} />

        {/* Contact info */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
          {v.contact_name && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PersonIcon sx={{ fontSize: 13, color: "#bbb" }} />
              <Typography sx={{ fontSize: "0.8rem", color: "#555" }}>{v.contact_name}</Typography>
            </Box>
          )}
          {v.contact_email && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <EmailIcon sx={{ fontSize: 13, color: "#bbb" }} />
              <Typography
                component="a" href={`mailto:${v.contact_email}`}
                sx={{ fontSize: "0.78rem", color: "#1565c0", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                {v.contact_email}
              </Typography>
            </Box>
          )}
          {v.contact_phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <PhoneIcon sx={{ fontSize: 13, color: "#bbb" }} />
              <Typography
                component="a" href={`tel:${v.contact_phone}`}
                sx={{ fontSize: "0.78rem", color: "#555", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
              >
                {v.contact_phone}
              </Typography>
            </Box>
          )}
          {v.website && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <LanguageIcon sx={{ fontSize: 13, color: "#bbb" }} />
              <Typography
                component="a" href={v.website} target="_blank" rel="noopener noreferrer"
                sx={{ fontSize: "0.78rem", color: "#1565c0", textDecoration: "none", "&:hover": { textDecoration: "underline" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}
              >
                {v.website.replace(/^https?:\/\/(www\.)?/, "")}
              </Typography>
            </Box>
          )}
        </Box>

        {v.notes && (
          <Typography sx={{ fontSize: "0.75rem", color: "#999", mt: 1, fontStyle: "italic", lineHeight: 1.4 }}>
            {v.notes}
          </Typography>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, gap: 1, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#111", lineHeight: 1.1 }}>Vendors</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>
              {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} across {Object.keys(grouped).length || "—"} categories
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          Add Vendor
        </Button>
      </Box>

      {/* Search + category filter */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search vendors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#bbb", fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          <Chip
            label="All"
            clickable
            onClick={() => setCatFilter("all")}
            variant={catFilter === "all" ? "filled" : "outlined"}
            sx={{
              fontWeight: catFilter === "all" ? 700 : 400,
              bgcolor: catFilter === "all" ? "#1c1c1e" : "transparent",
              color: catFilter === "all" ? "#fff" : "#555",
              borderColor: catFilter === "all" ? "#1c1c1e" : "#ccc",
              fontSize: "0.78rem",
            }}
          />
          {categories.map(c => {
            const active = catFilter === c.value
            const color = CATEGORY_COLORS[c.value] ?? "#546e7a"
            const count = vendors.filter(v => v.category === c.value).length
            if (count === 0) return null
            return (
              <Chip
                key={c.value}
                label={`${CATEGORY_ICONS[c.value] ?? ""} ${c.label} ${count}`}
                clickable
                onClick={() => setCatFilter(active ? "all" : c.value)}
                variant={active ? "filled" : "outlined"}
                sx={{
                  fontWeight: active ? 700 : 400,
                  bgcolor: active ? color : "transparent",
                  color: active ? "#fff" : color,
                  borderColor: active ? color : color + "66",
                  fontSize: "0.78rem",
                  "&:hover": { bgcolor: active ? color + "dd" : color + "15" },
                }}
              />
            )
          })}
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && filtered.length === 0 && (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 5, textAlign: "center" }}>
          <StorefrontIcon sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
          <Typography sx={{ color: "#888", mb: 1.5 }}>
            {search || catFilter !== "all" ? "No vendors match your search." : "No vendors yet."}
          </Typography>
          {(!search && catFilter === "all") && (
            <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd}
              sx={{ borderColor: RED, color: RED, textTransform: "none", "&:hover": { borderColor: "#a80f28", bgcolor: "#fff5f7" } }}>
              Add First Vendor
            </Button>
          )}
        </Paper>
      )}

      {/* Category sections */}
      {!loading && sortedCats.map(cat => {
        const catVendors = grouped[cat]
        const catMeta = categories.find(c => c.value === cat)
        const color = CATEGORY_COLORS[cat] ?? "#546e7a"
        const icon = CATEGORY_ICONS[cat] ?? "📦"

        return (
          <Box key={cat} sx={{ mb: 3 }}>
            {/* Section header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Typography sx={{ fontSize: "1rem" }}>{icon}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color }}>
                {catMeta?.label ?? cat}
              </Typography>
              <Box sx={{ height: 1, flex: 1, bgcolor: color + "30", mx: 1 }} />
              <Typography sx={{ fontSize: "0.72rem", color: "#aaa" }}>
                {catVendors.length} vendor{catVendors.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            {/* Cards grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1.5 }}>
              {catVendors.map(v => <VendorCard key={v.id} v={v} />)}
            </Box>
          </Box>
        )
      })}

      {/* ── Add/Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? `Edit ${editing.name}` : "Add Vendor"}
        </DialogTitle>
        <DialogContent dividers>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField
              label="Vendor / Business Name" required fullWidth size="small"
              value={form.name} onChange={e => set("name", e.target.value)}
            />

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Category" select fullWidth size="small"
                value={form.category} onChange={e => set("category", e.target.value)}
                sx={{ flex: 1 }}
              >
                {categories.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {CATEGORY_ICONS[c.value]} {c.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Board Role" select fullWidth size="small"
                value={form.board_role} onChange={e => set("board_role", e.target.value)}
                sx={{ flex: 1 }}
                helperText="Who manages this vendor?"
              >
                <MenuItem value=""><em>— None —</em></MenuItem>
                {boardRoles.map(r => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Divider><Typography sx={{ fontSize: "0.72rem", color: "#aaa", px: 1 }}>Contact Info</Typography></Divider>

            <TextField
              label="Contact Name" fullWidth size="small"
              value={form.contact_name} onChange={e => set("contact_name", e.target.value)}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Phone" size="small" sx={{ flex: 1 }}
                value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)}
              />
              <TextField
                label="Email" type="email" size="small" sx={{ flex: 1 }}
                value={form.contact_email} onChange={e => set("contact_email", e.target.value)}
              />
            </Box>
            <TextField
              label="Website" size="small" fullWidth
              placeholder="https://…"
              value={form.website} onChange={e => set("website", e.target.value)}
            />

            <Divider><Typography sx={{ fontSize: "0.72rem", color: "#aaa", px: 1 }}>Notes</Typography></Divider>

            <TextField
              label="Notes" multiline rows={3} fullWidth size="small"
              placeholder="Contract details, pricing, preferred contact times…"
              value={form.notes} onChange={e => set("notes", e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none", color: "#666" }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Vendor"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Vendor?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.name}</strong> from your vendor list? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", color: "#666" }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleDelete} disabled={deleting}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
