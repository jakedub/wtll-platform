import { useEffect, useState } from "react";
import client from "../api/client";
import ContactActions from "../components/ContactActions";
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
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Paper,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SportsIcon from "@mui/icons-material/Sports";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import DateRangeIcon from "@mui/icons-material/DateRange";
import { umpireApi, UmpireGame, UmpireSignup, BatchUmpireSignupItem } from "../api/umpire";

type Role = "PLATE" | "BASE";

interface SlotInfo {
  game: UmpireGame;
  role: Role;
}

interface FormValues {
  umpire_name: string;
  umpire_email: string;
  umpire_phone: string;
  role: Role;
}

const ROLE_LABELS: Record<Role, string> = {
  PLATE: "Plate Umpire",
  BASE: "Base Umpire",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function SlotChip({
  signup,
  role,
  onRelease,
  isPublic = false,
}: {
  signup: UmpireSignup | undefined;
  role: Role;
  onRelease: (id: number) => void;
  isPublic?: boolean;
}) {
  if (signup) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.5,
          bgcolor: "rgba(196, 18, 48, 0.07)",
          border: "1px solid rgba(196, 18, 48, 0.25)",
          borderRadius: 1.5,
          minWidth: 0,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 15, color: "#C41230", flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#C41230",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {signup.umpire_name}
          </Typography>
          <Typography sx={{ fontSize: "0.68rem", color: "#888", lineHeight: 1.2 }}>
            {ROLE_LABELS[role]}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, ml: "auto" }}>
          {!isPublic && (
            <>
              <ContactActions
                name={signup.umpire_name}
                email={signup.umpire_email || undefined}
                phone={signup.umpire_phone || undefined}
                subject={`WTLL Umpire Assignment — ${ROLE_LABELS[role]}`}
                size={14}
              />
              <Tooltip title="Release slot">
                <IconButton
                  size="small"
                  onClick={() => onRelease(signup.id)}
                  sx={{ p: 0.25, color: "#bbb", "&:hover": { color: "#C41230" } }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        bgcolor: "#f9f9f9",
        border: "1px dashed #d4d4d8",
        borderRadius: 1.5,
      }}
    >
      <RadioButtonUncheckedIcon sx={{ fontSize: 15, color: "#aaa", flexShrink: 0 }} />
      <Typography sx={{ fontSize: "0.75rem", color: "#aaa" }}>
        {ROLE_LABELS[role]} — Open
      </Typography>
    </Box>
  );
}

