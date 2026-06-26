/**
 * Vendors
 * Manage league vendor/supplier contacts — grouped by category.
 * Shows products supplied, account info (with warning when name differs),
 * and multiple physical locations per vendor.
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import BadgeIcon from "@mui/icons-material/Badge"
import PlaceIcon from "@mui/icons-material/Place"
import InventoryIcon from "@mui/icons-material/Inventory"
import client from "../api/client"

const RED = "#C41230"

interface VendorLocation {
  id: number
  label: string
  address: string
  phone: string
  website: string
  notes: string
  is_primary: boolean
  sort_order: number
}

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
  products: string
  account_number: string
  account_name: string
  locations: VendorLocation[]
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
  products: "",
  account_number: "",
  account_name: "",
}
type FormState = typeof EMPTY_FORM

const EMPTY_LOC = { label: "", address: "", phone: "", website: "", notes: "", is_primary: false, sort_order: 0 }
type LocFormState = typeof EMPTY_LOC

export default function VendorsPage() {
  const [vendors, setVendors]       = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Choice[]>([])
  const [boardRoles, setBoardRoles] = useState<Choice[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState("")
  const [catFilter, setCatFilter]   = useState<string>("all")

  // Vendor dialog
  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Vendor | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Delete vendor
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Location dialog
  const [locOpen, setLocOpen]         = useState(false)
  const [locVendorId, setLocVendorId] = useState<number | null>(null)
  const [locEditing, setLocEditing]   = useState<VendorLocation | null>(null)
  const [locForm, setLocForm]         = useState<LocFormState>(EMPTY_LOC)
  const [locSaving, setLocSaving]     = useState(false)
  const [locError, setLocError]       = useState<string | null>(null)

  // Delete location
  const [deleteLoc, setDeleteLoc]     = useState<{ loc: VendorLocation; vendorName: string } | null>(null)
  const [deletingLoc, setDeletingLoc] = useState(false)

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
    return [v.name, v.contact_name, v.contact_email, v.notes, v.board_role_display,
            v.category_display, v.products, v.account_number, v.account_name]
      .some(s => (s ?? "").toLowerCase().includes(q))
  })

  const catOrder = Object.keys(CATEGORY_COLORS)
  const grouped = filtered.reduce<Record<string, Vendor[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = []
    acc[v.category].push(v)
    return acc
  }, {})
  const sortedCats = Object.keys(grouped).sort(
    (a, b) => (catOrder.indexOf(a) ?? 99) - (catOrder.indexOf(b) ?? 99)
  )

  // ── Vendor dialog helpers ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category: catFilter !== "all" ? catFilter : "other" })
    setSaveError(null)
    setOpen(true)
  }

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({
      name:           v.name,
      category:       v.category,
      contact_name:   v.contact_name,
      contact_phone:  v.contact_phone,
      contact_email:  v.contact_email,
      website:        v.website,
      notes:          v.notes,
      board_role:     v.board_role,
      products:       v.products,
      account_number: v.account_number,
      account_name:   v.account_name,
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

  // ── Location dialog helpers ───────────────────────────────────────────────────
  const openAddLoc = (vendorId: number) => {
    setLocVendorId(vendorId)
    setLocEditing(null)
    setLocForm(EMPTY_LOC)
    setLocError(null)
    setLocOpen(true)
  }

  const openEditLoc = (vendorId: number, loc: VendorLocation) => {
    setLocVendorId(vendorId)
    setLocEditing(loc)
    setLocForm({
      label: loc.label, address: loc.address, phone: loc.phone,
      website: loc.website, notes: loc.notes, is_primary: loc.is_primary,
      sort_order: loc.sort_order,
    })
    setLocError(null)
    setLocOpen(true)
  }

  const handleLocSave = async () => {
    if (!locForm.label.trim()) { setLocError("Location label is required."); return }
    setLocSaving(true); setLocError(null)
    try {
      if (locEditing) {
        await client.patch(`/vendors/locations/${locEditing.id}/`, locForm)
      } else {
        await client.post(`/vendors/${locVendorId}/locations/`, locForm)
      }
      setLocOpen(false)
      load()
    } catch (err: any) {
      setLocError(err?.response?.data?.detail ?? "Save failed.")
    } finally { setLocSaving(false) }
  }

  const handleLocDelete = async () => {
    if (!deleteLoc) return
    setDeletingLoc(true)
    try {
      await client.delete(`/vendors/locations/${deleteLoc.loc.id}/`)
      setDeleteLoc(null)
      load()
    } finally { setDeletingLoc(false) }
  }

  const setLoc = (f: keyof LocFormState, v: string | boolean | number) =>
    setLocForm(p => ({ ...p, [f]: v }))

  // ── Vendor card ────────────────────────────────────────────────────────────────
  const VendorCard = ({ v }: { v: Vendor }) => {
    const color = CATEGORY_COLORS[v.category] ?? "#546e7a"
    const products = v.products ? v.products.split(",").map(s => s.trim()).filter(Boolean) : []
    const accountMismatch = v.account_name && v.account_name !== v.name

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

        {/* Products */}
        {products.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <InventoryIcon sx={{ fontSize: 12, color: "#aaa" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Products / Services
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {products.map((p, i) => (
                <Chip
                  key={i}
                  label={p}
                  size="small"
                  sx={{ fontSize: "0.68rem", height: 20, bgcolor: "#f5f5f5", color: "#555", borderRadius: 1 }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Account info */}
        {(v.account_number || v.account_name) && (
          <Box sx={{ mt: 1.5, p: 1, bgcolor: accountMismatch ? "#fff8e1" : "#f8f9fa", borderRadius: 1, border: accountMismatch ? "1px solid #ffe082" : "1px solid #f0f0f0" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <BadgeIcon sx={{ fontSize: 12, color: accountMismatch ? "#f59e0b" : "#aaa" }} />
              <Typography sx={{ fontSize: "0.7rem", color: accountMismatch ? "#f59e0b" : "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Account Info
              </Typography>
              {accountMismatch && (
                <Tooltip title={`Account is under "${v.account_name}" — not WTLL's current name`}>
                  <WarningAmberIcon sx={{ fontSize: 13, color: "#f59e0b", ml: "auto" }} />
                </Tooltip>
              )}
            </Box>
            {v.account_number && (
              <Typography sx={{ fontSize: "0.78rem", color: "#333", fontWeight: 600 }}>
                #{v.account_number}
              </Typography>
            )}
            {accountMismatch && (
              <Typography sx={{ fontSize: "0.72rem", color: "#b45309", mt: 0.25 }}>
                Listed as: <em>{v.account_name}</em>
              </Typography>
            )}
          </Box>
        )}

        {/* Locations */}
        {(v.locations && v.locations.length > 0) && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <PlaceIcon sx={{ fontSize: 12, color: "#aaa" }} />
              <Typography sx={{ fontSize: "0.7rem", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Locations
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {v.locations.map(loc => (
                <Box
                  key={loc.id}
                  sx={{
                    p: 1, borderRadius: 1, border: "1px solid #efefef", bgcolor: "#fafafa",
                    position: "relative",
                    "&:hover .loc-actions": { opacity: 1 },
                  }}
                >
                  <Box className="loc-actions" sx={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 0.25, opacity: 0, transition: "opacity 0.15s" }}>
                    <IconButton size="small" onClick={() => openEditLoc(v.id, loc)} sx={{ width: 22, height: 22, color: "#999" }}>
                      <EditIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteLoc({ loc, vendorName: v.name })} sx={{ width: 22, height: 22, color: "#999", "&:hover": { color: RED } }}>
                      <DeleteIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 5 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#333" }}>{loc.label}</Typography>
                    {loc.is_primary && (
                      <Chip label="Primary" size="small" sx={{ fontSize: "0.62rem", height: 16, bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }} />
                    )}
                  </Box>
                  {loc.address && (
                    <Typography sx={{ fontSize: "0.72rem", color: "#777", mt: 0.25 }}>{loc.address}</Typography>
                  )}
                  {loc.phone && (
                    <Typography component="a" href={`tel:${loc.phone}`}
                      sx={{ fontSize: "0.72rem", color: "#555", display: "block", mt: 0.25, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>
                      {loc.phone}
                    </Typography>
                  )}
                  {loc.website && (
                    <Typography component="a" href={loc.website} target="_blank" rel="noopener noreferrer"
                      sx={{ fontSize: "0.72rem", color: "#1565c0", display: "block", mt: 0.25, textDecoration: "none", "&:hover": { textDecoration: "underline" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {loc.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </Typography>
                  )}
                  {loc.notes && (
                    <Typography sx={{ fontSize: "0.7rem", color: "#999", mt: 0.25, fontStyle: "italic" }}>{loc.notes}</Typography>
                  )}
                </Box>
              ))}
            </Box>
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 12 }} />}
              onClick={() => openAddLoc(v.id)}
              sx={{ mt: 0.75, textTransform: "none", fontSize: "0.72rem", color: "#888", p: 0, minWidth: 0, "&:hover": { color: color } }}
            >
              Add Location
            </Button>
          </Box>
        )}

        {/* Add location link when no locations exist */}
        {(!v.locations || v.locations.length === 0) && (
          <Button
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 12 }} />}
            onClick={() => openAddLoc(v.id)}
            sx={{ mt: 1, textTransform: "none", fontSize: "0.72rem", color: "#bbb", p: 0, minWidth: 0, "&:hover": { color: color } }}
          >
            Add Location
          </Button>
        )}

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

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 1.5 }}>
              {catVendors.map(v => <VendorCard key={v.id} v={v} />)}
            </Box>
          </Box>
        )
      })}

      {/* ── Add/Edit Vendor Dialog ─────────────────────────────────────────────── */}
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

            <Divider><Typography sx={{ fontSize: "0.72rem", color: "#aaa", px: 1 }}>Products / Services</Typography></Divider>

            <TextField
              label="Products / Services Supplied" fullWidth size="small"
              placeholder="Field chalk, Field paint, Mound clay chips…"
              helperText="Comma-separated list of what we use this vendor for"
              value={form.products} onChange={e => set("products", e.target.value)}
            />

            <Divider><Typography sx={{ fontSize: "0.72rem", color: "#aaa", px: 1 }}>Account Info</Typography></Divider>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Account Number" size="small" sx={{ flex: 1 }}
                value={form.account_number} onChange={e => set("account_number", e.target.value)}
              />
              <TextField
                label="Account Name (if different)" size="small" sx={{ flex: 1 }}
                placeholder="e.g. former league name"
                helperText="Leave blank if same as vendor name"
                value={form.account_name} onChange={e => set("account_name", e.target.value)}
              />
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

      {/* ── Add/Edit Location Dialog ────────────────────────────────────────────── */}
      <Dialog open={locOpen} onClose={() => setLocOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {locEditing ? "Edit Location" : "Add Location"}
        </DialogTitle>
        <DialogContent dividers>
          {locError && <Alert severity="error" sx={{ mb: 2 }}>{locError}</Alert>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 0.5 }}>
            <TextField
              label="Label" required fullWidth size="small"
              placeholder="e.g. Fishers, Indianapolis"
              value={locForm.label} onChange={e => setLoc("label", e.target.value)}
            />
            <TextField
              label="Address" fullWidth size="small"
              value={locForm.address} onChange={e => setLoc("address", e.target.value)}
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Phone" size="small" sx={{ flex: 1 }}
                value={locForm.phone} onChange={e => setLoc("phone", e.target.value)}
              />
              <TextField
                label="Website" size="small" sx={{ flex: 1 }}
                placeholder="https://…"
                value={locForm.website} onChange={e => setLoc("website", e.target.value)}
              />
            </Box>
            <TextField
              label="Notes" multiline rows={2} fullWidth size="small"
              placeholder="Delivery only, pickup only, hours, etc."
              value={locForm.notes} onChange={e => setLoc("notes", e.target.value)}
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input
                type="checkbox"
                id="is_primary"
                checked={locForm.is_primary}
                onChange={e => setLoc("is_primary", e.target.checked)}
              />
              <label htmlFor="is_primary" style={{ fontSize: "0.85rem", color: "#555", cursor: "pointer" }}>
                Primary / preferred location
              </label>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setLocOpen(false)} sx={{ textTransform: "none", color: "#666" }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleLocSave} disabled={locSaving}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {locSaving ? "Saving…" : locEditing ? "Save Changes" : "Add Location"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Vendor Confirm ────────────────────────────────────────────────── */}
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

      {/* ── Delete Location Confirm ──────────────────────────────────────────────── */}
      <Dialog open={!!deleteLoc} onClose={() => setDeleteLoc(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Remove Location?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove the <strong>{deleteLoc?.loc.label}</strong> location from{" "}
            <strong>{deleteLoc?.vendorName}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteLoc(null)} sx={{ textTransform: "none", color: "#666" }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleLocDelete} disabled={deletingLoc}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a80f28" }, textTransform: "none", fontWeight: 600 }}
          >
            {deletingLoc ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
