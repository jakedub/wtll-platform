import { useEffect, useState, useMemo } from "react"
import {
  Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Tooltip,
} from "@mui/material"
import AddIcon   from "@mui/icons-material/Add"
import EditIcon  from "@mui/icons-material/Edit"
import { CHIP_SX } from "./shared"
import {
  ChecklistItem, ChecklistType, ChecklistGroup,
  CHECKLIST_TYPE_META, CHECKLIST_GROUP_META,
  getChecklistItems, createChecklistItem, updateChecklistItem, deleteChecklistItem,
} from "../../api/boardHub"

// ─── Constants ────────────────────────────────────────────────────────────────

const RED = "#C41230"

const ROW_BG: Record<ChecklistType, string> = {
  hard:        "rgba(196,18,48,0.04)",
  action:      "rgba(230,81,0,0.04)",
  allstar:     "rgba(106,27,154,0.05)",
  showcase:    "rgba(21,101,192,0.05)",
  fundraising: "rgba(230,162,0,0.05)",
  tee_ball:    "rgba(46,125,50,0.04)",
  general:     "transparent",
}

// ─── Item Edit Dialog ─────────────────────────────────────────────────────────

interface ItemDialogProps {
  open:      boolean
  initial?:  Partial<ChecklistItem>
  onClose:   () => void
  onSave:    (data: Omit<ChecklistItem, "id">) => Promise<void>
  onDelete?: () => Promise<void>
}

const EMPTY = (): Omit<ChecklistItem, "id"> => ({
  date_window: "", item: "", owner: "", item_type: "action", group: "general", sort_order: 0,
})

