/**
 * FundraisingPage — internal board capital-improvement fundraising tracker.
 *
 * Tab 1 — Progress:   Grand total + per-phase progress bars + per-item breakdown
 * Tab 2 — Campaigns:  Named fundraising efforts, deposit logging, earmarking
 * Tab 3 — Facilities Plan: Editable master line-item list
 */
import { useEffect, useState } from "react"
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, IconButton, InputAdornment,
  LinearProgress, MenuItem, Paper, Select, Switch, Tab, Tabs,
  TextField, Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import CheckIcon from "@mui/icons-material/Check"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CloseIcon from "@mui/icons-material/Close"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditIcon from "@mui/icons-material/Edit"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import CampaignIcon from "@mui/icons-material/Campaign"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import ConstructionIcon from "@mui/icons-material/Construction"
import client from "../api/client"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LineItem {
  id: number
  phase: number
  location: string
  description: string
  category: "INFRA" | "SAFETY" | "AMENITY" | "FULL" | "ELECTRICAL"
  estimate_low: number
  estimate_high: number
  notes: string
  sort_order: number
  is_complete: boolean
  raised: number
}

interface Campaign {
  id: number
  name: string
  description: string
  goal: number | null
  is_active: boolean
  created_at: string
  total_raised: number
}

interface Deposit {
  id: number
  campaign_id: number
  line_item_id: number | null
  line_item_label: string | null
  amount: number
  date: string
  notes: string
}

