/**
 * SettingsPage — admin-only user management + site configuration.
 *
 * Users tab:
 *   - Table of all user accounts with role chips
 *   - Invite new users (pre-create with role + send magic link)
 *   - Inline editing of name, roles, active status
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, IconButton, InputAdornment,
  MenuItem, Paper, Select, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import CheckIcon from "@mui/icons-material/Check"
import CloseIcon from "@mui/icons-material/Close"
import EditIcon from "@mui/icons-material/Edit"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import LinkIcon from "@mui/icons-material/Link"
import MailOutlineIcon from "@mui/icons-material/MailOutline"
import PaletteIcon from "@mui/icons-material/Palette"
import PersonIcon from "@mui/icons-material/Person"
import SearchIcon from "@mui/icons-material/Search"
import SettingsIcon from "@mui/icons-material/Settings"
import SportsIcon from "@mui/icons-material/Sports"
import TuneIcon from "@mui/icons-material/Tune"
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism"
import client from "../api/client"
import { useAuth } from "../context/AuthContext"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManagedUser {
  id: number
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_board_member: boolean
  is_coach: boolean
  is_umpire: boolean
  is_active: boolean
  last_login: string | null
  date_joined: string | null
}

const ROLE_CHIPS: { key: keyof ManagedUser; label: string; color: string; bg: string }[] = [
  { key: "is_staff",        label: "Admin",  color: "#C41230", bg: "#fdecea" },
  { key: "is_board_member", label: "Board",  color: "#6a1b9a", bg: "#f3e5f5" },
  { key: "is_coach",        label: "Coach",  color: "#1565c0", bg: "#e3f2fd" },
  { key: "is_umpire",       label: "Umpire", color: "#e65100", bg: "#fff3e0" },
]

const EMPTY_INVITE = {
  email: "", first_name: "", last_name: "",
  is_board_member: false, is_coach: false, is_umpire: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function RoleChips({ user }: { user: ManagedUser }) {
  const active = ROLE_CHIPS.filter(r => user[r.key])
  if (!active.length) return <Typography sx={{ fontSize: "0.75rem", color: "#bbb" }}>No roles</Typography>
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {active.map(r => (
        <Chip key={r.key} label={r.label} size="small"
          sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: r.bg, color: r.color }} />
      ))}
    </Box>
  )
}

// ── Invite dialog ─────────────────────────────────────────────────────────────

function InviteDialog({ open, onClose, onInvited }: {
  open: boolean
  onClose: () => void
  onInvited: (u: ManagedUser) => void
}) {
  const [form, setForm] = useState({ ...EMPTY_INVITE })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (open) { setForm({ ...EMPTY_INVITE }); setError(null); setSent(false) }
  }, [open])

  const send = async () => {
    if (!form.email.trim()) { setError("Email is required."); return }
    setSaving(true); setError(null)
    try {
      const res = await client.post("/auth/users/invite/", form)
      onInvited(res.data)
      setSent(true)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Invite failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <MailOutlineIcon fontSize="small" sx={{ color: "#C41230" }} />
        Invite User
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        {sent ? (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CheckIcon sx={{ fontSize: 48, color: "#2e7d32", mb: 1 }} />
            <Typography variant="h6" fontWeight={700}>Invite sent!</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              A magic link has been emailed to <strong>{form.email}</strong>.
            </Typography>
          </Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>}

            <TextField
              label="Email address *" size="small" fullWidth
              value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="coach@example.com"
              InputProps={{ startAdornment: <InputAdornment position="start"><MailOutlineIcon sx={{ fontSize: 16, color: "#aaa" }} /></InputAdornment> }}
            />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <TextField label="First Name" size="small" value={form.first_name}
                onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
              <TextField label="Last Name" size="small" value={form.last_name}
                onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
            </Box>

            <Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
                Roles
              </Typography>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {[
                  { key: "is_board_member" as const, label: "Board Member", color: "#6a1b9a" },
                  { key: "is_coach" as const,        label: "Coach",        color: "#1565c0" },
                  { key: "is_umpire" as const,       label: "Umpire",       color: "#e65100" },
                ].map(r => (
                  <FormControlLabel key={r.key}
                    control={
                      <Checkbox size="small" checked={form[r.key]}
                        onChange={e => setForm(p => ({ ...p, [r.key]: e.target.checked }))}
                        sx={{ color: r.color, "&.Mui-checked": { color: r.color } }} />
                    }
                    label={<Typography sx={{ fontSize: "0.85rem" }}>{r.label}</Typography>}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {sent ? (
          <Button variant="contained" onClick={onClose}
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" } }}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} color="inherit" sx={{ color: "#888" }}>Cancel</Button>
            <Button variant="contained" onClick={send} disabled={saving || !form.email.trim()}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <MailOutlineIcon />}
              sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
              Send Invite
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ── Inline user editor row ────────────────────────────────────────────────────

function UserRow({ user, currentUserId, onUpdated }: {
  user: ManagedUser
  currentUserId: number
  onUpdated: (u: ManagedUser) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<ManagedUser>({ ...user })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) setDraft({ ...user })
  }, [expanded, user])

  const save = async () => {
    setSaving(true); setError(null)
    try {
      const res = await client.patch(`/auth/users/${user.id}/`, {
        first_name: draft.first_name,
        last_name: draft.last_name,
        is_board_member: draft.is_board_member,
        is_coach: draft.is_coach,
        is_umpire: draft.is_umpire,
        is_active: draft.is_active,
      })
      onUpdated(res.data)
      setExpanded(false)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  const isSelf = user.id === currentUserId

  return (
    <Box sx={{ borderBottom: "1px solid #f0f0f0" }}>
      {/* Collapsed row */}
      <Box
        onClick={() => setExpanded(e => !e)}
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 160px 140px 120px 32px",
          alignItems: "center",
          gap: 2, px: 2, py: 1.25,
          cursor: "pointer",
          bgcolor: expanded ? "#fafbff" : "transparent",
          "&:hover": { bgcolor: "#fafbff" },
          opacity: user.is_active ? 1 : 0.5,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>
            {[user.first_name, user.last_name].filter(Boolean).join(" ") || <em style={{ color: "#aaa" }}>No name</em>}
            {isSelf && <Chip label="You" size="small" sx={{ ml: 1, height: 16, fontSize: "0.6rem", bgcolor: "#e8f5e9", color: "#2e7d32" }} />}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>{user.email}</Typography>
        </Box>
        <RoleChips user={user} />
        <Typography sx={{ fontSize: "0.75rem", color: "#aaa" }}>
          {user.last_login ? formatDate(user.last_login) : "Never signed in"}
        </Typography>
        <Chip
          label={user.is_active ? "Active" : "Inactive"}
          size="small"
          sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700,
            bgcolor: user.is_active ? "#e8f5e9" : "#f5f5f5",
            color: user.is_active ? "#2e7d32" : "#aaa" }}
        />
        <ExpandMoreIcon sx={{
          fontSize: 18, color: "#bbb",
          transform: expanded ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </Box>

      {/* Expanded edit panel */}
      {expanded && (
        <Box sx={{ px: 2, py: 2, bgcolor: "#fafbff", borderTop: "1px solid #f0f0f0" }}>
          {error && <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>{error}</Alert>}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
            <TextField label="First Name" size="small" value={draft.first_name}
              onChange={e => setDraft(d => ({ ...d, first_name: e.target.value }))} />
            <TextField label="Last Name" size="small" value={draft.last_name}
              onChange={e => setDraft(d => ({ ...d, last_name: e.target.value }))} />
          </Box>

          <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
            Roles
          </Typography>
          <Box sx={{ display: "flex", gap: 2.5, flexWrap: "wrap", mb: 2 }}>
            {/* Admin — read-only display */}
            <Tooltip title="Admin status is managed via Django admin">
              <FormControlLabel
                control={<Checkbox size="small" checked={draft.is_staff} disabled
                  sx={{ "&.Mui-checked": { color: "#C41230" } }} />}
                label={<Typography sx={{ fontSize: "0.82rem", color: "#bbb" }}>Admin</Typography>}
              />
            </Tooltip>
            {[
              { key: "is_board_member" as const, label: "Board Member", color: "#6a1b9a" },
              { key: "is_coach" as const,        label: "Coach",        color: "#1565c0" },
              { key: "is_umpire" as const,       label: "Umpire",       color: "#e65100" },
            ].map(r => (
              <FormControlLabel key={r.key}
                control={
                  <Checkbox size="small" checked={draft[r.key]}
                    onChange={e => setDraft(d => ({ ...d, [r.key]: e.target.checked }))}
                    sx={{ color: r.color, "&.Mui-checked": { color: r.color } }} />
                }
                label={<Typography sx={{ fontSize: "0.82rem" }}>{r.label}</Typography>}
              />
            ))}
          </Box>

          {!isSelf && (
            <FormControlLabel
              control={
                <Switch size="small" checked={draft.is_active}
                  onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
              }
              label={<Typography sx={{ fontSize: "0.82rem" }}>Account active</Typography>}
              sx={{ mb: 2 }}
            />
          )}

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={save} disabled={saving}
              startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <CheckIcon />}
              sx={{ bgcolor: "#1565c0", "&:hover": { bgcolor: "#0d47a1" }, fontSize: "0.78rem" }}>
              Save
            </Button>
            <Button size="small" onClick={() => setExpanded(false)}
              startIcon={<CloseIcon />}
              sx={{ fontSize: "0.78rem", color: "#888" }}>
              Cancel
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// ── Site Settings types ───────────────────────────────────────────────────────

interface SiteSettingsData {
  umpire_signups_enabled: boolean
  volunteer_signups_enabled: boolean
  magic_link_expiry_minutes: number
  default_program_id: number | null
  default_program_name: string | null
}

interface LeagueIdentityData {
  league_name: string
  short_name: string
  tagline: string
  city: string
  state: string
  contact_email: string
  website_url: string
  primary_color: string
  secondary_color: string
}

interface ProgramOption {
  id: number
  name: string
  season_year: number
  is_active: boolean
  season_closed: boolean
}

// ── SettingRow helper ─────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 3, py: 2 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{label}</Typography>
        {description && <Typography sx={{ fontSize: "0.75rem", color: "#888", mt: 0.25 }}>{description}</Typography>}
      </Box>
      <Box sx={{ flexShrink: 0 }}>{children}</Box>
    </Box>
  )
}

// ── Site Settings tab ─────────────────────────────────────────────────────────

function SiteSettingsTab() {
  const [data, setData] = useState<SiteSettingsData | null>(null)
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      client.get("/settings/site/"),
      client.get("/program-years/"),
    ]).then(([s, p]) => {
      setData(s.data)
      setPrograms(p.data ?? [])
    }).catch(() => setError("Failed to load site settings."))
      .finally(() => setLoading(false))
  }, [])

  const patch = async (field: string, value: unknown) => {
    if (!data) return
    setSaving(field); setSaved(null)
    try {
      const res = await client.patch("/settings/site/", { [field]: value })
      setData(res.data)
      setSaved(field)
      setTimeout(() => setSaved(null), 2000)
    } catch {
      setError("Save failed.")
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>
  if (!data) return null

  const activePrograms = programs.filter(p => p.is_active && !p.season_closed)

  return (
    <Box sx={{ maxWidth: 680 }}>
      {/* Public page access */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <TuneIcon sx={{ fontSize: 16, color: "#888" }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
            Public Pages
          </Typography>
        </Box>
        <Typography sx={{ fontSize: "0.78rem", color: "#aaa", mb: 1.5 }}>
          Controls whether public sign-up forms are accepting submissions.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, px: 2, mb: 3 }}>
        <SettingRow
          label="Umpire Sign-Ups"
          description="Opens the public umpire sign-up page for game assignments."
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {saved === "umpire_signups_enabled" && <CheckIcon sx={{ fontSize: 16, color: "#2e7d32" }} />}
            <Switch
              checked={data.umpire_signups_enabled}
              disabled={saving === "umpire_signups_enabled"}
              onChange={e => patch("umpire_signups_enabled", e.target.checked)}
              sx={{ "& .MuiSwitch-thumb": { bgcolor: data.umpire_signups_enabled ? "#2e7d32" : undefined } }}
            />
            <Chip
              label={data.umpire_signups_enabled ? "Live" : "Disabled"}
              size="small"
              icon={<SportsIcon sx={{ fontSize: "12px !important" }} />}
              sx={{
                height: 20, fontSize: "0.65rem", fontWeight: 700,
                bgcolor: data.umpire_signups_enabled ? "#e8f5e9" : "#f5f5f5",
                color: data.umpire_signups_enabled ? "#2e7d32" : "#aaa",
                "& .MuiChip-icon": { color: data.umpire_signups_enabled ? "#2e7d32" : "#ccc" },
              }}
            />
          </Box>
        </SettingRow>

        <Divider />

        <SettingRow
          label="Volunteer Sign-Ups"
          description="Opens the public volunteer sign-up page for grounds crew and concessions."
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {saved === "volunteer_signups_enabled" && <CheckIcon sx={{ fontSize: 16, color: "#2e7d32" }} />}
            <Switch
              checked={data.volunteer_signups_enabled}
              disabled={saving === "volunteer_signups_enabled"}
              onChange={e => patch("volunteer_signups_enabled", e.target.checked)}
            />
            <Chip
              label={data.volunteer_signups_enabled ? "Live" : "Disabled"}
              size="small"
              icon={<VolunteerActivismIcon sx={{ fontSize: "12px !important" }} />}
              sx={{
                height: 20, fontSize: "0.65rem", fontWeight: 700,
                bgcolor: data.volunteer_signups_enabled ? "#e8f5e9" : "#f5f5f5",
                color: data.volunteer_signups_enabled ? "#2e7d32" : "#aaa",
                "& .MuiChip-icon": { color: data.volunteer_signups_enabled ? "#2e7d32" : "#ccc" },
              }}
            />
          </Box>
        </SettingRow>
      </Paper>

      {/* Authentication */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <PersonIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Authentication
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, px: 2, mb: 3 }}>
        <SettingRow
          label="Magic Link Expiry"
          description="How long a sign-in link stays valid after it's sent. Increase for umpires who may not check email immediately."
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {saved === "magic_link_expiry_minutes" && <CheckIcon sx={{ fontSize: 16, color: "#2e7d32" }} />}
            <Select
              size="small"
              value={data.magic_link_expiry_minutes}
              disabled={saving === "magic_link_expiry_minutes"}
              onChange={e => patch("magic_link_expiry_minutes", Number(e.target.value))}
              sx={{ fontSize: "0.82rem", minWidth: 140 }}
            >
              <MenuItem value={15}>15 minutes</MenuItem>
              <MenuItem value={30}>30 minutes</MenuItem>
              <MenuItem value={60}>1 hour</MenuItem>
              <MenuItem value={120}>2 hours</MenuItem>
              <MenuItem value={1440}>24 hours</MenuItem>
            </Select>
          </Box>
        </SettingRow>
      </Paper>

      {/* Season */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <TuneIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Season
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, px: 2 }}>
        <SettingRow
          label="Default Program Year"
          description="The active program pages like pitch log default to when no specific year is selected."
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {saved === "default_program_id" && <CheckIcon sx={{ fontSize: 16, color: "#2e7d32" }} />}
            <Select
              size="small"
              value={data.default_program_id ?? ""}
              disabled={saving === "default_program_id"}
              onChange={e => patch("default_program_id", e.target.value === "" ? null : Number(e.target.value))}
              displayEmpty
              sx={{ fontSize: "0.82rem", minWidth: 200 }}
            >
              <MenuItem value=""><em style={{ color: "#aaa" }}>None selected</em></MenuItem>
              {activePrograms.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} ({p.season_year})
                </MenuItem>
              ))}
            </Select>
          </Box>
        </SettingRow>
      </Paper>
    </Box>
  )
}

