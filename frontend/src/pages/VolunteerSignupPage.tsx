import { useEffect, useState } from "react"
import ContactActions from "../components/ContactActions"
import client from "../api/client"
import PublicLinkBar from "../components/PublicLinkBar"
import { useAppSettings } from "../context/AppSettingsContext"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import ConstructionIcon from "@mui/icons-material/Construction"
import LocalCafeIcon from "@mui/icons-material/LocalCafe"
import PersonAddIcon from "@mui/icons-material/PersonAdd"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import CalendarTodayIcon from "@mui/icons-material/CalendarToday"
import DateRangeIcon from "@mui/icons-material/DateRange"
import BlockIcon from "@mui/icons-material/Block"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import {
  getVolunteerGames,
  createVolunteerSignup,
  deleteVolunteerSignup,
  toggleConcessionsClose,
  type VolunteerGame,
  type VolunteerSignup,
} from "../api/volunteer"

const RED = "#C41230"
const BLUE = "#1565c0"

// ── Volunteer chip ────────────────────────────────────────────────────────────

function VolunteerChip({
  signup,
  onRemove,
  isPublic = false,
}: {
  signup: VolunteerSignup
  onRemove: (id: number) => void
  isPublic?: boolean
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0.75,
        bgcolor: "#f4f4f5",
        borderRadius: 2,
        px: 1.25,
        py: 0.6,
        fontSize: "0.8rem",
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.8rem", fontWeight: 500 }}>{signup.volunteer_name}</Typography>
          {signup.volunteer_email && (
            <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>·&nbsp;{signup.volunteer_email}</Typography>
          )}
        </Box>
        {signup.notes && (
          <Typography sx={{ fontSize: "0.72rem", color: "#666", mt: 0.2, fontStyle: "italic" }}>
            📝 {signup.notes}
          </Typography>
        )}
      </Box>
      {!isPublic && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.25, flexShrink: 0 }}>
          <ContactActions
            name={signup.volunteer_name}
            email={signup.volunteer_email || undefined}
            phone={signup.volunteer_phone || undefined}
            subject={`WTLL Volunteer — ${signup.role_display || signup.role}`}
            size={14}
          />
          <Tooltip title="Remove">
            <Box
              component="span"
              onClick={() => onRemove(signup.id)}
              sx={{ cursor: "pointer", color: "#bbb", display: "flex", mt: 0.15, "&:hover": { color: RED } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}

// ── Slot section (one role per game) ─────────────────────────────────────────

function SlotSection({
  icon,
  label,
  color,
  signups,
  onAdd,
  onRemove,
  isPublic = false,
  closed = false,
  onToggleClosed,
}: {
  icon: React.ReactNode
  label: string
  color: string
  signups: VolunteerSignup[]
  onAdd: () => void
  onRemove: (id: number) => void
  isPublic?: boolean
  closed?: boolean
  onToggleClosed?: () => void
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
        <Box sx={{ color: closed ? "#aaa" : color, display: "flex" }}>{icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", color: closed ? "#aaa" : color }}>{label}</Typography>
        {closed ? (
          <Chip
            label="CLOSED"
            size="small"
            sx={{ bgcolor: "#fdecea", color: RED, fontWeight: 700, height: 18, fontSize: "0.66rem", border: `1px solid ${RED}40` }}
          />
        ) : (
          <Chip
            label={signups.length || "Open"}
            size="small"
            sx={{
              bgcolor: signups.length ? `${color}20` : "#f4f4f5",
              color: signups.length ? color : "#aaa",
              fontWeight: 700,
              height: 18,
              fontSize: "0.68rem",
              border: `1px solid ${signups.length ? color + "40" : "#e4e4e7"}`,
            }}
          />
        )}
        {/* Admin-only close toggle */}
        {!isPublic && onToggleClosed && (
          <Tooltip title={closed ? "Re-open concessions sign-up" : "Close concessions sign-up"}>
            <Box
              component="span"
              onClick={onToggleClosed}
              sx={{
                ml: "auto",
                cursor: "pointer",
                color: closed ? "#2e7d32" : "#aaa",
                display: "flex",
                "&:hover": { color: closed ? "#1b5e20" : RED },
              }}
            >
              {closed ? <LockOpenIcon sx={{ fontSize: 15 }} /> : <BlockIcon sx={{ fontSize: 15 }} />}
            </Box>
          </Tooltip>
        )}
      </Box>

      {closed ? (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontSize: "0.78rem", color: "#aaa", fontStyle: "italic" }}>
            {isPublic ? "Concessions sign-up is closed for this game." : "Closed — volunteers cannot sign up publicly."}
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1, minHeight: 28 }}>
            {signups.map((s) => (
              <VolunteerChip key={s.id} signup={s} onRemove={onRemove} isPublic={isPublic} />
            ))}
            {signups.length === 0 && (
              <Typography sx={{ fontSize: "0.78rem", color: "#bbb", alignSelf: "center" }}>No volunteers yet</Typography>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PersonAddIcon sx={{ fontSize: 14 }} />}
            onClick={onAdd}
            sx={{
              fontSize: "0.72rem", py: 0.4,
              minHeight: 36,
              borderColor: color, color,
              "&:hover": { borderColor: color, bgcolor: `${color}08` },
            }}
          >
            Sign Up
          </Button>
        </>
      )}
    </Box>
  )
}