function GameCard({
  game,
  onClaim,
  onRelease,
  isPublic = false,
}: {
  game: UmpireGame;
  onClaim: (info: SlotInfo) => void;
  onRelease: (signupId: number) => void;
  isPublic?: boolean;
}) {
  const plate = game.umpire_signups.find((s) => s.role === "PLATE");
  const base = game.umpire_signups.find((s) => s.role === "BASE");
  const fullyStaffed = game.plate_filled && game.base_filled;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: fullyStaffed ? "rgba(46, 125, 50, 0.3)" : "#e4e4e7",
        borderRadius: 2,
        p: { xs: 1.75, sm: 2 },
        bgcolor: "#fff",
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: "0 2px 12px rgba(0,0,0,0.07)" },
      }}
    >
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1.25 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.5 }}>
            <Chip
              label={game.division_name}
              size="small"
              sx={{ bgcolor: "#1c1c1e", color: "#fff", fontWeight: 700, fontSize: "0.68rem", height: 20, letterSpacing: "0.04em" }}
            />
            {fullyStaffed && (
              <Chip
                label="Staffed"
                size="small"
                sx={{ bgcolor: "rgba(46, 125, 50, 0.1)", color: "#2e7d32", fontWeight: 700, fontSize: "0.68rem", height: 20, border: "1px solid rgba(46,125,50,0.3)" }}
              />
            )}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", lineHeight: 1.3 }}>
            {game.team_name}
            {game.opponent ? (
              <Typography component="span" sx={{ fontWeight: 400, color: "#666", fontSize: "0.9rem" }}>
                {" "}vs. {game.opponent}
              </Typography>
            ) : null}
          </Typography>
        </Box>
      </Box>

      {/* Meta row */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <CalendarTodayIcon sx={{ fontSize: 13, color: "#888" }} />
          <Typography sx={{ fontSize: "0.8rem", color: "#555" }}>
            {formatDate(game.start_time)} · {formatTime(game.start_time)}
          </Typography>
        </Box>
        {game.location && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: 13, color: "#888" }} />
            <Typography sx={{ fontSize: "0.8rem", color: "#555" }}>{game.location}</Typography>
          </Box>
        )}
        {game.field && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.2, bgcolor: "#f4f4f5", borderRadius: 1, border: "1px solid #e4e4e7" }}>
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#555" }}>{game.field}</Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 1.5 }} />

      {/* Slots */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Box sx={{ display: "flex", gap: 1, flex: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 160 } }}>
            <SlotChip signup={plate} role="PLATE" onRelease={onRelease} isPublic={isPublic} />
          </Box>
          <Box sx={{ flex: 1, minWidth: { xs: "100%", sm: 160 } }}>
            <SlotChip signup={base} role="BASE" onRelease={onRelease} isPublic={isPublic} />
          </Box>
        </Box>

        {(!game.plate_filled || !game.base_filled) && (
          <Button
            variant="contained"
            size="small"
            startIcon={<SportsIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              const defaultRole: Role = !game.plate_filled ? "PLATE" : "BASE";
              onClaim({ game, role: defaultRole });
            }}
            sx={{
              bgcolor: "#C41230",
              "&:hover": { bgcolor: "#960E24" },
              fontSize: "0.78rem",
              px: 1.5,
              py: 0.6,
              whiteSpace: "nowrap",
              flexShrink: 0,
              minHeight: 44,
            }}
          >
            Sign Up
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ── Single signup dialog ──────────────────────────────────────────────────────

interface SignupDialogProps {
  open: boolean;
  defaultRole: Role;
  plateFilled: boolean;
  baseFilled: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}

function SignupDialog({ open, defaultRole, plateFilled, baseFilled, onClose, onSubmit }: SignupDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [values, setValues] = useState<FormValues>({ umpire_name: "", umpire_email: "", umpire_phone: "", role: defaultRole });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setValues({ umpire_name: "", umpire_email: "", umpire_phone: "", role: defaultRole }); setError(null); }
  }, [open, defaultRole]);

  const handleSubmit = async () => {
    if (!values.umpire_name.trim()) { setError("Please enter your name."); return; }
    setSubmitting(true); setError(null);
    try {
      await onSubmit(values);
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.role?.[0] ||
        e?.response?.data?.errors?.non_field_errors?.[0] ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Sign Up as Umpire</DialogTitle>
      <DialogContent sx={{ pt: "12px !important", display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 0 }}>{error}</Alert>}
        <TextField label="Your Name" value={values.umpire_name} onChange={e => setValues(v => ({ ...v, umpire_name: e.target.value }))} fullWidth required size="small" autoFocus inputProps={{ style: { fontSize: "1rem" } }} />
        <TextField label="Email (optional)" type="email" value={values.umpire_email} onChange={e => setValues(v => ({ ...v, umpire_email: e.target.value }))} fullWidth size="small" inputProps={{ style: { fontSize: "1rem" } }} />
        <TextField label="Phone / Cell (optional)" type="tel" value={values.umpire_phone} onChange={e => setValues(v => ({ ...v, umpire_phone: e.target.value }))} fullWidth size="small" placeholder="e.g. 317-555-1234" inputProps={{ style: { fontSize: "1rem" } }} />
        <FormControl fullWidth size="small">
          <InputLabel>Role</InputLabel>
          <Select value={values.role} label="Role" onChange={e => setValues(v => ({ ...v, role: e.target.value as Role }))}>
            <MenuItem value="PLATE" disabled={plateFilled}>Plate Umpire {plateFilled ? "(Taken)" : ""}</MenuItem>
            <MenuItem value="BASE" disabled={baseFilled}>Base Umpire {baseFilled ? "(Taken)" : ""}</MenuItem>
          </Select>
          <FormHelperText>Select which position you'll cover</FormHelperText>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 } }}>
        <Button onClick={onClose} disabled={submitting} color="inherit" fullWidth={fullScreen}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" }, minHeight: 44 }} fullWidth={fullScreen}>
          {submitting ? <CircularProgress size={18} color="inherit" /> : "Confirm Sign-Up"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Multi-game signup dialog ──────────────────────────────────────────────────

function MultiUmpireSignupDialog({
  open,
  games,
  onClose,
  onSubmit,
}: {
  open: boolean;
  games: UmpireGame[];
  onClose: () => void;
  onSubmit: (name: string, email: string, phone: string, items: BatchUmpireSignupItem[]) => Promise<void>;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Map of event_id -> role (null means not selected)
  const [selections, setSelections] = useState<Record<number, Role | null>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openGames = games.filter(g => !g.plate_filled || !g.base_filled);

  useEffect(() => {
    if (open) { setName(""); setEmail(""); setPhone(""); setSelections({}); setError(null); }
  }, [open]);

  const toggleGame = (id: number, currentRole: Role | null) => {
    if (currentRole !== null) {
      // Already selected — deselect
      setSelections(prev => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      // Select with default open role
      const game = games.find(g => g.id === id);
      const defaultRole: Role = game && !game.plate_filled ? "PLATE" : "BASE";
      setSelections(prev => ({ ...prev, [id]: defaultRole }));
    }
  };

  const setRole = (id: number, role: Role) => {
    setSelections(prev => ({ ...prev, [id]: role }));
  };

  const selectedCount = Object.keys(selections).length;

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    if (selectedCount === 0) { setError("Select at least one game."); return; }
    setSaving(true); setError(null);
    try {
      const items: BatchUmpireSignupItem[] = Object.entries(selections)
        .filter(([, role]) => role !== null)
        .map(([id, role]) => ({ event_id: Number(id), role: role as Role }));
      await onSubmit(name.trim(), email.trim(), phone.trim(), items);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.errors?.non_field_errors?.[0] ?? "Sign-up failed. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Sign Up for Multiple Games
        <Typography sx={{ fontSize: "0.8rem", color: "#777", fontWeight: 400, mt: 0.25 }}>
          Enter your info once, then choose games and roles.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Contact info */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField label="Your Name" size="small" fullWidth required value={name} onChange={e => setName(e.target.value)} autoFocus />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <TextField label="Email (optional)" size="small" fullWidth type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <TextField label="Phone (optional)" size="small" fullWidth type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="317-555-1234" />
            </Box>
          </Box>

          {/* Game selection */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                Select Games ({selectedCount} of {openGames.length} open games selected)
              </Typography>
            </Box>
            {openGames.length === 0 ? (
              <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, py: 3, textAlign: "center" }}>
                <Typography sx={{ color: "#aaa", fontSize: "0.85rem" }}>No open games available.</Typography>
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, maxHeight: 320, overflow: "auto" }}>
                <List disablePadding>
                  {openGames.map((game, i) => {
                    const selected = selections[game.id] ?? null;
                    const isSelected = selected !== null;
                    return (
                      <ListItem
                        key={game.id}
                        disablePadding
                        sx={{
                          borderTop: i > 0 ? "1px solid #f4f4f5" : undefined,
                          bgcolor: isSelected ? "rgba(196,18,48,0.03)" : undefined,
                          display: "block",
                          px: 1.5,
                          py: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleGame(game.id, selected)}
                            size="small"
                            sx={{ mt: -0.25, color: isSelected ? "#C41230" : undefined, "&.Mui-checked": { color: "#C41230" } }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                              <Chip label={game.division_name} size="small" sx={{ height: 18, fontSize: "0.66rem", bgcolor: "#111", color: "#fff" }} />
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                {game.team_name}{game.opponent ? ` vs. ${game.opponent}` : ""}
                              </Typography>
                            </Box>
                            <Typography sx={{ fontSize: "0.74rem", color: "#888", mt: 0.25 }}>
                              {formatDate(game.start_time)} · {formatTime(game.start_time)}
                              {game.location ? ` · ${game.location}` : ""}
                            </Typography>
                            {/* Open slots info */}
                            <Box sx={{ display: "flex", gap: 0.75, mt: 0.5 }}>
                              {!game.plate_filled && <Chip label="Plate open" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "#f4f4f5", color: "#555" }} />}
                              {!game.base_filled && <Chip label="Base open" size="small" sx={{ height: 16, fontSize: "0.62rem", bgcolor: "#f4f4f5", color: "#555" }} />}
                            </Box>
                          </Box>

                          {/* Role selector — only shown when selected */}
                          {isSelected && (
                            <FormControl size="small" sx={{ minWidth: 130, flexShrink: 0 }}>
                              <Select
                                value={selected}
                                onChange={e => setRole(game.id, e.target.value as Role)}
                                sx={{ fontSize: "0.78rem" }}
                              >
                                <MenuItem value="PLATE" disabled={game.plate_filled}>
                                  Plate {game.plate_filled ? "(Taken)" : ""}
                                </MenuItem>
                                <MenuItem value="BASE" disabled={game.base_filled}>
                                  Base {game.base_filled ? "(Taken)" : ""}
                                </MenuItem>
                              </Select>
                            </FormControl>
                          )}
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 } }}>
        <Button onClick={onClose} disabled={saving} color="inherit" fullWidth={fullScreen}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || selectedCount === 0 || !name.trim()}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" }, minHeight: 44 }}
          fullWidth={fullScreen}
        >
          {saving ? <CircularProgress size={18} color="inherit" /> : `Sign Up for ${selectedCount} Game${selectedCount !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UmpireSignupPage({ isPublic = false }: { isPublic?: boolean }) {
  const [games, setGames] = useState<UmpireGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [sportFilter, setSportFilter] = useState<"all" | "baseball" | "softball">("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  // Single signup
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);

  // Multi signup
  const [multiOpen, setMultiOpen] = useState(false);

  const load = async (all: boolean) => {
    setLoading(true); setError(null);
    try {
      setGames(await umpireApi.getGames(all));
    } catch {
      setError("Failed to load games. Please try again.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(showAll); }, [showAll]); // eslint-disable-line

  const handleClaim = (info: SlotInfo) => { setSelectedSlot(info); setDialogOpen(true); };

  const handleRelease = async (signupId: number) => {
    try {
      await umpireApi.releaseSlot(signupId);
      setGames(prev =>
        prev.map(g => ({
          ...g,
          umpire_signups: g.umpire_signups.filter(s => s.id !== signupId),
          plate_filled: g.umpire_signups.filter(s => s.id !== signupId).some(s => s.role === "PLATE"),
          base_filled: g.umpire_signups.filter(s => s.id !== signupId).some(s => s.role === "BASE"),
        }))
      );
    } catch { setError("Failed to release slot. Please try again."); }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!selectedSlot) return;
    const signup = await umpireApi.claimSlot({
      event: selectedSlot.game.id,
      umpire_name: values.umpire_name,
      umpire_email: values.umpire_email,
      umpire_phone: values.umpire_phone,
      role: values.role,
    });
    setGames(prev =>
      prev.map(g => {
        if (g.id !== selectedSlot.game.id) return g;
        const updated = [...g.umpire_signups, signup];
        return { ...g, umpire_signups: updated, plate_filled: updated.some(s => s.role === "PLATE"), base_filled: updated.some(s => s.role === "BASE") };
      })
    );
    setDialogOpen(false);
  };

  const handleMultiSubmit = async (name: string, email: string, phone: string, items: BatchUmpireSignupItem[]) => {
    await umpireApi.claimBatch({ event_ids: items, umpire_name: name, umpire_email: email, umpire_phone: phone });
    await load(showAll);
  };

  // Collect unique divisions
  const allDivisions = Array.from(new Set(games.map(g => g.division_name).filter(Boolean))).sort();

  // Apply sport + division filters
  const filteredGames = games.filter(g => {
    if (sportFilter !== "all") {
      const divLower = (g.division_name || "").toLowerCase();
      const isSoftball = divLower.includes("softball");
      if (sportFilter === "softball" && !isSoftball) return false;
      if (sportFilter === "baseball" && isSoftball) return false;
    }
    if (divisionFilter !== "all" && g.division_name !== divisionFilter) return false;
    return true;
  });

  // Group by date
  const grouped = filteredGames.reduce<Record<string, UmpireGame[]>>((acc, game) => {
    const dateKey = formatDate(game.start_time);
    (acc[dateKey] = acc[dateKey] || []).push(game);
    return acc;
  }, {});

  const openSlots = filteredGames.filter(g => !g.plate_filled || !g.base_filled).length;

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Umpire Sign-Ups</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          AAA &amp; Majors games — select a game and sign up for a plate or base slot.
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {[
            { value: "all", label: "All Sports" },
            { value: "baseball", label: "Baseball" },
            { value: "softball", label: "Softball" },
          ].map(opt => (
            <Box
              key={opt.value}
              onClick={() => { setSportFilter(opt.value as any); setDivisionFilter("all"); }}
              sx={{
                px: 1.5, py: 0.5, borderRadius: 5, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, minHeight: 36, display: "flex", alignItems: "center",
                bgcolor: sportFilter === opt.value ? "#C41230" : "#f4f4f5",
                color: sportFilter === opt.value ? "#fff" : "#555",
                border: `1px solid ${sportFilter === opt.value ? "#C41230" : "#e4e4e7"}`,
                transition: "all 0.1s", userSelect: "none",
              }}
            >
              {opt.label}
            </Box>
          ))}
        </Box>

        {allDivisions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Division</InputLabel>
            <Select value={divisionFilter} label="Division" onChange={e => setDivisionFilter(e.target.value)}>
              <MenuItem value="all">All Divisions</MenuItem>
              {allDivisions
                .filter(d => {
                  if (sportFilter === "softball") return d.toLowerCase().includes("softball");
                  if (sportFilter === "baseball") return !d.toLowerCase().includes("softball");
                  return true;
                })
                .map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          </FormControl>
        )}

        {filteredGames.length !== games.length && (
          <Typography sx={{ fontSize: "0.78rem", color: "#888" }}>
            Showing {filteredGames.length} of {games.length} games
            <Box component="span" onClick={() => { setSportFilter("all"); setDivisionFilter("all"); }}
              sx={{ ml: 1, color: "#C41230", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}>
              Clear
            </Box>
          </Typography>
        )}
      </Box>

      {/* Controls row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {!loading && games.length > 0 && (
            <Chip
              label={`${openSlots} game${openSlots !== 1 ? "s" : ""} need umpires`}
              size="small"
              sx={{
                bgcolor: openSlots > 0 ? "rgba(196,18,48,0.08)" : "rgba(46,125,50,0.08)",
                color: openSlots > 0 ? "#C41230" : "#2e7d32",
                fontWeight: 600,
                fontSize: "0.75rem",
                border: `1px solid ${openSlots > 0 ? "rgba(196,18,48,0.2)" : "rgba(46,125,50,0.2)"}`,
              }}
            />
          )}
          {/* Multi-signup button */}
          {!loading && openSlots > 0 && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<DateRangeIcon />}
              onClick={() => setMultiOpen(true)}
              sx={{ fontSize: "0.78rem", borderColor: "#C41230", color: "#C41230", "&:hover": { borderColor: "#C41230", bgcolor: "rgba(196,18,48,0.04)" }, minHeight: 36 }}
            >
              Sign Up for Multiple Games
            </Button>
          )}
        </Box>
        <ToggleButtonGroup
          value={showAll ? "all" : "upcoming"}
          exclusive size="small"
          onChange={(_, v) => { if (v) setShowAll(v === "all"); }}
          sx={{ "& .MuiToggleButton-root": { px: 2, fontSize: "0.78rem", minHeight: 36 } }}
        >
          <ToggleButton value="upcoming">Upcoming</ToggleButton>
          <ToggleButton value="all">All Games</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Content */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: "#C41230" }} />
        </Box>
      ) : games.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8, color: "#aaa", border: "1px dashed #e4e4e7", borderRadius: 2 }}>
          <SportsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
          <Typography sx={{ fontSize: "0.9rem" }}>
            {filteredGames.length === 0 && games.length > 0
              ? "No games match the selected filters."
              : `No ${showAll ? "" : "upcoming "}games found.`}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Object.entries(grouped).map(([date, dateGames]) => (
            <Box key={date}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", mb: 1, pl: 0.5 }}>
                {date}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {dateGames.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onClaim={handleClaim}
                    onRelease={handleRelease}
                    isPublic={isPublic}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Single signup dialog */}
      {selectedSlot && (
        <SignupDialog
          open={dialogOpen}
          defaultRole={selectedSlot.role}
          plateFilled={selectedSlot.game.plate_filled}
          baseFilled={selectedSlot.game.base_filled}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Multi signup dialog */}
      <MultiUmpireSignupDialog
        open={multiOpen}
        games={filteredGames}
        onClose={() => setMultiOpen(false)}
        onSubmit={handleMultiSubmit}
      />
    </Box>
  );
}