function ItemDialog({ open, initial, onClose, onSave, onDelete }: ItemDialogProps) {
  const [form, setForm] = useState(EMPTY())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY(), ...initial } : EMPTY())
      setConfirmDelete(false)
    }
  }, [open, initial])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.item.trim() || !form.date_window.trim()) return
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
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?.id ? "Edit Item" : "Add Checklist Item"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        <TextField
          label="Date / Window" size="small" required
          placeholder="e.g. 2nd week of January 2027"
          value={form.date_window} onChange={set("date_window")}
        />
        <TextField
          label="Item" size="small" required multiline rows={2}
          value={form.item} onChange={set("item")}
        />
        <TextField
          label="Owner(s)" size="small"
          placeholder="e.g. VP Baseball · Equipment Manager"
          value={form.owner} onChange={set("owner")}
        />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            select label="Type" size="small"
            value={form.item_type}
            onChange={e => setForm(f => ({ ...f, item_type: e.target.value as ChecklistType }))}
          >
            {(Object.entries(CHECKLIST_TYPE_META) as [ChecklistType, { label: string; color: string }][]).map(([v, m]) => (
              <MenuItem key={v} value={v}>{m.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            select label="Group" size="small"
            value={form.group}
            onChange={e => setForm(f => ({ ...f, group: e.target.value as ChecklistGroup }))}
          >
            {(Object.entries(CHECKLIST_GROUP_META) as [ChecklistGroup, { label: string }][]).map(([v, m]) => (
              <MenuItem key={v} value={v}>{m.label}</MenuItem>
            ))}
          </TextField>
        </Box>
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
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.item.trim() || !form.date_window.trim()}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e28" } }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TYPE_KEYS = Object.keys(CHECKLIST_TYPE_META) as ChecklistType[]
const GROUP_KEYS = Object.keys(CHECKLIST_GROUP_META) as ChecklistGroup[]

export default function ChecklistTab() {
  const [items,      setItems]      = useState<ChecklistItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [typeFilter, setTypeFilter] = useState<ChecklistType | "all">("all")
  const [groupFilter,setGroupFilter]= useState<ChecklistGroup | "all">("all")

  // Dialog state
  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [dialogInitial, setDialogInitial] = useState<Partial<ChecklistItem> | undefined>(undefined)
  const [editingId,     setEditingId]     = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await getChecklistItems()) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    items.filter(it => {
      if (typeFilter !== "all" && it.item_type !== typeFilter) return false
      if (groupFilter !== "all" && it.group !== groupFilter) return false
      return true
    }),
    [items, typeFilter, groupFilter]
  )

  const openAdd = () => {
    setEditingId(null)
    setDialogInitial(undefined)
    setDialogOpen(true)
  }

  const openEdit = (it: ChecklistItem) => {
    setEditingId(it.id)
    setDialogInitial(it)
    setDialogOpen(true)
  }

  const handleSave = async (data: Omit<ChecklistItem, "id">) => {
    if (editingId !== null) {
      const updated = await updateChecklistItem(editingId, data)
      setItems(prev => prev.map(it => it.id === editingId ? updated : it))
    } else {
      const created = await createChecklistItem(data)
      setItems(prev => [...prev, created])
    }
    setDialogOpen(false)
  }

  const handleDelete = async () => {
    if (editingId === null) return
    await deleteChecklistItem(editingId)
    setItems(prev => prev.filter(it => it.id !== editingId))
    setDialogOpen(false)
  }

  return (
    <Box>
      {/* Type filter chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.75rem", color: "#888", mr: 0.5 }}>Type:</Typography>
        <Chip
          label="All" size="small"
          onClick={() => setTypeFilter("all")}
          sx={typeFilter === "all"
            ? { bgcolor: "#333", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }
            : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
        />
        {TYPE_KEYS.map(t => {
          const meta = CHECKLIST_TYPE_META[t]
          const active = typeFilter === t
          return (
            <Chip
              key={t} label={meta.label} size="small"
              onClick={() => setTypeFilter(active ? "all" : t)}
              sx={active
                ? { ...CHIP_SX[meta.color as keyof typeof CHIP_SX], fontWeight: 700, fontSize: "0.72rem" }
                : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
            />
          )
        })}
      </Box>

      {/* Group filter chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.75rem", color: "#888", mr: 0.5 }}>Group:</Typography>
        <Chip
          label="All" size="small"
          onClick={() => setGroupFilter("all")}
          sx={groupFilter === "all"
            ? { bgcolor: "#333", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }
            : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
        />
        {GROUP_KEYS.map(g => {
          const active = groupFilter === g
          return (
            <Chip
              key={g} label={CHECKLIST_GROUP_META[g].label} size="small"
              onClick={() => setGroupFilter(active ? "all" : g)}
              sx={active
                ? { bgcolor: RED, color: "#fff", fontWeight: 700, fontSize: "0.72rem" }
                : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
            />
          )
        })}
      </Box>

      {/* Add button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <Button
          startIcon={<AddIcon />} size="small" variant="outlined"
          onClick={openAdd}
          sx={{ color: RED, borderColor: RED, "&:hover": { borderColor: RED, bgcolor: "rgba(196,18,48,0.06)" }, fontWeight: 700, textTransform: "none", fontSize: "0.8rem" }}
        >
          Add Item
        </Button>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      )}

      {!loading && (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Date / Window", "Item", "Owner", "Group", "Type", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(row => {
                const typeMeta  = CHECKLIST_TYPE_META[row.item_type]
                const groupMeta = CHECKLIST_GROUP_META[row.group]
                return (
                  <TableRow key={row.id} sx={{ bgcolor: ROW_BG[row.item_type], "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                    <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap", fontWeight: 600 }}>{row.date_window}</TableCell>
                    <TableCell sx={{ fontSize: "0.82rem" }}>{row.item}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#555" }}>{row.owner}</TableCell>
                    <TableCell>
                      <Chip label={groupMeta.label} size="small"
                        sx={{ bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.68rem", height: 20 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={typeMeta.label} size="small"
                        sx={{ ...CHIP_SX[typeMeta.color as keyof typeof CHIP_SX], fontWeight: 700, fontSize: "0.68rem", height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ px: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(row)} sx={{ p: 0.5 }}>
                          <EditIcon sx={{ fontSize: 14, color: "#aaa" }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: "center", color: "#aaa", fontSize: "0.85rem" }}>
                    No items match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <ItemDialog
        open={dialogOpen}
        initial={dialogInitial}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingId !== null ? handleDelete : undefined}
      />
    </Box>
  )
}