// ── Single sign-up dialog ─────────────────────────────────────────────────────

function SignupDialog({
  open,
  game,
  defaultRole,
  onClose,
  onSave,
}: {
  open: boolean
  game: VolunteerGame | null
  defaultRole: "GROUNDS" | "CONCESSIONS"
  onClose: () => void
  onSave: (name: string, email: string, phone: string, role: "GROUNDS" | "CONCESSIONS", notes: string) => void
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"))

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"GROUNDS" | "CONCESSIONS">(defaultRole)
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setPhone(""); setRole(defaultRole); setNotes("")
    }
  }, [open, defaultRole])

  const valid = name.trim().length > 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Volunteer Sign-Up
        {game && (
          <Typography sx={{ fontSize: "0.8rem", color: "#777", fontWeight: 400, mt: 0.25 }}>
            {game.team_name}{game.opponent ? ` vs. ${game.opponent}` : ""} &nbsp;·&nbsp;{" "}
            {new Date(game.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <ToggleButtonGroup
            exclusive value={role}
            onChange={(_, v) => v && setRole(v)}
            size="small" fullWidth
          >
            <ToggleButton value="GROUNDS" sx={{ fontSize: "0.8rem", gap: 0.75, minHeight: 44, "&.Mui-selected": { bgcolor: `${BLUE}20`, color: BLUE, borderColor: BLUE } }}>
              <ConstructionIcon fontSize="small" /> Grounds Crew
            </ToggleButton>
            <ToggleButton value="CONCESSIONS" sx={{ fontSize: "0.8rem", gap: 0.75, minHeight: 44, "&.Mui-selected": { bgcolor: `${RED}15`, color: RED, borderColor: RED } }}>
              <LocalCafeIcon fontSize="small" /> Concessions
            </ToggleButton>
          </ToggleButtonGroup>
          <TextField label="Your Name" size="small" fullWidth required value={name} onChange={e => setName(e.target.value)} autoFocus inputProps={{ style: { fontSize: "1rem" } }} />
          <TextField label="Email (optional)" size="small" fullWidth type="email" value={email} onChange={e => setEmail(e.target.value)} inputProps={{ style: { fontSize: "1rem" } }} />
          <TextField label="Phone / Cell (optional)" size="small" fullWidth type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 317-555-1234" inputProps={{ style: { fontSize: "1rem" } }} />
          <TextField label="Notes (optional)" size="small" fullWidth placeholder="e.g. available from 5pm" value={notes} onChange={e => setNotes(e.target.value)} inputProps={{ style: { fontSize: "1rem" } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexDirection: { xs: "column", sm: "row" }, gap: { xs: 1, sm: 0 } }}>
        <Button onClick={onClose} color="inherit" fullWidth={fullScreen}>Cancel</Button>
        <Button
          variant="contained" disabled={!valid}
          onClick={() => onSave(name.trim(), email.trim(), phone.trim(), role, notes.trim())}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, minHeight: 44 }}
          fullWidth={fullScreen}
        >
          Sign Up
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Multi-day sign-up dialog ──────────────────────────────────────────────────

function MultiSignupDialog({
  open,
  games,
  onClose,
  onSave,
}: {
  open: boolean
  games: VolunteerGame[]
  onClose: () => void
  onSave: (name: string, email: string, phone: string, role: "GROUNDS" | "CONCESSIONS", notes: string, eventIds: number[]) => Promise<void>
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"))

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"GROUNDS" | "CONCESSIONS">("GROUNDS")
  const [notes, setNotes] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(""); setEmail(""); setPhone(""); setRole("GROUNDS"); setNotes(""); setSelected(new Set()); setError(null)
    }
  }, [open])

  const toggleGame = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(games.map(g => g.id)))
  const clearAll = () => setSelected(new Set())

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required."); return }
    if (selected.size === 0) { setError("Select at least one game."); return }
    setSaving(true); setError(null)
    try {
      await onSave(name.trim(), email.trim(), phone.trim(), role, notes.trim(), Array.from(selected))
      onClose()
    } catch {
      setError("Sign-up failed. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Sign Up for Multiple Games
        <Typography sx={{ fontSize: "0.8rem", color: "#777", fontWeight: 400, mt: 0.25 }}>
          Enter your info once, then select all the games you can help with.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Role toggle */}
          <ToggleButtonGroup
            exclusive value={role}
            onChange={(_, v) => v && setRole(v)}
            size="small" fullWidth
          >
            <ToggleButton value="GROUNDS" sx={{ gap: 0.75, minHeight: 44, "&.Mui-selected": { bgcolor: `${BLUE}20`, color: BLUE, borderColor: BLUE } }}>
              <ConstructionIcon fontSize="small" /> Grounds Crew
            </ToggleButton>
            <ToggleButton value="CONCESSIONS" sx={{ gap: 0.75, minHeight: 44, "&.Mui-selected": { bgcolor: `${RED}15`, color: RED, borderColor: RED } }}>
              <LocalCafeIcon fontSize="small" /> Concessions
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Contact info */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField label="Your Name" size="small" fullWidth required value={name} onChange={e => setName(e.target.value)} autoFocus />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label="Email (optional)" size="small" fullWidth type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <TextField label="Phone (optional)" size="small" fullWidth type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="317-555-1234" />
            </Box>
            <TextField label="Notes (optional)" size="small" fullWidth value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. can only stay until 9pm" />
          </Box>

          {/* Game selection */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                Select Games ({selected.size} of {games.length} selected)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Typography
                  component="span"
                  onClick={selectAll}
                  sx={{ fontSize: "0.75rem", color: BLUE, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  All
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: "#ccc" }}>|</Typography>
                <Typography
                  component="span"
                  onClick={clearAll}
                  sx={{ fontSize: "0.75rem", color: "#888", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  Clear
                </Typography>
              </Box>
            </Box>
            <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, maxHeight: 280, overflow: "auto" }}>
              <List disablePadding>
                {games.length === 0 ? (
                  <ListItem sx={{ py: 2 }}>
                    <Typography sx={{ color: "#aaa", fontSize: "0.85rem" }}>No upcoming games available.</Typography>
                  </ListItem>
                ) : (
                  games.map((g, i) => {
                    const isChecked = selected.has(g.id)
                    const isClosed = g.concessions_closed && role === "CONCESSIONS"
                    return (
                      <ListItem
                        key={g.id}
                        disablePadding
                        sx={{ borderTop: i > 0 ? "1px solid #f4f4f5" : undefined }}
                      >
                        <FormControlLabel
                          disabled={isClosed}
                          control={
                            <Checkbox
                              checked={isChecked}
                              onChange={() => toggleGame(g.id)}
                              size="small"
                              sx={{ color: isChecked ? RED : undefined, "&.Mui-checked": { color: RED } }}
                            />
                          }
                          label={
                            <Box sx={{ py: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: isClosed ? "#aaa" : "#111" }}>
                                  {g.team_name}{g.opponent ? ` vs. ${g.opponent}` : ""}
                                </Typography>
                                {isClosed && (
                                  <Chip label="Closed" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "#fdecea", color: RED }} />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: "0.74rem", color: "#888" }}>
                                {new Date(g.start_time).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                {" · "}
                                {new Date(g.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                {g.division_name ? ` · ${g.division_name}` : ""}
                              </Typography>
                            </Box>
                          }
                          sx={{ mx: 0, width: "100%", px: 1.5 }}
                        />
                      </ListItem>
                    )
                  })
                )}
              </List>
            </Paper>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 } }}>
        <Button onClick={onClose} color="inherit" disabled={saving} fullWidth={fullScreen}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || selected.size === 0 || !name.trim()}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" }, minHeight: 44 }}
          fullWidth={fullScreen}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : `Sign Up for ${selected.size} Game${selected.size !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByDate(games: VolunteerGame[]): Record<string, VolunteerGame[]> {
  return games.reduce((acc, g) => {
    const key = new Date(g.start_time).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    })
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {} as Record<string, VolunteerGame[]>)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VolunteerSignupPage({ isPublic = false }: { isPublic?: boolean }) {
  const { settings } = useAppSettings()
  const [games, setGames] = useState<VolunteerGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  // Single signup dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeGame, setActiveGame] = useState<VolunteerGame | null>(null)
  const [activeRole, setActiveRole] = useState<"GROUNDS" | "CONCESSIONS">("GROUNDS")
  const [saving, setSaving] = useState(false)

  // Multi signup dialog
  const [multiOpen, setMultiOpen] = useState(false)

  const load = async (all = showAll) => {
    setLoading(true); setError(null)
    try {
      setGames(await getVolunteerGames(all))
    } catch {
      setError("Failed to load games.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [showAll]) // eslint-disable-line

  const openDialog = (game: VolunteerGame, role: "GROUNDS" | "CONCESSIONS") => {
    setActiveGame(game); setActiveRole(role); setDialogOpen(true)
  }

  const handleSave = async (name: string, email: string, phone: string, role: "GROUNDS" | "CONCESSIONS", notes: string) => {
    if (!activeGame) return
    setSaving(true)
    try {
      await createVolunteerSignup({ event_id: activeGame.id, volunteer_name: name, volunteer_email: email, volunteer_phone: phone, role, notes })
      setDialogOpen(false)
      await load()
    } catch {
      setError("Sign-up failed. Please try again.")
    } finally { setSaving(false) }
  }

  const handleMultiSave = async (name: string, email: string, phone: string, role: "GROUNDS" | "CONCESSIONS", notes: string, eventIds: number[]) => {
    await createVolunteerSignup({ event_ids: eventIds, volunteer_name: name, volunteer_email: email, volunteer_phone: phone, role, notes })
    await load()
  }

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this volunteer?")) return
    try {
      await deleteVolunteerSignup(id)
      await load()
    } catch { setError("Failed to remove volunteer.") }
  }

  const handleToggleConcessions = async (game: VolunteerGame) => {
    try {
      const result = await toggleConcessionsClose(game.id)
      setGames(prev => prev.map(g => g.id === game.id ? { ...g, concessions_closed: result.concessions_closed } : g))
    } catch { setError("Failed to update concessions status.") }
  }

  const grouped = groupByDate(games)

  return (
    <Box>
      {/* Public link bar — admin only */}
      {!isPublic && (
        <PublicLinkBar
          publicPath="/public/volunteer-signups"
          live={settings.signups.volunteer}
          secondaryColor={settings.secondaryColor}
        />
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Volunteer Sign-Ups</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Sign up to help with Grounds Crew or Concessions Stand for upcoming games.
        </Typography>
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip
            label={<><ConstructionIcon sx={{ fontSize: 13, mr: 0.5 }} />Grounds Crew</>}
            size="small"
            sx={{ bgcolor: "#e3f2fd", color: BLUE, fontWeight: 600, border: "1px solid #90caf9" }}
          />
          <Chip
            label={<><LocalCafeIcon sx={{ fontSize: 13, mr: 0.5 }} />Concessions</>}
            size="small"
            sx={{ bgcolor: "#fce4ec", color: RED, fontWeight: 600, border: `1px solid ${RED}40` }}
          />
        </Box>

        {/* Multi-signup button */}
        {!loading && games.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DateRangeIcon />}
            onClick={() => setMultiOpen(true)}
            sx={{ fontSize: "0.78rem", borderColor: RED, color: RED, "&:hover": { borderColor: RED, bgcolor: `${RED}08` }, minHeight: 36 }}
          >
            Sign Up for Multiple Games
          </Button>
        )}

        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant={showAll ? "contained" : "outlined"}
          color="inherit"
          startIcon={<CalendarTodayIcon />}
          onClick={() => setShowAll(v => !v)}
          sx={{ fontSize: "0.78rem", minHeight: 36 }}
        >
          {showAll ? "Showing All Games" : "Upcoming Only"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : games.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 8, textAlign: "center" }}>
          <CalendarTodayIcon sx={{ fontSize: 48, color: "#e4e4e7", mb: 1 }} />
          <Typography sx={{ color: "#aaa" }}>No upcoming games found.</Typography>
        </Paper>
      ) : (
        Object.entries(grouped).map(([date, dayGames]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#444" }}>{date}</Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            {dayGames.map((game) => (
              <Paper
                key={game.id}
                elevation={0}
                sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: { xs: 1.75, sm: 2.5 }, mb: 1.5 }}
              >
                {/* Game header */}
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {game.team_name}{game.opponent ? ` vs. ${game.opponent}` : ""}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ fontSize: "0.78rem", color: "#777" }}>
                        {formatTime(game.start_time)}{game.end_time ? ` – ${formatTime(game.end_time)}` : ""}
                      </Typography>
                      {game.location && (
                        <Typography sx={{ fontSize: "0.78rem", color: "#777" }}>📍 {game.location}</Typography>
                      )}
                      {game.division_name && (
                        <Chip label={game.division_name} size="small" sx={{ height: 18, fontSize: "0.68rem", bgcolor: "#f4f4f5" }} />
                      )}
                    </Box>
                  </Box>

                  {/* Quick counts */}
                  <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                    <Chip
                      icon={<ConstructionIcon sx={{ fontSize: 13 }} />}
                      label={game.grounds_count}
                      size="small"
                      sx={{ bgcolor: "#e3f2fd", color: BLUE, fontWeight: 700, height: 22 }}
                    />
                    <Chip
                      icon={<LocalCafeIcon sx={{ fontSize: 13 }} />}
                      label={game.concessions_closed ? "🚫" : game.concessions_count}
                      size="small"
                      sx={{ bgcolor: game.concessions_closed ? "#fdecea" : "#fce4ec", color: RED, fontWeight: 700, height: 22 }}
                    />
                  </Box>
                </Box>

                {/* Slots */}
                <Box sx={{ display: "flex", gap: { xs: 2, sm: 3 }, flexDirection: { xs: "column", sm: "row" } }}>
                  <SlotSection
                    icon={<ConstructionIcon fontSize="small" />}
                    label="Grounds Crew"
                    color={BLUE}
                    signups={game.grounds_crew}
                    onAdd={() => openDialog(game, "GROUNDS")}
                    onRemove={handleRemove}
                    isPublic={isPublic}
                  />
                  <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                  <SlotSection
                    icon={<LocalCafeIcon fontSize="small" />}
                    label="Concessions Stand"
                    color={RED}
                    signups={game.concessions}
                    onAdd={() => openDialog(game, "CONCESSIONS")}
                    onRemove={handleRemove}
                    isPublic={isPublic}
                    closed={game.concessions_closed}
                    onToggleClosed={!isPublic ? () => handleToggleConcessions(game) : undefined}
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        ))
      )}

      <SignupDialog
        open={dialogOpen}
        game={activeGame}
        defaultRole={activeRole}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      <MultiSignupDialog
        open={multiOpen}
        games={games}
        onClose={() => setMultiOpen(false)}
        onSave={handleMultiSave}
      />
    </Box>
  )
}