interface Summary {
  grand_total_raised: number
  general_unallocated: number
  phases: {
    phase: number
    estimate_low: number
    estimate_high: number
    raised: number
    items: LineItem[]
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RED = "#C41230"

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtRange = (lo: number, hi: number) => `${fmt(lo)} – ${fmt(hi)}`

const PHASE_LABELS: Record<number, string> = {
  1: "Phase 1 — Field Playability",
  2: "Phase 2 — Infrastructure & Operations",
  3: "Phase 3 — Amenities & Polish",
}

const PHASE_COLORS: Record<number, string> = {
  1: "#C41230",
  2: "#1565c0",
  3: "#6a1b9a",
}

const CAT_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  INFRA:      { label: "Infrastructure", bg: "#fde8e8", color: "#9b1414" },
  SAFETY:     { label: "Safety",         bg: "#fff3cd", color: "#7a5400" },
  AMENITY:    { label: "Amenity",        bg: "#e8f4fd", color: "#1a5c8a" },
  FULL:       { label: "Full Build",     bg: "#e8fdf0", color: "#1a6b3a" },
  ELECTRICAL: { label: "Electrical",     bg: "#f3e8fd", color: "#5a1a8a" },
}

const CATEGORIES = ["INFRA", "SAFETY", "AMENITY", "FULL", "ELECTRICAL"] as const

function pct(raised: number, lo: number, hi: number): number {
  const mid = (lo + hi) / 2
  if (mid <= 0) return 0
  return Math.min(100, Math.round((raised / mid) * 100))
}

// ── Progress Tab ──────────────────────────────────────────────────────────────

function ProgressTab({ summary }: { summary: Summary | null }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false })

  if (!summary) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>

  const totalLow = summary.phases.reduce((s, p) => s + p.estimate_low, 0)
  const totalHigh = summary.phases.reduce((s, p) => s + p.estimate_high, 0)
  const grandPct = pct(summary.grand_total_raised, totalLow, totalHigh)

  return (
    <Box sx={{ maxWidth: 820 }}>
      {/* Grand total banner */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}>
        <Box sx={{ bgcolor: RED, px: 3, py: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.85 }}>
              Total Capital Improvement Goal
            </Typography>
            <Typography sx={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 700, mt: 0.25 }}>
              {fmtRange(totalLow, totalHigh)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography sx={{ color: "#fff", fontSize: "0.72rem", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raised so far</Typography>
            <Typography sx={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>
              {fmt(summary.grand_total_raised)}
            </Typography>
            <Typography sx={{ color: "#ffd6d6", fontSize: "0.75rem", mt: 0.25 }}>{grandPct}% of midpoint estimate</Typography>
          </Box>
        </Box>
        <Box sx={{ px: 3, pt: 1.5, pb: 2, bgcolor: "#1a1a1a" }}>
          <LinearProgress
            variant="determinate" value={grandPct}
            sx={{ height: 10, borderRadius: 5, bgcolor: "#333", "& .MuiLinearProgress-bar": { bgcolor: RED, borderRadius: 5 } }}
          />
          {summary.general_unallocated > 0 && (
            <Typography sx={{ color: "#aaa", fontSize: "0.72rem", mt: 1 }}>
              {fmt(summary.general_unallocated)} unallocated (general fund) · {fmt(summary.grand_total_raised - summary.general_unallocated)} earmarked to projects
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Per-phase cards */}
      {summary.phases.map(phase => {
        const phasePct = pct(phase.raised, phase.estimate_low, phase.estimate_high)
        const phaseColor = PHASE_COLORS[phase.phase]
        const isExpanded = expanded[phase.phase] ?? false

        return (
          <Paper key={phase.phase} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
            {/* Phase header */}
            <Box
              onClick={() => setExpanded(e => ({ ...e, [phase.phase]: !isExpanded }))}
              sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: 2, py: 1.5, cursor: "pointer",
                bgcolor: "#f9fafb", borderBottom: isExpanded ? "1px solid #e4e4e7" : "none",
                "&:hover": { bgcolor: "#f3f4f6" },
              }}
            >
              <Box sx={{ width: 4, height: 28, bgcolor: phaseColor, borderRadius: 1, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
                  {PHASE_LABELS[phase.phase]}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>
                  {fmtRange(phase.estimate_low, phase.estimate_high)} estimated · {fmt(phase.raised)} raised ({phasePct}%)
                </Typography>
              </Box>
              <Box sx={{ minWidth: 140, display: "flex", alignItems: "center", gap: 1.5 }}>
                <LinearProgress
                  variant="determinate" value={phasePct}
                  sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "#e4e4e7", "& .MuiLinearProgress-bar": { bgcolor: phaseColor, borderRadius: 3 } }}
                />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: phaseColor, flexShrink: 0, minWidth: 32 }}>
                  {phasePct}%
                </Typography>
              </Box>
              {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18, color: "#aaa", flexShrink: 0 }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#aaa", flexShrink: 0 }} />}
            </Box>

            {/* Line items */}
            {isExpanded && (
              <Box>
                {phase.items.map((item, idx) => {
                  const itemPct = pct(item.raised, item.estimate_low, item.estimate_high)
                  const cat = CAT_CONFIG[item.category] ?? CAT_CONFIG.INFRA
                  return (
                    <Box key={item.id} sx={{
                      display: "grid", gridTemplateColumns: "1fr 90px 120px 180px",
                      gap: 2, px: 2, py: 1.25, alignItems: "center",
                      bgcolor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      borderBottom: idx < phase.items.length - 1 ? "1px solid #f0f0f0" : "none",
                    }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        {item.is_complete && <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32", flexShrink: 0 }} />}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: item.is_complete ? "#888" : "#111", textDecoration: item.is_complete ? "line-through" : "none" }} noWrap>
                            {item.description}
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: "#aaa" }}>{item.location}</Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={cat.label} size="small"
                        sx={{ height: 18, fontSize: "0.63rem", fontWeight: 700, bgcolor: cat.bg, color: cat.color, "& .MuiChip-label": { px: 1 } }}
                      />
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: item.raised > 0 ? "#2e7d32" : "#111" }}>
                          {fmt(item.raised)}
                        </Typography>
                        <Typography sx={{ fontSize: "0.65rem", color: "#aaa" }}>
                          of {fmtRange(item.estimate_low, item.estimate_high)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LinearProgress
                          variant="determinate" value={itemPct}
                          sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: "#e4e4e7", "& .MuiLinearProgress-bar": { bgcolor: item.raised > 0 ? "#2e7d32" : "#ddd", borderRadius: 2 } }}
                        />
                        <Typography sx={{ fontSize: "0.65rem", color: "#aaa", flexShrink: 0, minWidth: 28 }}>{itemPct}%</Typography>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>
        )
      })}
    </Box>
  )
}

// ── Deposit Dialog ────────────────────────────────────────────────────────────

interface DepositDialogProps {
  open: boolean
  campaignId: number
  lineItems: LineItem[]
  deposit?: Deposit | null
  onClose: () => void
  onSaved: (d: Deposit) => void
}

function DepositDialog({ open, campaignId, lineItems, deposit, onClose, onSaved }: DepositDialogProps) {
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItemId, setLineItemId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAmount(deposit ? String(deposit.amount) : "")
      setDate(deposit ? deposit.date : new Date().toISOString().slice(0, 10))
      setNotes(deposit?.notes ?? "")
      setLineItemId(deposit?.line_item_id ?? null)
      setSaving(false)
      setError(null)
    }
  }, [open, deposit])

  const handleSave = async () => {
    if (!amount || !date) { setError("Amount and date are required."); return }
    setSaving(true); setError(null)
    try {
      let res
      if (deposit) {
        res = await client.patch(`/fundraising/deposits/${deposit.id}/`, { amount: parseFloat(amount), date, notes, line_item_id: lineItemId })
      } else {
        res = await client.post(`/fundraising/campaigns/${campaignId}/deposits/`, { amount: parseFloat(amount), date, notes, line_item_id: lineItemId })
      }
      onSaved(res.data)
      onClose()
    } catch {
      setError("Failed to save deposit.")
    } finally {
      setSaving(false)
    }
  }

  const lineItemOptions = lineItems.map(i => ({ id: i.id, label: `[P${i.phase}] ${i.location} — ${i.description}` }))
  const selectedOption = lineItemOptions.find(o => o.id === lineItemId) ?? null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={700}>{deposit ? "Edit Deposit" : "Log Deposit"}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField
            label="Amount" size="small" required
            value={amount} onChange={e => setAmount(e.target.value)}
            type="number" inputProps={{ min: 0, step: "0.01" }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <TextField
            label="Date" size="small" required type="date"
            value={date} onChange={e => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
        <Autocomplete
          options={lineItemOptions}
          value={selectedOption}
          onChange={(_, v) => setLineItemId(v?.id ?? null)}
          getOptionLabel={o => o.label}
          renderInput={params => (
            <TextField {...params} label="Earmark to project item (optional)" size="small"
              placeholder="Leave blank for general fund" />
          )}
          clearOnEscape
        />
        <TextField
          label="Notes" size="small" multiline rows={2}
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Check number, donor type, source…"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          {deposit ? "Save Changes" : "Log Deposit"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Campaign Dialog ───────────────────────────────────────────────────────────

interface CampaignDialogProps {
  open: boolean
  campaign?: Campaign | null
  onClose: () => void
  onSaved: (c: Campaign) => void
}

function CampaignDialog({ open, campaign, onClose, onSaved }: CampaignDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [goal, setGoal] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(campaign?.name ?? "")
      setDescription(campaign?.description ?? "")
      setGoal(campaign?.goal != null ? String(campaign.goal) : "")
      setIsActive(campaign?.is_active ?? true)
      setSaving(false)
      setError(null)
    }
  }, [open, campaign])

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required."); return }
    setSaving(true); setError(null)
    const payload = { name: name.trim(), description, goal: goal ? parseFloat(goal) : null, is_active: isActive }
    try {
      let res
      if (campaign) {
        res = await client.patch(`/fundraising/campaigns/${campaign.id}/`, payload)
      } else {
        res = await client.post("/fundraising/campaigns/", payload)
      }
      onSaved(res.data)
      onClose()
    } catch {
      setError("Failed to save campaign.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={700}>{campaign ? "Edit Campaign" : "New Campaign"}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Campaign Name" size="small" required fullWidth value={name} onChange={e => setName(e.target.value)} placeholder='e.g. "2026 Raffle Night"' />
        <TextField label="Description" size="small" fullWidth multiline rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this campaign is about…" />
        <TextField label="Campaign Goal (optional)" size="small" type="number" inputProps={{ min: 0 }}
          value={goal} onChange={e => setGoal(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          helperText="Optional target just for this campaign" />
        <FormControlLabel
          control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
          label={<Typography sx={{ fontSize: "0.85rem" }}>Active (visible in campaign list)</Typography>}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          {campaign ? "Save Changes" : "Create Campaign"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────

function CampaignsTab({ lineItems }: { lineItems: LineItem[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [deposits, setDeposits] = useState<Record<number, Deposit[]>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [campaignDialog, setCampaignDialog] = useState(false)
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null)
  const [depositDialog, setDepositDialog] = useState<{ campaignId: number; deposit?: Deposit } | null>(null)

  useEffect(() => {
    client.get("/fundraising/campaigns/")
      .then(r => setCampaigns(r.data ?? []))
      .catch(() => setError("Failed to load campaigns."))
      .finally(() => setLoading(false))
  }, [])

  const loadDeposits = async (campaignId: number) => {
    if (deposits[campaignId]) return
    const res = await client.get(`/fundraising/campaigns/${campaignId}/deposits/`)
    setDeposits(d => ({ ...d, [campaignId]: res.data ?? [] }))
  }

  const toggleExpand = async (id: number) => {
    const next = !expanded[id]
    setExpanded(e => ({ ...e, [id]: next }))
    if (next) await loadDeposits(id)
  }

  const handleCampaignSaved = (c: Campaign) => {
    setCampaigns(prev => {
      const idx = prev.findIndex(x => x.id === c.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = c; return n }
      return [c, ...prev]
    })
  }

  const handleDepositSaved = (d: Deposit) => {
    setDeposits(prev => {
      const list = prev[d.campaign_id] ?? []
      const idx = list.findIndex(x => x.id === d.id)
      const next = idx >= 0 ? list.map(x => x.id === d.id ? d : x) : [d, ...list]
      return { ...prev, [d.campaign_id]: next }
    })
    setCampaigns(prev => prev.map(c => {
      if (c.id !== d.campaign_id) return c
      const deps = deposits[d.campaign_id] ?? []
      const old = deps.find(x => x.id === d.id)
      const diff = d.amount - (old?.amount ?? 0)
      return { ...c, total_raised: c.total_raised + diff }
    }))
  }

  const deleteDeposit = async (dep: Deposit) => {
    if (!confirm("Delete this deposit?")) return
    await client.delete(`/fundraising/deposits/${dep.id}/`)
    setDeposits(prev => ({ ...prev, [dep.campaign_id]: (prev[dep.campaign_id] ?? []).filter(x => x.id !== dep.id) }))
    setCampaigns(prev => prev.map(c => c.id === dep.campaign_id ? { ...c, total_raised: c.total_raised - dep.amount } : c))
  }

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box sx={{ maxWidth: 820 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditCampaign(null); setCampaignDialog(true) }}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          New Campaign
        </Button>
      </Box>

      {campaigns.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography sx={{ color: "#aaa", fontSize: "0.88rem" }}>No campaigns yet — create one to start logging deposits.</Typography>
        </Box>
      )}

      {campaigns.map(campaign => {
        const isExpanded = expanded[campaign.id] ?? false
        const deps = deposits[campaign.id] ?? []
        const goalPct = campaign.goal ? Math.min(100, Math.round((campaign.total_raised / campaign.goal) * 100)) : null

        return (
          <Paper key={campaign.id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
            {/* Campaign header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5, bgcolor: "#f9fafb", borderBottom: isExpanded ? "1px solid #e4e4e7" : "none" }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{campaign.name}</Typography>
                  <Chip
                    label={campaign.is_active ? "Active" : "Closed"} size="small"
                    sx={{ height: 18, fontSize: "0.63rem", fontWeight: 700,
                      bgcolor: campaign.is_active ? "#e8f5e9" : "#f5f5f5",
                      color: campaign.is_active ? "#2e7d32" : "#aaa",
                      "& .MuiChip-label": { px: 1 } }}
                  />
                </Box>
                {campaign.description && (
                  <Typography sx={{ fontSize: "0.72rem", color: "#888", mt: 0.25 }}>{campaign.description}</Typography>
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 700, color: RED }}>
                    {fmt(campaign.total_raised)}
                  </Typography>
                  {campaign.goal && (
                    <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>
                      of {fmt(campaign.goal)} goal ({goalPct}%)
                    </Typography>
                  )}
                </Box>
                {campaign.goal && goalPct !== null && (
                  <LinearProgress variant="determinate" value={goalPct}
                    sx={{ mt: 0.75, height: 4, borderRadius: 2, bgcolor: "#e4e4e7", maxWidth: 260,
                      "& .MuiLinearProgress-bar": { bgcolor: RED, borderRadius: 2 } }} />
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
                <Tooltip title="Log Deposit">
                  <IconButton size="small" onClick={() => setDepositDialog({ campaignId: campaign.id })}
                    sx={{ bgcolor: RED, color: "#fff", "&:hover": { bgcolor: "#a50e26" }, width: 28, height: 28 }}>
                    <AddIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Edit Campaign">
                  <IconButton size="small" onClick={() => { setEditCampaign(campaign); setCampaignDialog(true) }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => toggleExpand(campaign.id)}>
                  {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Box>
            </Box>

            {/* Deposits list */}
            {isExpanded && (
              <Box>
                {deps.length === 0 && (
                  <Box sx={{ py: 3, textAlign: "center" }}>
                    <Typography sx={{ color: "#bbb", fontSize: "0.8rem" }}>No deposits yet.</Typography>
                  </Box>
                )}
                {deps.map((dep, idx) => (
                  <Box key={dep.id} sx={{
                    display: "grid", gridTemplateColumns: "100px 1fr 100px 32px 32px",
                    gap: 1.5, px: 2, py: 1, alignItems: "center",
                    bgcolor: idx % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom: idx < deps.length - 1 ? "1px solid #f0f0f0" : "none",
                  }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "#888" }}>{dep.date}</Typography>
                    <Box>
                      {dep.line_item_label ? (
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600 }}>{dep.line_item_label}</Typography>
                      ) : (
                        <Typography sx={{ fontSize: "0.78rem", color: "#aaa", fontStyle: "italic" }}>General fund</Typography>
                      )}
                      {dep.notes && <Typography sx={{ fontSize: "0.68rem", color: "#aaa" }}>{dep.notes}</Typography>}
                    </Box>
                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, textAlign: "right" }}>{fmt(dep.amount)}</Typography>
                    <IconButton size="small" onClick={() => setDepositDialog({ campaignId: campaign.id, deposit: dep })}>
                      <EditIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => deleteDeposit(dep)} sx={{ color: "#e53e3e" }}>
                      <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
                {/* Add row at bottom */}
                <Box sx={{ px: 2, py: 1.5, bgcolor: "#f9fafb", borderTop: "1px solid #f0f0f0" }}>
                  <Button size="small" startIcon={<AddIcon />}
                    onClick={() => setDepositDialog({ campaignId: campaign.id })}
                    sx={{ fontSize: "0.75rem", color: "#888" }}>
                    Log deposit
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        )
      })}

      <CampaignDialog
        open={campaignDialog}
        campaign={editCampaign}
        onClose={() => setCampaignDialog(false)}
        onSaved={handleCampaignSaved}
      />
      {depositDialog && (
        <DepositDialog
          open={!!depositDialog}
          campaignId={depositDialog.campaignId}
          lineItems={lineItems}
          deposit={depositDialog.deposit}
          onClose={() => setDepositDialog(null)}
          onSaved={handleDepositSaved}
        />
      )}
    </Box>
  )
}

// ── Line Item Row (editable) ───────────────────────────────────────────────────

function LineItemRow({ item, onUpdated, onDeleted }: {
  item: LineItem
  onUpdated: (i: LineItem) => void
  onDeleted: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LineItem>(item)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(item) }, [item])

  const set = (k: keyof LineItem) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await client.patch(`/fundraising/line-items/${item.id}/`, {
        location: draft.location,
        description: draft.description,
        category: draft.category,
        estimate_low: parseFloat(String(draft.estimate_low)),
        estimate_high: parseFloat(String(draft.estimate_high)),
        notes: draft.notes,
        sort_order: draft.sort_order,
        is_complete: draft.is_complete,
      })
      onUpdated(res.data)
      setEditing(false)
    } catch {
      /* keep editing open */
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm(`Delete "${item.description}"? Any deposits earmarked to this item will become unallocated.`)) return
    await client.delete(`/fundraising/line-items/${item.id}/`)
    onDeleted(item.id)
  }

  const cat = CAT_CONFIG[item.category] ?? CAT_CONFIG.INFRA

  if (!editing) {
    return (
      <Box sx={{
        display: "grid", gridTemplateColumns: "1fr 90px 80px 80px 32px 32px",
        gap: 1.5, px: 2, py: 1.25, alignItems: "center",
      }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{item.description}</Typography>
            {item.is_complete && <CheckCircleIcon sx={{ fontSize: 14, color: "#2e7d32" }} />}
          </Box>
          {item.notes && <Typography sx={{ fontSize: "0.68rem", color: "#aaa" }}>{item.notes}</Typography>}
        </Box>
        <Chip label={cat.label} size="small"
          sx={{ height: 18, fontSize: "0.63rem", fontWeight: 700, bgcolor: cat.bg, color: cat.color, "& .MuiChip-label": { px: 1 } }} />
        <Typography sx={{ fontSize: "0.78rem", textAlign: "right", color: "#555" }}>{fmt(item.estimate_low)}</Typography>
        <Typography sx={{ fontSize: "0.78rem", textAlign: "right", color: "#555" }}>{fmt(item.estimate_high)}</Typography>
        <IconButton size="small" onClick={() => setEditing(true)}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
        <IconButton size="small" sx={{ color: "#e53e3e" }} onClick={del}><DeleteOutlineIcon sx={{ fontSize: 14 }} /></IconButton>
      </Box>
    )
  }

  return (
    <Box sx={{ px: 2, py: 1.5, bgcolor: "#f9fafb", borderTop: "1px solid #e4e4e7", borderBottom: "1px solid #e4e4e7" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
        <TextField label="Location" size="small" value={draft.location} onChange={set("location")} />
        <TextField label="Description" size="small" value={draft.description} onChange={set("description")} />
        <TextField label="Estimate Low" size="small" type="number" value={draft.estimate_low} onChange={set("estimate_low")}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        <TextField label="Estimate High" size="small" type="number" value={draft.estimate_high} onChange={set("estimate_high")}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mb: 1.5 }}>
        <Select size="small" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as LineItem["category"] }))}>
          {CATEGORIES.map(c => <MenuItem key={c} value={c}>{CAT_CONFIG[c].label}</MenuItem>)}
        </Select>
        <TextField label="Sort Order" size="small" type="number" value={draft.sort_order} onChange={set("sort_order")} />
      </Box>
      <TextField label="Notes" size="small" fullWidth multiline rows={2} value={draft.notes} onChange={set("notes")} sx={{ mb: 1.5 }} />
      <FormControlLabel
        control={<Switch size="small" checked={draft.is_complete} onChange={e => setDraft(d => ({ ...d, is_complete: e.target.checked }))} />}
        label={<Typography sx={{ fontSize: "0.8rem" }}>Mark as complete</Typography>}
        sx={{ mb: 1.5 }}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button size="small" variant="contained" onClick={save} disabled={saving}
          startIcon={saving ? <CircularProgress size={12} color="inherit" /> : <CheckIcon />}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700, fontSize: "0.75rem" }}>
          Save
        </Button>
        <Button size="small" onClick={() => { setEditing(false); setDraft(item) }} color="inherit" sx={{ fontSize: "0.75rem" }}>Cancel</Button>
      </Box>
    </Box>
  )
}

