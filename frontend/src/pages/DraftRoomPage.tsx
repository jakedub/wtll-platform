import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import ArrowBackIcon from "@mui/icons-material/ArrowBack"
import DownloadIcon from "@mui/icons-material/Download"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import UndoIcon from "@mui/icons-material/Undo"
import SettingsIcon from "@mui/icons-material/Settings"
import BalanceIcon from "@mui/icons-material/Balance"
import {
  getDraftState,
  getAvailablePlayers,
  draftPlayer,
  undraftPlayer,
  saveDraftTeams,
  getTeamStats,
  markDraftComplete,
  getDraftExportURL,
  autoAssignFallBall,
} from "../api/draft"
import { getTeams } from "../api/teams"
import type { Draft, DraftState, DraftPlayerEntry, DraftTeam, TeamStats } from "../models/draft"
import SportChip from "../components/SportChip"

// ── Tier chip ──────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: "#1a237e", fg: "#fff" },
  2: { bg: "#1565c0", fg: "#fff" },
  3: { bg: "#2e7d32", fg: "#fff" },
  4: { bg: "#ed6c02", fg: "#fff" },
  5: { bg: "#C41230", fg: "#fff" },
}

function TierChip({ tier }: { tier: number | null }) {
  if (!tier) return <Chip label="—" size="small" sx={{ bgcolor: "#f0f0f0", color: "#bbb" }} />
  const { bg, fg } = TIER_COLORS[tier] ?? { bg: "#888", fg: "#fff" }
  return <Chip label={`T${tier}`} size="small" sx={{ bgcolor: bg, color: fg, fontWeight: 700, fontSize: "0.7rem", height: 20 }} />
}

// ── Player row (available pool) ───────────────────────────────────────────────

function AvailableRow({
  player,
  teams,
  onDraft,
  drafting,
  onDragStart,
}: {
  player: DraftPlayerEntry
  teams: DraftTeam[]
  onDraft: (playerId: number, teamId: number) => void
  drafting: boolean
  onDragStart: (player: DraftPlayerEntry) => void
}) {
  // Default to blank ("Undrafted Free Agent") — forces an intentional pick
  const [teamId, setTeamId] = useState<number | "">("")

  return (
    <TableRow
      hover
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart(player)
      }}
      sx={{ cursor: "grab", "&:active": { cursor: "grabbing" } }}
    >
      <TableCell sx={{ py: 0.5 }}>
        <TierChip tier={player.tier_spot} />
      </TableCell>
      <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap", py: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ fontWeight: 600 }}>{player.last_name}, {player.first_name}</Box>
          <SportChip sport={player.sport} />
        </Box>
        <Box sx={{ fontSize: "0.7rem", color: "#888" }}>
          {player.batting_hand && `B:${player.batting_hand}`}{player.throwing_hand && ` T:${player.throwing_hand}`}
        </Box>
      </TableCell>
      <TableCell sx={{ fontSize: "0.8rem", py: 0.5 }}>{player.overall_total ?? "—"}</TableCell>
      <TableCell sx={{ fontSize: "0.78rem", color: "#666", py: 0.5 }}>
        {player.total_hitting ?? "—"} / {player.total_fielding ?? "—"} / {player.total_throwing ?? "—"}
      </TableCell>
      <TableCell sx={{ py: 0.5 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {player.is_pitcher && <Chip label="P" size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, height: 18, fontSize: "0.68rem" }} />}
          {player.is_catcher && <Chip label="C" size="small" sx={{ bgcolor: "#fce4ec", color: "#C41230", fontWeight: 700, height: 18, fontSize: "0.68rem" }} />}
        </Box>
      </TableCell>
      <TableCell sx={{ py: 0.5, minWidth: 200 }}>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <Select
            size="small"
            value={teamId}
            onChange={(e) => setTeamId(Number(e.target.value) || "")}
            displayEmpty
            sx={{ fontSize: "0.78rem", minWidth: 150, flex: 1 }}
            renderValue={(val) =>
              (val as number | "") === "" ? (
                <Box component="span" sx={{ color: "#bbb", fontStyle: "italic" }}>Undrafted Free Agent</Box>
              ) : (
                teams.find(t => t.id === (val as number))?.name ?? ""
              )
            }
          >
            <MenuItem value="" sx={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic" }}>
              — Undrafted Free Agent —
            </MenuItem>
            <Divider />
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id} sx={{ fontSize: "0.82rem" }}>{t.name}</MenuItem>
            ))}
          </Select>
          <Button
            size="small"
            variant="contained"
            onClick={() => teamId && onDraft(player.id, teamId as number)}
            disabled={drafting || !teamId}
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" }, fontSize: "0.72rem", py: 0.4, px: 1.2, minWidth: 0, flexShrink: 0 }}
          >
            Draft
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  )
}

