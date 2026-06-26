/**
 * GroupChecklistTab — reusable editable checklist view filtered to one group.
 *
 * Used by ShowcaseTab, FundraisingHubTab, and TeeBallTab.
 */
import { useEffect, useState, useMemo } from "react"
import {
  Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Typography,
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Tooltip,
} from "@mui/material"
import AddIcon  from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { CHIP_SX } from "./shared"
import {
  ChecklistItem, ChecklistType, ChecklistGroup,
  CHECKLIST_TYPE_META,
  getChecklistItems, createChecklistItem, updateChecklistItem, deleteChecklistItem,
} from "../../api/boardHub"

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
  open:        boolean
  group:       ChecklistGroup
  initial?:    Partial<ChecklistItem>
  onClose:     () => void
  onSave:      (data: Omit<ChecklistItem, "id">) => Promise<void>
  onDelete?:   () => Promise<void>
}

const EMPTY = (group: ChecklistGroup): Omit<ChecklistItem, "id"> => ({
  date_window: "", item: "", owner: "", item_type: "action", group, sort_order: 0,
})

function ItemDialog({ open, group, initial, onClose, onSave, onDelete }: ItemDialogProps) {
  const [form, setForm]   = useState(EMPTY(group))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY(group), ...initial } : EMPTY(group))
      setConfirmDelete(false)
    }
  }, [open, initial, group])

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
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?.id ? "Edit Item" : "Add Item"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        <TextField
          label="Date / Window" size="small" required
          placeholder="e.g. March 2027"
          value={form.date_window} onChange={set("date_window")}
        />
        <TextField
          label="Item" size="small" required multiline rows={2}
          value={form.item} onChange={set("item")}
        />
        <TextField
          label="Owner(s)" size="small"
          placeholder="e.g. VP Baseball · Grounds Manager"
          value={form.owner} onChange={set("owner")}
        />
        <TextField
          select label="Type" size="small"
          value={form.item_type}
          onChange={e => setForm(f => ({ ...f, item_type: e.target.value as ChecklistType }))}
        >
          {(Object.entries(CHECKLIST_TYPE_META) as [ChecklistType, { label: string; color: string }][]).map(([v, m]) => (
            <MenuItem key={v} value={v}>{m.label}</MenuItem>
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
          <Button variant="contained" onClick={handleSave}
            disabled={saving || !form.item.trim() || !form.date_window.trim()}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e28" } }}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : "Save"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface Props {
  group:       ChecklistGroup
  description: string
}

const TYPE_KEYS = Object.keys(CHECKLIST_TYPE_META) as ChecklistType[]

export default function GroupChecklistTab({ group, description }: Props) {
  const [items,      setItems]      = useState<ChecklistItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [typeFilter, setTypeFilter] = useState<ChecklistType | "all">("all")

  const [dialogOpen,    setDialogOpen]    = useState(false)
  const [dialogInitial, setDialogInitial] = useState<Partial<ChecklistItem> | undefined>(undefined)
  const [editingId,     setEditingId]     = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await getChecklistItems(group)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [group])

  const filtered = useMemo(() =>
    typeFilter === "all" ? items : items.filter(it => it.item_type === typeFilter),
    [items, typeFilter]
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
      const created = await createChecklistItem({ ...data, group })
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
      <Typography sx={{ color: "#777", fontSize: "0.875rem", mb: 2.5 }}>{description}</Typography>

      {/* Type filter chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Chip label="All" size="small"
          onClick={() => setTypeFilter("all")}
          sx={typeFilter === "all"
            ? { bgcolor: "#333", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }
            : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
        />
        {TYPE_KEYS.map(t => {
          const meta = CHECKLIST_TYPE_META[t]
          const active = typeFilter === t
          return (
            <Chip key={t} label={meta.label} size="small"
              onClick={() => setTypeFilter(active ? "all" : t)}
              sx={active
                ? { ...CHIP_SX[meta.color as keyof typeof CHIP_SX], fontWeight: 700, fontSize: "0.72rem" }
                : { bgcolor: "#f4f4f5", color: "#555", fontWeight: 600, fontSize: "0.72rem" }}
            />
          )
        })}

        <Box sx={{ ml: "auto" }}>
          <Button startIcon={<AddIcon />} size="small" variant="outlined" onClick={openAdd}
            sx={{ color: RED, borderColor: RED, "&:hover": { borderColor: RED, bgcolor: "rgba(196,18,48,0.06)" }, fontWeight: 700, textTransform: "none", fontSize: "0.8rem" }}
          >
            Add Item
          </Button>
        </Box>
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
                {["Date / Window", "Item", "Owner", "Type", ""].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", color: RED, bgcolor: "#fafafa", whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(row => {
                const typeMeta = CHECKLIST_TYPE_META[row.item_type]
                return (
                  <TableRow key={row.id} sx={{ bgcolor: ROW_BG[row.item_type], "&:hover": { bgcolor: "rgba(0,0,0,0.03)" } }}>
                    <TableCell sx={{ fontSize: "0.8rem", whiteSpace: "nowrap", fontWeight: 600 }}>{row.date_window}</TableCell>
                    <TableCell sx={{ fontSize: "0.82rem" }}>{row.item}</TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#555" }}>{row.owner}</TableCell>
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
                  <TableCell colSpan={5} sx={{ py: 4, textAlign: "center", color: "#aaa", fontSize: "0.85rem" }}>
                    No items yet — click <strong>Add Item</strong> to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <ItemDialog
        open={dialogOpen}
        group={group}
        initial={dialogInitial}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={editingId !== null ? handleDelete : undefined}
      />
    </Box>
  )
}