// ── Add Line Item Dialog ───────────────────────────────────────────────────────

interface AddItemDialogProps {
  open: boolean
  defaultPhase: number
  onClose: () => void
  onSaved: (i: LineItem) => void
}

function AddItemDialog({ open, defaultPhase, onClose, onSaved }: AddItemDialogProps) {
  const [phase, setPhase] = useState(defaultPhase)
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<LineItem["category"]>("INFRA")
  const [estimateLow, setEstimateLow] = useState("")
  const [estimateHigh, setEstimateHigh] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (open) { setPhase(defaultPhase); setLocation(""); setDescription(""); setCategory("INFRA"); setEstimateLow(""); setEstimateHigh(""); setNotes(""); setError(null) } }, [open, defaultPhase])

  const save = async () => {
    if (!description.trim() || !location.trim()) { setError("Location and description are required."); return }
    setSaving(true); setError(null)
    try {
      const res = await client.post("/fundraising/line-items/", {
        phase, location, description, category,
        estimate_low: parseFloat(estimateLow) || 0,
        estimate_high: parseFloat(estimateHigh) || 0,
        notes,
      })
      onSaved(res.data)
      onClose()
    } catch { setError("Failed to save.") } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={700}>Add Line Item</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <Select size="small" value={phase} onChange={e => setPhase(Number(e.target.value))}>
            {[1, 2, 3].map(p => <MenuItem key={p} value={p}>Phase {p}</MenuItem>)}
          </Select>
          <Select size="small" value={category} onChange={e => setCategory(e.target.value as LineItem["category"])}>
            {CATEGORIES.map(c => <MenuItem key={c} value={c}>{CAT_CONFIG[c].label}</MenuItem>)}
          </Select>
        </Box>
        <TextField label="Location" size="small" fullWidth value={location} onChange={e => setLocation(e.target.value)} placeholder='e.g. "Diamond 8"' />
        <TextField label="Description" size="small" fullWidth value={description} onChange={e => setDescription(e.target.value)} placeholder='e.g. "Fencing replacement"' />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <TextField label="Estimate Low" size="small" type="number" value={estimateLow} onChange={e => setEstimateLow(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
          <TextField label="Estimate High" size="small" type="number" value={estimateHigh} onChange={e => setEstimateHigh(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
        </Box>
        <TextField label="Notes" size="small" fullWidth multiline rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#a50e26" }, fontWeight: 700 }}>
          Add Item
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Facilities Plan Tab ───────────────────────────────────────────────────────

function FacilitiesPlanTab({ lineItems, setLineItems }: {
  lineItems: LineItem[]
  setLineItems: React.Dispatch<React.SetStateAction<LineItem[]>>
}) {
  const [addDialog, setAddDialog] = useState<{ phase: number } | null>(null)

  const handleUpdated = (updated: LineItem) =>
    setLineItems(prev => prev.map(i => i.id === updated.id ? updated : i))

  const handleDeleted = (id: number) =>
    setLineItems(prev => prev.filter(i => i.id !== id))

  const handleAdded = (item: LineItem) =>
    setLineItems(prev => [...prev, item].sort((a, b) => a.phase - b.phase || a.sort_order - b.sort_order || a.id - b.id))

  const phases = [1, 2, 3] as const

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Typography sx={{ fontSize: "0.82rem", color: "#888", mb: 3 }}>
        This is the master project list. Add, edit, or remove line items as plans evolve. Cost estimates here drive the progress bars on the Progress tab.
      </Typography>

      {phases.map(phase => {
        const items = lineItems.filter(i => i.phase === phase)
        const totalLow = items.reduce((s, i) => s + i.estimate_low, 0)
        const totalHigh = items.reduce((s, i) => s + i.estimate_high, 0)
        const phaseColor = PHASE_COLORS[phase]

        return (
          <Box key={phase} sx={{ mb: 3 }}>
            {/* Phase header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0 }}>
              <Box sx={{ width: 4, height: 24, bgcolor: phaseColor, borderRadius: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", flex: 1 }}>{PHASE_LABELS[phase]}</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>{fmtRange(totalLow, totalHigh)}</Typography>
            </Box>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mt: 1 }}>
              {/* Table header */}
              <Box sx={{
                display: "grid", gridTemplateColumns: "1fr 90px 80px 80px 32px 32px",
                gap: 1.5, px: 2, py: 1,
                bgcolor: "#f9fafb", borderBottom: "1px solid #e4e4e7",
              }}>
                {["Item", "Category", "Est. Low", "Est. High", "", ""].map((h, i) => (
                  <Typography key={i} sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </Typography>
                ))}
              </Box>

              {items.length === 0 && (
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography sx={{ color: "#bbb", fontSize: "0.8rem" }}>No items in this phase.</Typography>
                </Box>
              )}

              {items.map((item, idx) => (
                <Box key={item.id} sx={{ borderBottom: idx < items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                  <LineItemRow item={item} onUpdated={handleUpdated} onDeleted={handleDeleted} />
                </Box>
              ))}

              {/* Add row */}
              <Box sx={{ px: 2, py: 1.25, bgcolor: "#f9fafb", borderTop: "1px solid #e4e4e7" }}>
                <Button size="small" startIcon={<AddIcon />}
                  onClick={() => setAddDialog({ phase })}
                  sx={{ fontSize: "0.75rem", color: "#888" }}>
                  Add item to Phase {phase}
                </Button>
              </Box>
            </Paper>
          </Box>
        )
      })}

      {addDialog && (
        <AddItemDialog
          open={!!addDialog}
          defaultPhase={addDialog.phase}
          onClose={() => setAddDialog(null)}
          onSaved={item => { handleAdded(item); setAddDialog(null) }}
        />
      )}
    </Box>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FundraisingPage() {
  const [tab, setTab] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const loadSummary = () => {
    client.get("/fundraising/summary/")
      .then(r => setSummary(r.data))
      .catch(() => setSummaryError("Failed to load fundraising summary."))
  }

  useEffect(() => { loadSummary() }, [])

  useEffect(() => {
    client.get("/fundraising/line-items/")
      .then(r => setLineItems(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingItems(false))
  }, [])

  // When line items change, refresh summary too (estimates may have changed)
  useEffect(() => {
    if (!loadingItems) loadSummary()
  }, [lineItems]) // eslint-disable-line

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>Fundraising</Typography>
          <Typography variant="body2" color="text.secondary">
            Capital improvement campaigns and project progress tracker.
          </Typography>
        </Box>
      </Box>

      {summaryError && <Alert severity="error" sx={{ mb: 2 }}>{summaryError}</Alert>}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 44 } }}>
          <Tab label="Progress" icon={<TrendingUpIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Campaigns" icon={<CampaignIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Facilities Plan" icon={<ConstructionIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 0 && <ProgressTab summary={summary} />}
      {tab === 1 && <CampaignsTab lineItems={lineItems} />}
      {tab === 2 && <FacilitiesPlanTab lineItems={lineItems} setLineItems={setLineItems} />}
    </Box>
  )
}