// ── League Identity tab ───────────────────────────────────────────────────────

function LeagueIdentityTab() {
  const [data, setData] = useState<LeagueIdentityData | null>(null)
  const [draft, setDraft] = useState<LeagueIdentityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    client.get("/settings/league-identity/")
      .then(r => { setData(r.data); setDraft(r.data) })
      .catch(() => setError("Failed to load league identity."))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await client.patch("/settings/league-identity/", draft)
      setData(res.data); setDraft(res.data); setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Save failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof LeagueIdentityData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => d ? { ...d, [k]: e.target.value } : d)

  const isDirty = JSON.stringify(draft) !== JSON.stringify(data)

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
  if (error && !draft) return <Alert severity="error">{error}</Alert>
  if (!draft) return null

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Typography sx={{ fontSize: "0.82rem", color: "#888", mb: 3 }}>
        Used in emails, public pages, and — long-term — for white-label customization when licensing the platform to other leagues.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Names */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <PersonIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Names
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Full League Name" size="small" fullWidth
            value={draft.league_name} onChange={set("league_name")}
            helperText='e.g. "Washington Township Little League"' />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <TextField label="Short Name / Abbreviation" size="small"
              value={draft.short_name} onChange={set("short_name")}
              helperText='e.g. "WTLL"' />
            <TextField label="Tagline" size="small"
              value={draft.tagline} onChange={set("tagline")}
              placeholder="Optional short tagline" />
          </Box>
        </Box>
      </Paper>

      {/* Location */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <TuneIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Location
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 2 }}>
          <TextField label="City" size="small" value={draft.city} onChange={set("city")} />
          <TextField label="State" size="small" value={draft.state} onChange={set("state")} />
        </Box>
      </Paper>

      {/* Contact */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <MailOutlineIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Contact
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Contact Email" size="small" type="email" fullWidth
            value={draft.contact_email} onChange={set("contact_email")}
            helperText="Shown on public pages and used in outbound emails" />
          <TextField label="Website URL" size="small" fullWidth
            value={draft.website_url} onChange={set("website_url")}
            placeholder="https://wtll.org"
            InputProps={{ startAdornment: <InputAdornment position="start"><LinkIcon sx={{ fontSize: 14, color: "#aaa" }} /></InputAdornment> }}
          />
        </Box>
      </Paper>

      {/* Branding */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <PaletteIcon sx={{ fontSize: 16, color: "#888" }} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>
          Brand Colors
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Box>
            <TextField label="Primary Color" size="small" fullWidth
              value={draft.primary_color} onChange={set("primary_color")}
              helperText='Hex code e.g. "#C41230"'
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: draft.primary_color, border: "1px solid #ddd", flexShrink: 0 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box>
            <TextField label="Secondary Color" size="small" fullWidth
              value={draft.secondary_color} onChange={set("secondary_color")}
              helperText='Hex code e.g. "#1565c0"'
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: draft.secondary_color, border: "1px solid #ddd", flexShrink: 0 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
        <Typography sx={{ fontSize: "0.72rem", color: "#aaa", mt: 1.5 }}>
          Color changes apply to emails and public pages. Full in-app theming will be available in a future release.
        </Typography>
      </Paper>

      {/* Save */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Button variant="contained" onClick={save} disabled={saving || !isDirty}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : saved ? <CheckIcon /> : undefined}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          {saved ? "Saved!" : "Save Changes"}
        </Button>
        {isDirty && !saving && (
          <Button onClick={() => setDraft(data)} color="inherit" sx={{ color: "#888" }}>
            Discard
          </Button>
        )}
        {!isDirty && saved && (
          <Typography sx={{ fontSize: "0.8rem", color: "#2e7d32" }}>Changes saved.</Typography>
        )}
      </Box>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user: currentUser } = useAuth()
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)

  // Admin guard
  if (currentUser && !currentUser.is_staff) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <Typography color="text.secondary">Admin access required.</Typography>
      </Box>
    )
  }

  useEffect(() => {
    client.get("/auth/users/")
      .then(r => setUsers(r.data ?? []))
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false))
  }, [])

  const handleInvited = (u: ManagedUser) => {
    setUsers(prev => {
      const existing = prev.findIndex(x => x.id === u.id)
      if (existing >= 0) {
        const next = [...prev]; next[existing] = u; return next
      }
      return [...prev, u].sort((a, b) => a.email.localeCompare(b.email))
    })
  }

  const handleUpdated = (u: ManagedUser) => {
    setUsers(prev => prev.map(x => x.id === u.id ? u : x))
  }

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    )
  })

  const activeCount = users.filter(u => u.is_active).length

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Settings</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage user accounts, roles, and platform configuration.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 44 } }}>
          <Tab label="Users" icon={<PersonIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Site Settings" icon={<TuneIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="League Identity" icon={<PaletteIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Users tab */}
      {tab === 0 && (
        <>
          {/* Toolbar */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
            <TextField
              size="small" placeholder="Search by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: "#aaa" }} /></InputAdornment> }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
              {activeCount} active · {users.length} total
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => setInviteOpen(true)}
              sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700, flexShrink: 0 }}>
              Invite User
            </Button>
          </Box>

          <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={u => { handleInvited(u); setInviteOpen(false) }} />

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            {/* Table header */}
            <Box sx={{
              display: "grid", gridTemplateColumns: "1fr 160px 140px 120px 32px",
              gap: 2, px: 2, py: 1,
              bgcolor: "#f9fafb", borderBottom: "1px solid #e4e4e7",
            }}>
              {["User", "Roles", "Last Login", "Status", ""].map((h, i) => (
                <Typography key={i} sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {h}
                </Typography>
              ))}
            </Box>

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            )}
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            {!loading && !error && filtered.length === 0 && (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography sx={{ color: "#aaa", fontSize: "0.88rem" }}>
                  {search ? "No users match your search." : "No users yet — invite someone to get started."}
                </Typography>
              </Box>
            )}

            {filtered.map(u => (
              <UserRow key={u.id} user={u} currentUserId={currentUser?.id ?? -1} onUpdated={handleUpdated} />
            ))}
          </Paper>
        </>
      )}

      {tab === 1 && <SiteSettingsTab />}
      {tab === 2 && <LeagueIdentityTab />}
    </Box>
  )
}
