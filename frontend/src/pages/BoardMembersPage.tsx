import { useEffect, useState } from "react"
import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import CircularProgress from "@mui/material/CircularProgress"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import FormControlLabel from "@mui/material/FormControlLabel"
import IconButton from "@mui/material/IconButton"
import MenuItem from "@mui/material/MenuItem"
import Paper from "@mui/material/Paper"
import Switch from "@mui/material/Switch"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import AddIcon from "@mui/icons-material/Add"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import StarIcon from "@mui/icons-material/Star"
import client from "../api/client"

const RED = "#C41230"

interface BoardMember {
  id: number
  first_name: string
  last_name: string
  full_name: string
  role: string
  sport: string
  email: string
  phone: string
  notes: string
  is_active: boolean
  sort_order: number
}

interface RoleOption { value: string; label: string }

// Roles where sport designation is relevant
const SPORT_ROLES = new Set(["Vice President", "Player Agent"])

const EMPTY: Partial<BoardMember> = {
  first_name: "", last_name: "", role: "At-Large", sport: "",
  email: "", phone: "", notes: "", is_active: true, sort_order: 0,
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────
function MemberDialog({
  open, initial, roles,
  onClose, onSaved,
}: {
  open: boolean
  initial: Partial<BoardMember>
  roles: RoleOption[]
  onClose: () => void
  onSaved: (m: BoardMember) => void
}) {
  const [fields, setFields] = useState<Partial<BoardMember>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => { if (open) { setFields(initial); setError(null) } }, [open]) // eslint-disable-line

  const isEdit = !!initial.id
  const set = (k: keyof BoardMember, v: any) => setFields(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!fields.first_name?.trim() || !fields.last_name?.trim() || !fields.role) {
      setError("First name, last name, and role are required.")
      return
    }
    setSaving(true); setError(null)
    try {
      const res = isEdit
        ? await client.patch(`/board-members/${initial.id}/`, fields)
        : await client.post("/board-members/", fields)
      onSaved(res.data)
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Save failed.")
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? "Edit Board Member" : "Add Board Member"}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="First Name" size="small" value={fields.first_name ?? ""} onChange={e => set("first_name", e.target.value)} />
            <TextField label="Last Name"  size="small" value={fields.last_name  ?? ""} onChange={e => set("last_name",  e.target.value)} />
          </Box>
          <TextField
            label="Role" size="small" select value={fields.role ?? "At-Large"}
            onChange={e => { set("role", e.target.value); if (!SPORT_ROLES.has(e.target.value)) set("sport", "") }}
          >
            {roles.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>

          {/* Sport selector — only for VP and Player Agent */}
          {SPORT_ROLES.has(fields.role ?? "") && (
            <TextField
              label="Sport" size="small" select
              value={fields.sport ?? ""}
              onChange={e => set("sport", e.target.value)}
              helperText="Leave blank if this role covers both sports."
            >
              <MenuItem value="">Both / All Sports</MenuItem>
              <MenuItem value="baseball">Baseball</MenuItem>
              <MenuItem value="softball">Softball</MenuItem>
            </TextField>
          )}

          <TextField label="Email (optional)" size="small" type="email" value={fields.email ?? ""} onChange={e => set("email", e.target.value)} />
          <TextField label="Phone (optional)" size="small" value={fields.phone ?? ""} onChange={e => set("phone", e.target.value)} />
          <TextField label="Notes (optional)" size="small" multiline rows={2} value={fields.notes ?? ""} onChange={e => set("notes", e.target.value)} />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Sort Order" size="small" type="number" value={fields.sort_order ?? 0} onChange={e => set("sort_order", Number(e.target.value))} />
            <FormControlLabel
              control={<Switch checked={!!fields.is_active} onChange={e => set("is_active", e.target.checked)} />}
              label="Active"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained" onClick={handleSave} disabled={saving}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Member"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BoardMembersPage() {
  const [members, setMembers]     = useState<BoardMember[]>([])
  const [roles, setRoles]         = useState<RoleOption[]>([])
  const [loading, setLoading]     = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]     = useState<Partial<BoardMember>>(EMPTY)

  const load = async () => {
    setLoading(true)
    try {
      const [m, r] = await Promise.all([
        client.get(`/board-members/${showInactive ? "?all=true" : ""}`),
        client.get("/board-members/roles/"),
      ])
      setMembers(m.data)
      setRoles(r.data)
    } catch { setError("Failed to load board members.") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [showInactive]) // eslint-disable-line

  const openAdd  = () => { setEditing(EMPTY); setDialogOpen(true) }
  const openEdit = (m: BoardMember) => { setEditing(m); setDialogOpen(true) }

  const handleSaved = (m: BoardMember) => {
    setMembers(prev => {
      const idx = prev.findIndex(p => p.id === m.id)
      return idx >= 0 ? prev.map(p => p.id === m.id ? m : p) : [...prev, m]
    })
  }

  const handleDelete = async (m: BoardMember) => {
    if (!confirm(`Remove ${m.full_name} from the board?`)) return
    try {
      await client.delete(`/board-members/${m.id}/`)
      setMembers(prev => prev.filter(p => p.id !== m.id))
    } catch { setError("Delete failed.") }
  }

  const president = members.find(m => m.role.toLowerCase() === "president")

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Board Members</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Current league board roster. The President's name is automatically added to All Star TVF forms.
        </Typography>
      </Box>

      {/* President callout */}
      {president && (
        <Paper elevation={0} sx={{ border: "1px solid #ffd700", bgcolor: "#fffdf0", borderRadius: 2, px: 2.5, py: 1.5, mb: 2.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <StarIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
              {president.full_name}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#888" }}>
              President — name will be auto-filled on All Star Tournament Verification Forms
            </Typography>
          </Box>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          Add Member
        </Button>
        <FormControlLabel
          control={<Switch size="small" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />}
          label={<Typography sx={{ fontSize: "0.82rem" }}>Show inactive</Typography>}
          sx={{ ml: 1 }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : members.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 8, textAlign: "center" }}>
          <Typography sx={{ color: "#aaa", mb: 2 }}>No board members yet.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ borderColor: RED, color: RED }}>Add First Member</Button>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#fafafa" }}>
                {["Name", "Role", "Email", "Phone", "Status", ""].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id} hover sx={{ opacity: m.is_active ? 1 : 0.5 }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                    {m.full_name}
                    {m.role.toLowerCase() === "president" && (
                      <StarIcon sx={{ fontSize: 12, color: "#f59e0b", ml: 0.5, verticalAlign: "middle" }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                      <Chip label={m.role} size="small"
                        sx={{
                          bgcolor: m.role.toLowerCase() === "president" ? "#fef3c7" : "#f4f4f5",
                          color: m.role.toLowerCase() === "president" ? "#92400e" : "#555",
                          fontWeight: m.role.toLowerCase() === "president" ? 700 : 400,
                          fontSize: "0.72rem", height: 20,
                        }} />
                      {/* Sport badge for VP / Player Agent */}
                      {SPORT_ROLES.has(m.role) && m.sport && (
                        <Chip
                          label={m.sport === "baseball" ? "⚾ Baseball" : "🥎 Softball"}
                          size="small"
                          sx={{
                            bgcolor: m.sport === "baseball" ? "#e3f2fd" : "#fce4ec",
                            color:   m.sport === "baseball" ? "#1565c0" : "#c2185b",
                            fontSize: "0.68rem", height: 18, fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.82rem", color: "#555" }}>{m.email || "—"}</TableCell>
                  <TableCell sx={{ fontSize: "0.82rem", color: "#555" }}>{m.phone || "—"}</TableCell>
                  <TableCell>
                    <Chip label={m.is_active ? "Active" : "Inactive"} size="small"
                      sx={{ bgcolor: m.is_active ? "#e8f5e9" : "#f4f4f5", color: m.is_active ? "#2e7d32" : "#aaa", fontSize: "0.68rem", height: 18 }} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(m)} sx={{ color: "#888", "&:hover": { color: "#1565c0" } }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => handleDelete(m)} sx={{ color: "#ccc", "&:hover": { color: RED } }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <MemberDialog
        open={dialogOpen}
        initial={editing}
        roles={roles}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />
    </Box>
  )
}