// ── Team roster panel ─────────────────────────────────────────────────────────

function TeamRosterPanel({
  team,
  players,
  stats,
  onUndraft,
  onDropPlayer,
}: {
  team: DraftTeam
  players: DraftPlayerEntry[]
  stats: TeamStats | undefined
  onUndraft: (playerId: number) => void
  onDropPlayer: (teamId: number) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <Paper
      elevation={0}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDropPlayer(team.id) }}
      sx={{
        border: dragOver ? "2px solid #C41230" : "1px solid #e4e4e7",
        borderRadius: 2, mb: 2, overflow: "hidden",
        boxShadow: dragOver ? "0 0 0 3px rgba(196,18,48,0.15)" : "none",
        transition: "border 0.1s, box-shadow 0.1s",
      }}
    >
      {/* Team header */}
      <Box sx={{ bgcolor: dragOver ? "#2a1a1e" : "#1c1c1e", color: "#fff", px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1.5, transition: "background 0.1s" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>{team.name}</Typography>
        {team.coach && <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>{team.coach}</Typography>}
        <Chip label={`${players.length} players`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 600, height: 20, fontSize: "0.7rem" }} />
        {stats && (
          <>
            {stats.pitchers > 0 && <Chip label={`${stats.pitchers}P`} size="small" sx={{ bgcolor: "#1565c0", color: "#fff", height: 20, fontSize: "0.68rem", fontWeight: 700 }} />}
            {stats.catchers > 0 && <Chip label={`${stats.catchers}C`} size="small" sx={{ bgcolor: "#C41230", color: "#fff", height: 20, fontSize: "0.68rem", fontWeight: 700 }} />}
            {stats.avg_overall > 0 && <Chip label={`avg ${stats.avg_overall}`} size="small" sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff", height: 20, fontSize: "0.68rem" }} />}
          </>
        )}
      </Box>

      {players.length === 0 ? (
        <Box sx={{ px: 2, py: 2, textAlign: "center", borderTop: dragOver ? "2px dashed #C41230" : "2px dashed #e4e4e7", transition: "border 0.1s" }}>
          <Typography sx={{ color: dragOver ? "#C41230" : "#bbb", fontSize: "0.8rem", fontWeight: dragOver ? 600 : 400 }}>
            {dragOver ? "Drop to draft here" : "No players drafted yet — drag a player here"}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 1 }}>
          {players.map((p, idx) => (
            <Box
              key={p.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.6,
                px: 1,
                borderBottom: idx < players.length - 1 ? "1px solid #f4f4f5" : "none",
              }}
            >
              <TierChip tier={p.tier_spot} />
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, flex: 1 }}>
                {p.last_name}, {p.first_name}
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#888", mr: 1 }}>{p.overall_total ?? "—"}</Typography>
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {p.is_pitcher && <Chip label="P" size="small" sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700, height: 16, fontSize: "0.65rem" }} />}
                {p.is_catcher && <Chip label="C" size="small" sx={{ bgcolor: "#fce4ec", color: "#C41230", fontWeight: 700, height: 16, fontSize: "0.65rem" }} />}
              </Box>
              <Tooltip title="Undo pick">
                <Button
                  size="small"
                  sx={{ minWidth: 0, p: 0.4, color: "#bbb", "&:hover": { color: "#C41230" } }}
                  onClick={() => onUndraft(p.id)}
                >
                  <UndoIcon sx={{ fontSize: 15 }} />
                </Button>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  )
}

// ── Team setup dialog ─────────────────────────────────────────────────────────

function TeamSetupDialog({
  open,
  draftId,
  divisionId,
  currentTeamIds,
  onSave,
  onClose,
}: {
  open: boolean
  draftId: number
  divisionId: number
  currentTeamIds: number[]
  onSave: (ids: number[]) => void
  onClose: () => void
}) {
  const [allTeams, setAllTeams] = useState<{ id: number; name: string }[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set(currentTeamIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    getTeams({ division: divisionId }).then(setAllTeams)
    setSelected(new Set(currentTeamIds))
  }, [open, divisionId, currentTeamIds])

  const toggle = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveDraftTeams(draftId, Array.from(selected))
      onSave(Array.from(selected))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Select Teams for This Draft</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: "0.8rem", color: "#888", mb: 2 }}>
          Choose which teams participate. Only teams in the draft's division are shown.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {allTeams.map((t) => {
            const active = selected.has(t.id)
            return (
              <Box
                key={t.id}
                onClick={() => toggle(t.id)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, p: 1.25,
                  border: "1px solid", borderColor: active ? "#C41230" : "#e4e4e7",
                  borderRadius: 1.5, cursor: "pointer",
                  bgcolor: active ? "rgba(196,18,48,0.04)" : "#fff",
                  "&:hover": { borderColor: "#C41230" },
                }}
              >
                <Box sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: active ? "#C41230" : "#e4e4e7", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {active && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#fff" }} />}
                </Box>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: active ? 600 : 400 }}>{t.name}</Typography>
              </Box>
            )
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
        >
          {saving ? "Saving…" : `Save (${selected.size} teams)`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main draft room ───────────────────────────────────────────────────────────

export default function DraftRoomPage() {
  const { id } = useParams<{ id: string }>()
  const draftId = Number(id)
  const navigate = useNavigate()

  const [state, setState] = useState<DraftState | null>(null)
  const [available, setAvailable] = useState<DraftPlayerEntry[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [teamSetupOpen, setTeamSetupOpen] = useState(false)
  const [completeDialog, setCompleteDialog] = useState(false)
  const [autoAssignDialog, setAutoAssignDialog] = useState(false)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [autoAssignResult, setAutoAssignResult] = useState<string | null>(null)

  // Tier + role filter for available pool
  const [tierFilter, setTierFilter] = useState<number | "">("")
  const [roleFilter, setRoleFilter] = useState<"" | "pitcher" | "catcher">("")

  // Drag and drop state — track which player is being dragged
  const [draggedPlayer, setDraggedPlayer] = useState<DraftPlayerEntry | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, stats] = await Promise.all([getDraftState(draftId), getTeamStats(draftId)])
      setState(s)
      setTeamStats(stats)
      // Load available players for the draft's division
      const avail = await getAvailablePlayers(draftId, s.draft.division)
      setAvailable(avail)
    } catch {
      setError("Failed to load draft.")
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => { load() }, [load])

  const handleDraft = async (playerId: number, teamId: number) => {
    setDrafting(true)
    setError(null)
    try {
      await draftPlayer(draftId, playerId, teamId)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Draft pick failed.")
    } finally {
      setDrafting(false)
    }
  }

  const handleUndraft = async (playerId: number) => {
    if (!confirm("Remove this player from the draft?")) return
    try {
      await undraftPlayer(draftId, playerId)
      await load()
    } catch {
      setError("Failed to remove player.")
    }
  }

  const handleMarkComplete = async () => {
    try {
      await markDraftComplete(draftId)
      await load()
      setCompleteDialog(false)
    } catch {
      setError("Failed to mark draft complete.")
    }
  }

  const handleAutoAssign = async () => {
    setAutoAssigning(true)
    try {
      const result = await autoAssignFallBall(draftId)
      await load()
      setAutoAssignResult(result.message)
    } catch {
      setError("Auto-assign failed.")
    } finally {
      setAutoAssigning(false)
      setAutoAssignDialog(false)
    }
  }

  const handleTeamsSaved = async (ids: number[]) => {
    setTeamSetupOpen(false)
    await load()
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress sx={{ color: "#C41230" }} />
      </Box>
    )
  }

  if (!state) {
    return <Alert severity="error">Draft not found.</Alert>
  }

  const { draft, selected_teams, selections_by_team } = state
  const exportURL = getDraftExportURL(draftId)

  const filteredAvailable = available.filter((p) => {
    if (tierFilter && p.tier_spot !== tierFilter) return false
    if (roleFilter === "pitcher" && !p.is_pitcher) return false
    if (roleFilter === "catcher" && !p.is_catcher) return false
    return true
  })

  const totalDrafted = Object.values(selections_by_team).reduce((s, a) => s + a.length, 0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/draft")}
          sx={{ mb: 1, color: "#666" }}
        >
          All Drafts
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>{draft.name}</Typography>
          <Chip label={draft.year} size="small" sx={{ bgcolor: "#f4f4f5", fontWeight: 600 }} />
          <Chip label={draft.division_name ?? ""} size="small" sx={{ bgcolor: "#f4f4f5" }} />
          {draft.is_complete && (
            <Chip label="Complete" size="small" icon={<CheckCircleIcon />} sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }} />
          )}
          <Box sx={{ flex: 1 }} />
          {/* Actions */}
          <Button size="small" variant="outlined" startIcon={<SettingsIcon />} color="inherit" onClick={() => setTeamSetupOpen(true)}>
            Teams
          </Button>
          <Button size="small" variant="outlined" component="a" href={exportURL} download startIcon={<DownloadIcon />} color="inherit">
            Export XLSX
          </Button>
          {!draft.is_complete && draft.program_type === "FALL_BALL" && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setAutoAssignDialog(true)}
              sx={{ borderColor: "#c2410c", color: "#c2410c", "&:hover": { bgcolor: "#fff7ed", borderColor: "#c2410c" } }}
            >
              Auto Assign
            </Button>
          )}
          {!draft.is_complete && (
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={() => setCompleteDialog(true)}
              sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
            >
              Mark Complete
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {selected_teams.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No teams configured yet.{" "}
          <Button size="small" onClick={() => setTeamSetupOpen(true)} sx={{ ml: 1 }}>Set up teams</Button>
        </Alert>
      )}

      {/* Balance stats bar */}
      {teamStats.length > 0 && (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2, mb: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <BalanceIcon sx={{ fontSize: 16, color: "#888" }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>Team Balance</Typography>
            <Chip label={`${totalDrafted} drafted · ${available.length} available`} size="small" sx={{ bgcolor: "#f4f4f5", fontSize: "0.72rem" }} />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {teamStats.map((ts) => (
              <Box
                key={ts.team_id}
                sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, px: 1.5, py: 0.75, minWidth: 110 }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: "0.78rem", mb: 0.25 }}>{ts.team_name}</Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#666" }}>
                  {ts.player_count} players · avg {ts.avg_overall}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                  {ts.pitchers > 0 && <Chip label={`${ts.pitchers}P`} size="small" sx={{ height: 16, fontSize: "0.65rem", bgcolor: "#e3f2fd", color: "#1565c0", fontWeight: 700 }} />}
                  {ts.catchers > 0 && <Chip label={`${ts.catchers}C`} size="small" sx={{ height: 16, fontSize: "0.65rem", bgcolor: "#fce4ec", color: "#C41230", fontWeight: 700 }} />}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Split layout: available pool (left ~60%) + team rosters (right ~40%) */}
      <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>

        {/* Available players — wider panel, no forced horizontal scroll */}
        <Box sx={{ flex: "0 0 60%", minWidth: 0, maxWidth: "60%" }}>
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Available Players</Typography>
              <Chip label={filteredAvailable.length} size="small" sx={{ bgcolor: "#e4e4e7", fontWeight: 700, height: 20, fontSize: "0.72rem" }} />
              <Box sx={{ flex: 1 }} />
              {/* Role filter */}
              <Box sx={{ display: "flex", gap: 0.5 }}>
                {(["", "pitcher", "catcher"] as const).map((r) => (
                  <Chip
                    key={r || "all"}
                    label={r === "" ? "All" : r === "pitcher" ? "⚾ Pitchers" : "🥊 Catchers"}
                    size="small"
                    onClick={() => setRoleFilter(r)}
                    sx={{
                      cursor: "pointer",
                      fontWeight: roleFilter === r ? 700 : 400,
                      bgcolor: roleFilter === r ? (r === "pitcher" ? "#e3f2fd" : r === "catcher" ? "#fce4ec" : "#111") : "#f4f4f5",
                      color: roleFilter === r ? (r === "pitcher" ? "#1565c0" : r === "catcher" ? "#C41230" : "#fff") : "#555",
                      border: roleFilter === r ? "1.5px solid currentColor" : "1.5px solid transparent",
                      height: 24,
                      fontSize: "0.72rem",
                    }}
                  />
                ))}
              </Box>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel sx={{ fontSize: "0.78rem" }}>Filter Tier</InputLabel>
                <Select
                  value={tierFilter}
                  label="Filter Tier"
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  sx={{ fontSize: "0.78rem" }}
                >
                  <MenuItem value="">All Tiers</MenuItem>
                  {[1, 2, 3, 4, 5].map((t) => <MenuItem key={t} value={t}>Tier {t}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            {selected_teams.length === 0 ? (
              <Typography sx={{ px: 2, py: 3, color: "#bbb", fontSize: "0.85rem", textAlign: "center" }}>
                Add teams first using the Teams button above.
              </Typography>
            ) : filteredAvailable.length === 0 ? (
              <Typography sx={{ px: 2, py: 3, color: "#bbb", fontSize: "0.85rem", textAlign: "center" }}>
                {tierFilter || roleFilter
                ? `No players match the current filters.`
                : "All eligible players have been drafted."}
              </Typography>
            ) : (
              <Box sx={{ maxHeight: "70vh", overflowY: "auto" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa", width: 60 }}>Tier</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa" }}>Player</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa", width: 45 }}>Ovr</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa", width: 90 }}>H/F/T</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa", width: 60 }} title="P = has pitch count history or pitching evaluation score. C = has catcher evaluation score.">P / C</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: "#fafafa" }}>Pick to</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAvailable.map((p) => (
                      <AvailableRow
                        key={p.id}
                        player={p}
                        teams={selected_teams}
                        onDraft={handleDraft}
                        drafting={drafting}
                        onDragStart={(p) => setDraggedPlayer(p)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Team rosters */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#888", mb: 1.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Team Rosters
          </Typography>
          {selected_teams.length === 0 ? (
            <Typography sx={{ color: "#bbb", fontSize: "0.85rem" }}>No teams added yet.</Typography>
          ) : (
            selected_teams.map((team) => {
              const players = selections_by_team[String(team.id)] ?? []
              const stats = teamStats.find((s) => s.team_id === team.id)
              return (
                <TeamRosterPanel
                  key={team.id}
                  team={team}
                  players={players}
                  stats={stats}
                  onUndraft={handleUndraft}
                  onDropPlayer={(teamId) => {
                    if (draggedPlayer) {
                      handleDraft(draggedPlayer.id, teamId)
                      setDraggedPlayer(null)
                    }
                  }}
                />
              )
            })
          )}
        </Box>
      </Box>

      {/* Team setup dialog */}
      <TeamSetupDialog
        open={teamSetupOpen}
        draftId={draftId}
        divisionId={draft.division}
        currentTeamIds={selected_teams.map((t) => t.id)}
        onSave={handleTeamsSaved}
        onClose={() => setTeamSetupOpen(false)}
      />

      {/* Auto-assign result alert */}
      {autoAssignResult && (
        <Dialog open onClose={() => setAutoAssignResult(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Auto Assign Complete</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: "0.875rem", color: "#555" }}>{autoAssignResult}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={() => setAutoAssignResult(null)} sx={{ bgcolor: "#c2410c", "&:hover": { bgcolor: "#9a3412" } }}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Auto-assign confirmation */}
      <Dialog open={autoAssignDialog} onClose={() => setAutoAssignDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Auto Assign Players?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.875rem", color: "#555" }}>
            This will assign all unassigned players to their division team based on enrollment. Players already drafted will be skipped. You can adjust assignments in Team Management afterward.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAutoAssignDialog(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            disabled={autoAssigning}
            onClick={handleAutoAssign}
            startIcon={autoAssigning ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ bgcolor: "#c2410c", "&:hover": { bgcolor: "#9a3412" } }}
          >
            {autoAssigning ? "Assigning…" : "Auto Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark complete confirmation */}
      <Dialog open={completeDialog} onClose={() => setCompleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Mark Draft Complete?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.875rem", color: "#555" }}>
            This will mark the draft as finished. You can still view and export results, but the draft will appear complete.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteDialog(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleMarkComplete}
            sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}
          >
            Mark Complete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
