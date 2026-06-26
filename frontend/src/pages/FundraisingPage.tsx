/**
 * FundraisingPage — multi-plan capital improvement + fundraising tracker.
 *
 * Tab 1 — Progress:   Full-width two-column view; featured plan + plan cards
 * Tab 2 — Plans:      Drag-and-drop item management across plans
 * Tab 3 — Campaigns:  Named campaigns with type tags, deposits, in-kind tracking
 *
 * Requires: @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities  (npm install)
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress,
  Collapse, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, IconButton,
  InputAdornment, LinearProgress, MenuItem, Paper,
  Select, Switch, Tab, Tabs, TextField, Tooltip, Typography,
  Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CloseIcon from "@mui/icons-material/Close"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import DragIndicatorIcon from "@mui/icons-material/DragIndicator"
import EditIcon from "@mui/icons-material/Edit"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import FilterListIcon from "@mui/icons-material/FilterList"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent } from "@dnd-kit/core"
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import client from "../api/client"

// ── Types ─────────────────────────────────────────────────────────────────────

interface FundraisingItem {
  id: number
  plan_id: number | null
  phase: number | null
  location: string
  description: string
  category: string
  estimate_low: number
  estimate_high: number
  quoted_price: number | null
  notes: string
  sort_order: number
  is_complete: boolean
  raised: number
}

interface PhaseGroup {
  phase: number
  estimate_low: number
  estimate_high: number
  quoted_low: number
  quoted_high: number
  has_quotes: boolean
  raised: number
  items: FundraisingItem[]
}

interface PlanSummary {
  id: number
  name: string
  color: string
  uses_phases: boolean
  sort_order: number
  estimate_low: number
  estimate_high: number
  quoted_low: number
  quoted_high: number
  has_quotes: boolean
  raised: number
  structure: PhaseGroup[] | FundraisingItem[]
}

interface FundraisingSummary {
  grand_cash_raised: number
  grand_in_kind_count: number
  general_unallocated: number
  plans: PlanSummary[]
}

interface Plan {
  id: number
  name: string
  description: string
  uses_phases: boolean
  color: string
  is_active: boolean
  sort_order: number
}

interface Campaign {
  id: number
  name: string
  description: string
  campaign_type: string
  goal: number | null
  is_active: boolean
  total_raised: number
  in_kind_count: number
}

interface Deposit {
  id: number
  campaign_id: number
  line_item_id: number | null
  line_item_label: string | null
  amount: number
  date: string
  notes: string
  is_in_kind: boolean
  in_kind_description: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

const CAMPAIGN_TYPES: Record<string, { label: string; color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" }> = {
  RAFFLE:      { label: "Raffle",           color: "secondary" },
  SPONSORSHIP: { label: "Sponsorship",      color: "primary" },
  GRANT:       { label: "Grant",            color: "success" },
  EVENT:       { label: "Event",            color: "warning" },
  DONATION:    { label: "Direct Donation",  color: "info" },
  OTHER:       { label: "Other",            color: "default" },
}

const CATEGORY_LABELS: Record<string, string> = {
  INFRA:      "Infrastructure",
  SAFETY:     "Safety",
  AMENITY:    "Amenity",
  FULL:       "Full Field",
  ELECTRICAL: "Electrical",
}

const PLAN_COLOR_PALETTE = ["#C41230","#1565c0","#6a1b9a","#e65100","#00838f","#f57f17","#37474f"]

// ── Progress Tab ──────────────────────────────────────────────────────────────

function PhaseSection({
  phase, filteredItems, hasQuotes, estimateLow, estimateHigh, quotedLow, quotedHigh,
}: {
  phase: number
  filteredItems: FundraisingItem[]
  hasQuotes: boolean
  estimateLow: number
  estimateHigh: number
  quotedLow: number
  quotedHigh: number
}) {
  const [open, setOpen] = useState(false)
  const phTotal = filteredItems.reduce((s, i) => s + (i.quoted_price ?? i.estimate_high), 0)
  const phRaised = filteredItems.reduce((s, i) => s + i.raised, 0)
  const pct = phTotal > 0 ? Math.min(100, (phRaised / phTotal) * 100) : 0

  return (
    <Box sx={{ mb: 1, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2, py: 1, cursor: "pointer", bgcolor: "action.hover",
          "&:hover": { bgcolor: "action.selected" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          <Typography variant="subtitle2">Phase {phase}</Typography>
          <Chip label={`${filteredItems.length} items`} size="small" sx={{ height: 20 }} />
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption" color="text.secondary">
            {fmt(estimateLow)}–{fmt(estimateHigh)}
            {hasQuotes && <> · Quoted: {fmt(quotedLow)}–{fmt(quotedHigh)}</>}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ mt: 0.5, height: 4, borderRadius: 2, minWidth: 120,
              "& .MuiLinearProgress-bar": { bgcolor: "#2e7d32" } }}
          />
        </Box>
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 2, py: 1 }}>
          {filteredItems.map(item => (
            <Box
              key={item.id}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                py: 0.75, borderBottom: "1px solid", borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                opacity: item.is_complete ? 0.6 : 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                {item.is_complete && <CheckCircleIcon fontSize="small" color="success" />}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: item.is_complete ? 400 : 500 }}>
                    {item.description}
                    {item.location && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {item.location}
                      </Typography>
                    )}
                  </Typography>
                  {item.notes && (
                    <Typography variant="caption" color="text.secondary">{item.notes}</Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: "right", ml: 2 }}>
                <Typography variant="body2">
                  {item.quoted_price != null
                    ? <><strong>{fmt(item.quoted_price)}</strong> <Typography component="span" variant="caption" color="text.secondary">quoted</Typography></>
                    : `${fmt(item.estimate_low)}–${fmt(item.estimate_high)}`
                  }
                </Typography>
                {item.raised > 0 && (
                  <Typography variant="caption" color="success.main">{fmt(item.raised)} raised</Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}

function FlatItemList({ items }: { items: FundraisingItem[] }) {
  return (
    <Box>
      {items.map(item => (
        <Box
          key={item.id}
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            py: 0.75, borderBottom: "1px solid", borderColor: "divider",
            "&:last-child": { borderBottom: 0 },
            opacity: item.is_complete ? 0.6 : 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            {item.is_complete && <CheckCircleIcon fontSize="small" color="success" />}
            <Typography variant="body2" sx={{ fontWeight: item.is_complete ? 400 : 500 }}>
              {item.description}
              {item.location && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {item.location}
                </Typography>
              )}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ ml: 2, textAlign: "right" }}>
            {item.quoted_price != null
              ? fmt(item.quoted_price)
              : `${fmt(item.estimate_low)}–${fmt(item.estimate_high)}`
            }
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function FeaturedPlanView({ plan }: { plan: PlanSummary }) {
  const [locationFilter, setLocationFilter] = useState<string | null>(null)

  const allItems: FundraisingItem[] = useMemo(() => {
    if (plan.uses_phases) {
      return (plan.structure as PhaseGroup[]).flatMap(pg => pg.items)
    }
    return plan.structure as FundraisingItem[]
  }, [plan])

  const locations = useMemo(() => {
    const set = new Set(allItems.map(i => i.location).filter(Boolean))
    return Array.from(set).sort()
  }, [allItems])

  const pct = plan.estimate_high > 0
    ? Math.min(100, (plan.raised / plan.estimate_high) * 100)
    : 0

  const filterItems = (items: FundraisingItem[]) =>
    locationFilter ? items.filter(i => i.location === locationFilter) : items

  const filteredItems = filterItems(allItems)
  const hasFiltered = locationFilter !== null
  const hasQuotes   = filteredItems.some(i => i.quoted_price != null)
  const filteredEstLow  = filteredItems.reduce((s, i) => s + i.estimate_low, 0)
  const filteredEstHigh = filteredItems.reduce((s, i) => s + i.estimate_high, 0)
  const filteredQtdLow  = filteredItems.reduce((s, i) => s + (i.quoted_price ?? i.estimate_low), 0)
  const filteredQtdHigh = filteredItems.reduce((s, i) => s + (i.quoted_price ?? i.estimate_high), 0)
  const filteredRaised  = filteredItems.reduce((s, i) => s + i.raised, 0)

  return (
    <Box>
      <Box sx={{ borderLeft: `6px solid ${plan.color}`, pl: 2, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{plan.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {fmt(plan.raised)} raised of {fmt(plan.estimate_high)} estimated
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ mt: 1, height: 8, borderRadius: 4,
            "& .MuiLinearProgress-bar": { bgcolor: plan.color } }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Estimate Range</Typography>
          <Typography variant="subtitle2">
            {hasFiltered
              ? `${fmt(filteredEstLow)}–${fmt(filteredEstHigh)}`
              : `${fmt(plan.estimate_low)}–${fmt(plan.estimate_high)}`}
          </Typography>
        </Box>
        {(hasFiltered ? hasQuotes : plan.has_quotes) && (
          <Box>
            <Typography variant="caption" color="text.secondary">Quoted Range</Typography>
            <Typography variant="subtitle2">
              {hasFiltered
                ? `${fmt(filteredQtdLow)}–${fmt(filteredQtdHigh)}`
                : `${fmt(plan.quoted_low)}–${fmt(plan.quoted_high)}`}
            </Typography>
          </Box>
        )}
        <Box>
          <Typography variant="caption" color="text.secondary">Raised</Typography>
          <Typography variant="subtitle2" color="success.main">
            {fmt(hasFiltered ? filteredRaised : plan.raised)}
          </Typography>
        </Box>
      </Box>

      {locations.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
          <FilterListIcon fontSize="small" color="action" />
          <Chip
            label="All"
            size="small"
            variant={locationFilter === null ? "filled" : "outlined"}
            onClick={() => setLocationFilter(null)}
            sx={{ fontWeight: locationFilter === null ? 600 : 400 }}
          />
          {locations.map(loc => (
            <Chip
              key={loc}
              label={loc}
              size="small"
              variant={locationFilter === loc ? "filled" : "outlined"}
              onClick={() => setLocationFilter(locationFilter === loc ? null : loc)}
              sx={{ fontWeight: locationFilter === loc ? 600 : 400 }}
            />
          ))}
        </Box>
      )}

      {plan.uses_phases ? (
        (plan.structure as PhaseGroup[]).map(pg => {
          const filtered = filterItems(pg.items)
          if (filtered.length === 0) return null
          const phEstLow  = filtered.reduce((s, i) => s + i.estimate_low, 0)
          const phEstHigh = filtered.reduce((s, i) => s + i.estimate_high, 0)
          const phQtdLow  = filtered.reduce((s, i) => s + (i.quoted_price ?? i.estimate_low), 0)
          const phQtdHigh = filtered.reduce((s, i) => s + (i.quoted_price ?? i.estimate_high), 0)
          const phHasQuotes = filtered.some(i => i.quoted_price != null)
          return (
            <PhaseSection
              key={pg.phase}
              phase={pg.phase}
              filteredItems={filtered}
              hasQuotes={phHasQuotes}
              estimateLow={phEstLow}
              estimateHigh={phEstHigh}
              quotedLow={phQtdLow}
              quotedHigh={phQtdHigh}
            />
          )
        })
      ) : (
        <FlatItemList items={filterItems(plan.structure as FundraisingItem[])} />
      )}
    </Box>
  )
}

function ProgressTab({ summary }: { summary: FundraisingSummary }) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)

  const activePlans = summary.plans
  const featuredPlan = activePlans.find(p => p.id === selectedPlanId) ?? activePlans[0]
  const otherPlans   = activePlans.filter(p => p.id !== featuredPlan?.id)

  if (!featuredPlan) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No active plans yet. Create one in the Plans tab.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={otherPlans.length > 0 ? 7 : 12}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <FeaturedPlanView plan={featuredPlan} />
          </Paper>
        </Grid>

        {otherPlans.length > 0 && (
          <Grid item xs={12} md={5}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Other Plans
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {otherPlans.map(plan => {
                const pct = plan.estimate_high > 0
                  ? Math.min(100, (plan.raised / plan.estimate_high) * 100)
                  : 0
                return (
                  <Paper
                    key={plan.id}
                    variant="outlined"
                    onClick={() => setSelectedPlanId(plan.id)}
                    sx={{
                      p: 2, borderRadius: 2, cursor: "pointer",
                      borderLeft: `6px solid ${plan.color}`,
                      transition: "box-shadow 0.15s",
                      "&:hover": { boxShadow: 3 },
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{plan.name}</Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {fmt(plan.estimate_low)}–{fmt(plan.estimate_high)}
                      </Typography>
                      <Typography variant="caption" color="success.main">{fmt(plan.raised)} raised</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 5, borderRadius: 3,
                        "& .MuiLinearProgress-bar": { bgcolor: plan.color } }}
                    />
                    {plan.has_quotes && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                        Quoted: {fmt(plan.quoted_low)}–{fmt(plan.quoted_high)}
                      </Typography>
                    )}
                  </Paper>
                )
              })}
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.7rem" }}>
                Overall
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  <strong>{fmt(summary.grand_cash_raised)}</strong> total cash raised
                </Typography>
                {summary.grand_in_kind_count > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    +{summary.grand_in_kind_count} in-kind contribution{summary.grand_in_kind_count !== 1 ? "s" : ""}
                  </Typography>
                )}
                {summary.general_unallocated > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {fmt(summary.general_unallocated)} unallocated
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────

function SortableItemRow({
  item, planId, allPlans, onEdit, onDelete, onMove,
}: {
  item: FundraisingItem
  planId: number
  allPlans: Plan[]
  onEdit: (item: FundraisingItem) => void
  onDelete: (id: number) => void
  onMove: (itemId: number, toPlanId: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `item-${item.id}` })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const otherPlans = allPlans.filter(p => p.id !== planId)

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "grid",
        gridTemplateColumns: "24px 130px 1fr 100px 80px 80px 80px 110px",
        gap: 1, alignItems: "center",
        py: 0.75, px: 1,
        borderBottom: "1px solid", borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
        bgcolor: isDragging ? "action.selected" : "transparent",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: "grab", color: "text.disabled", display: "flex", alignItems: "center" }}>
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Typography variant="caption" color="text.secondary" noWrap>{item.location || "—"}</Typography>
      <Typography variant="body2" noWrap>{item.description}</Typography>
      <Typography variant="caption" color="text.secondary" noWrap>{CATEGORY_LABELS[item.category] ?? item.category}</Typography>
      <Typography variant="caption" align="right">{fmt(item.estimate_low)}</Typography>
      <Typography variant="caption" align="right">{fmt(item.estimate_high)}</Typography>
      <Typography variant="caption" align="right" color={item.quoted_price != null ? "text.primary" : "text.disabled"}>
        {item.quoted_price != null ? fmt(item.quoted_price) : "—"}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.25 }}>
        {otherPlans.length > 0 && (
          <Select
            size="small"
            value=""
            displayEmpty
            onChange={e => { if (e.target.value) onMove(item.id, Number(e.target.value)) }}
            sx={{ fontSize: "0.65rem", height: 24, "& .MuiSelect-select": { py: 0, px: "4px !important" }, minWidth: 30 }}
            renderValue={() => "↗"}
          >
            <MenuItem value="" disabled><em>Move to…</em></MenuItem>
            {otherPlans.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        )}
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(item)}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => onDelete(item.id)}><DeleteOutlineIcon sx={{ fontSize: 14 }} /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

function PlanAccordion({
  plan, items, allPlans, expanded, onToggle, onItemsChanged, onPlanEdit, onPlanDelete,
}: {
  plan: Plan
  items: FundraisingItem[]
  allPlans: Plan[]
  expanded: boolean
  onToggle: () => void
  onItemsChanged: () => void
  onPlanEdit: (plan: Plan) => void
  onPlanDelete: (id: number) => void
}) {
  // Require 8px of movement before activating a drag — prevents a simple
  // click on the handle from being treated as a drag gesture.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const ids = sortedItems.map(i => `item-${i.id}`)

  const estLow  = items.reduce((s, i) => s + i.estimate_low, 0)
  const estHigh = items.reduce((s, i) => s + i.estimate_high, 0)
  const qtdLow  = items.reduce((s, i) => s + (i.quoted_price ?? i.estimate_low), 0)
  const qtdHigh = items.reduce((s, i) => s + (i.quoted_price ?? i.estimate_high), 0)
  const hasQuotes = items.some(i => i.quoted_price != null)

  const [editItem, setEditItem] = useState<FundraisingItem | null>(null)
  const [editOpen, setEditOpen]  = useState(false)
  const [addOpen, setAddOpen]    = useState(false)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = sortedItems.findIndex(i => `item-${i.id}` === active.id)
    const toIdx   = sortedItems.findIndex(i => `item-${i.id}` === over.id)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = arrayMove(sortedItems, fromIdx, toIdx)
    const updates = reordered.map((item, idx) => ({ id: item.id, sort_order: idx, plan_id: item.plan_id }))
    try {
      await client.patch("/fundraising/line-items/reorder/", updates)
      onItemsChanged()
    } catch (e) { console.error("Reorder failed", e) }
  }

  const handleMove = async (itemId: number, toPlanId: number) => {
    try {
      await client.patch(`/fundraising/line-items/${itemId}/`, { plan_id: toPlanId, sort_order: 0 })
      onItemsChanged()
    } catch (e) { console.error("Move failed", e) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this line item?")) return
    try {
      await client.delete(`/fundraising/line-items/${id}/`)
      onItemsChanged()
    } catch (e) { console.error("Delete failed", e) }
  }

  return (
    <>
      <Accordion
        expanded={expanded}
        onChange={onToggle}
        sx={{ mb: 1, "&:before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{ borderLeft: `5px solid ${plan.color}`, pl: 2 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, mr: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{plan.name}</Typography>
            <Chip label={`${items.length}`} size="small" sx={{ height: 18, fontSize: "0.7rem" }} />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mr: 1, flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Est: {fmt(estLow)}–{fmt(estHigh)}
            </Typography>
            {hasQuotes && (
              <Typography variant="caption" color="text.secondary">
                Quoted: {fmt(qtdLow)}–{fmt(qtdHigh)}
              </Typography>
            )}
            <Tooltip title="Edit plan">
              <IconButton size="small" onClick={e => { e.stopPropagation(); onPlanEdit(plan) }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete plan">
              <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); onPlanDelete(plan.id) }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {/* Column headers */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "24px 130px 1fr 100px 80px 80px 80px 110px",
              gap: 1, px: 1, py: 0.5,
              bgcolor: "action.hover",
              borderBottom: "1px solid", borderColor: "divider",
            }}
          >
            {["", "Location", "Description", "Category", "Est Low", "Est High", "Quoted", ""].map((h, i) => (
              <Typography key={i} variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} align={i >= 4 && i <= 6 ? "right" : "left"}>
                {h}
              </Typography>
            ))}
          </Box>

          {/* Sortable rows */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {sortedItems.map(item => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  planId={plan.id}
                  allPlans={allPlans}
                  onEdit={i => { setEditItem(i); setEditOpen(true) }}
                  onDelete={handleDelete}
                  onMove={handleMove}
                />
              ))}
            </SortableContext>
          </DndContext>

          {items.length === 0 && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">No items yet.</Typography>
            </Box>
          )}

          {/* Subtotal footer */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "24px 130px 1fr 100px 80px 80px 80px 110px",
              gap: 1, px: 1, py: 1,
              bgcolor: "action.hover",
              borderTop: "1px solid", borderColor: "divider",
            }}
          >
            {[null, null, null, null, estLow, estHigh, hasQuotes ? qtdHigh : null, null].map((v, i) => (
              <Typography key={i} variant="caption" align={i >= 4 && i <= 6 ? "right" : "left"} sx={{ fontWeight: 600 }}>
                {v != null ? fmt(v) : ""}
              </Typography>
            ))}
          </Box>

          <Box sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider" }}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
              Add Item to {plan.name}
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {editOpen && editItem && (
        <ItemDialog
          open
          item={editItem}
          usesPhases={plan.uses_phases}
          onSave={async data => {
            await client.patch(`/fundraising/line-items/${editItem.id}/`, data)
            setEditOpen(false); onItemsChanged()
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
      {addOpen && (
        <ItemDialog
          open
          item={null}
          usesPhases={plan.uses_phases}
          onSave={async data => {
            await client.post("/fundraising/line-items/", { ...data, plan_id: plan.id })
            setAddOpen(false); onItemsChanged()
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  )
}

function ItemDialog({
  open, item, usesPhases, onSave, onClose,
}: {
  open: boolean
  item: FundraisingItem | null
  usesPhases: boolean
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    location:      item?.location ?? "",
    description:   item?.description ?? "",
    category:      item?.category ?? "INFRA",
    phase:         item?.phase ?? 1,
    estimate_low:  item?.estimate_low ?? 0,
    estimate_high: item?.estimate_high ?? 0,
    quoted_price:  item?.quoted_price != null ? String(item.quoted_price) : "",
    notes:         item?.notes ?? "",
    is_complete:   item?.is_complete ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.description.trim()) { setError("Description is required."); return }
    setSaving(true); setError("")
    try {
      await onSave({
        ...form,
        phase:         usesPhases ? Number(form.phase) : null,
        estimate_low:  Number(form.estimate_low),
        estimate_high: Number(form.estimate_high),
        quoted_price:  form.quoted_price !== "" ? Number(form.quoted_price) : null,
      })
    } catch { setError("Save failed."); setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Location / Site" value={form.location} onChange={f("location")} size="small" fullWidth
          helperText='e.g. "Diamond 8", "Concession Stand", "Parking Lot"' />
        <TextField label="Description" value={form.description} onChange={f("description")} size="small" fullWidth required />
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField select label="Category" value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))} size="small" sx={{ flex: 1 }}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          {usesPhases && (
            <TextField select label="Phase" value={form.phase}
              onChange={e => setForm(p => ({ ...p, phase: Number(e.target.value) }))} size="small" sx={{ width: 120 }}>
              <MenuItem value={1}>Phase 1</MenuItem>
              <MenuItem value={2}>Phase 2</MenuItem>
              <MenuItem value={3}>Phase 3</MenuItem>
            </TextField>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField label="Est. Low" value={form.estimate_low} onChange={f("estimate_low")}
            size="small" type="number" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ flex: 1 }} />
          <TextField label="Est. High" value={form.estimate_high} onChange={f("estimate_high")}
            size="small" type="number" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} sx={{ flex: 1 }} />
          <TextField label="Quoted Price" value={form.quoted_price} onChange={f("quoted_price")}
            size="small" type="number" InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            helperText="Blank = not yet quoted" sx={{ flex: 1 }} />
        </Box>
        <TextField label="Notes" value={form.notes} onChange={f("notes")} size="small" fullWidth multiline rows={2} />
        <FormControlLabel
          control={<Switch checked={form.is_complete} onChange={e => setForm(p => ({ ...p, is_complete: e.target.checked }))} />}
          label="Mark as complete"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function PlansTab({ plans, allItems, onRefresh }: { plans: Plan[]; allItems: FundraisingItem[]; onRefresh: () => void }) {
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  // Expanded state lives here so it survives data refreshes (re-fetches after drag/edit)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const toggleExpanded = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleDeletePlan = async (id: number) => {
    const count = allItems.filter(i => i.plan_id === id).length
    if (count > 0) { alert(`This plan has ${count} item(s). Move or delete them first.`); return }
    if (!confirm("Delete this plan?")) return
    try { await client.delete(`/fundraising/plans/${id}/`); onRefresh() }
    catch (e) { console.error("Delete plan failed", e) }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditPlan(null); setPlanDialogOpen(true) }}
          sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}>
          Add Plan
        </Button>
      </Box>
      {plans.map(plan => (
        <PlanAccordion
          key={plan.id}
          plan={plan}
          items={allItems.filter(i => i.plan_id === plan.id)}
          allPlans={plans}
          expanded={expandedIds.has(plan.id)}
          onToggle={() => toggleExpanded(plan.id)}
          onItemsChanged={onRefresh}
          onPlanEdit={p => { setEditPlan(p); setPlanDialogOpen(true) }}
          onPlanDelete={handleDeletePlan}
        />
      ))}
      {plans.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No plans yet. Click "Add Plan" to get started.</Typography>
        </Box>
      )}
      {planDialogOpen && (
        <PlanDialog
          open
          plan={editPlan}
          onSave={async data => {
            if (editPlan) await client.patch(`/fundraising/plans/${editPlan.id}/`, data)
            else await client.post("/fundraising/plans/", data)
            setPlanDialogOpen(false); onRefresh()
          }}
          onClose={() => setPlanDialogOpen(false)}
        />
      )}
    </Box>
  )
}

function PlanDialog({
  open, plan, onSave, onClose,
}: {
  open: boolean
  plan: Plan | null
  onSave: (data: Partial<Plan>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:        plan?.name ?? "",
    description: plan?.description ?? "",
    uses_phases: plan?.uses_phases ?? false,
    color:       plan?.color ?? "",
    is_active:   plan?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Plan name is required."); return }
    setSaving(true)
    try { await onSave(form) }
    catch { setError("Save failed."); setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{plan ? "Edit Plan" : "New Fundraising Plan"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Plan Name" value={form.name} onChange={f("name")} size="small" fullWidth required />
        <TextField label="Description" value={form.description} onChange={f("description")} size="small" fullWidth multiline rows={2} />
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <TextField
            label="Color"
            value={form.color}
            onChange={f("color")}
            size="small"
            sx={{ flex: 1 }}
            placeholder="Leave blank for auto-assign"
            helperText="Hex code e.g. #C41230"
            InputProps={{
              startAdornment: form.color ? (
                <InputAdornment position="start">
                  <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: form.color, border: "1px solid rgba(0,0,0,0.2)" }} />
                </InputAdornment>
              ) : undefined,
            }}
          />
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxWidth: 180, pt: 0.5 }}>
            {PLAN_COLOR_PALETTE.map(c => (
              <Box
                key={c}
                onClick={() => setForm(p => ({ ...p, color: c }))}
                sx={{
                  width: 22, height: 22, borderRadius: "50%", bgcolor: c, cursor: "pointer",
                  border: form.color === c ? "3px solid" : "2px solid transparent",
                  borderColor: form.color === c ? "text.primary" : "transparent",
                  transition: "border-color 0.15s",
                }}
              />
            ))}
          </Box>
        </Box>
        <FormControlLabel
          control={<Switch checked={form.uses_phases} onChange={e => setForm(p => ({ ...p, uses_phases: e.target.checked }))} />}
          label="Organize items into phases (Phase 1, 2, 3)"
        />
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />}
          label="Active (visible on Progress tab)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Campaigns Tab ─────────────────────────────────────────────────────────────

function CampaignCard({
  campaign, allItems, onEdit, onDelete,
}: {
  campaign: Campaign
  allItems: FundraisingItem[]
  onEdit: () => void
  onDelete: () => void
}) {
  const [depositsOpen, setDepositsOpen]         = useState(false)
  const [deposits, setDeposits]                 = useState<Deposit[]>([])
  const [loadingDeps, setLoadingDeps]           = useState(false)
  const [depositDialogOpen, setDepositDialogOpen] = useState(false)

  const loadDeposits = useCallback(async () => {
    setLoadingDeps(true)
    try {
      const res = await client.get(`/fundraising/campaigns/${campaign.id}/deposits/`)
      setDeposits(res.data)
    } finally { setLoadingDeps(false) }
  }, [campaign.id])

  const toggleDeposits = () => {
    if (!depositsOpen) loadDeposits()
    setDepositsOpen(o => !o)
  }

  const pct = campaign.goal ? Math.min(100, (campaign.total_raised / campaign.goal) * 100) : null
  const typeInfo = CAMPAIGN_TYPES[campaign.campaign_type] ?? CAMPAIGN_TYPES.OTHER

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{campaign.name}</Typography>
              <Chip label={typeInfo.label} color={typeInfo.color} size="small" variant="outlined" />
              {!campaign.is_active && <Chip label="Inactive" size="small" />}
            </Box>
            {campaign.description && (
              <Typography variant="body2" color="text.secondary">{campaign.description}</Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={onDelete}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 3, mt: 1.5, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Cash Raised</Typography>
            <Typography variant="subtitle2" color="success.main">{fmt(campaign.total_raised)}</Typography>
          </Box>
          {campaign.goal && (
            <Box>
              <Typography variant="caption" color="text.secondary">Goal</Typography>
              <Typography variant="subtitle2">{fmt(campaign.goal)}</Typography>
            </Box>
          )}
          {campaign.in_kind_count > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">In-Kind</Typography>
              <Typography variant="subtitle2">{campaign.in_kind_count} contribution{campaign.in_kind_count !== 1 ? "s" : ""}</Typography>
            </Box>
          )}
        </Box>
        {pct !== null && (
          <LinearProgress variant="determinate" value={pct}
            sx={{ mt: 1.5, height: 5, borderRadius: 3, "& .MuiLinearProgress-bar": { bgcolor: "#2e7d32" } }} />
        )}
      </Box>
      <Divider />
      <Box sx={{ display: "flex", px: 2, py: 0.5, cursor: "pointer", alignItems: "center",
        "&:hover": { bgcolor: "action.hover" } }} onClick={toggleDeposits}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
          {depositsOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          <Typography variant="caption" color="text.secondary">Deposits ({deposits.length})</Typography>
        </Box>
        <Button size="small" startIcon={<AddIcon />}
          onClick={e => { e.stopPropagation(); if (!depositsOpen) { setDepositsOpen(true); loadDeposits() } setDepositDialogOpen(true) }}>
          Add
        </Button>
      </Box>
      <Collapse in={depositsOpen}>
        <Box sx={{ px: 2, pb: 1 }}>
          {loadingDeps ? (
            <CircularProgress size={16} sx={{ m: 1 }} />
          ) : deposits.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No deposits yet.</Typography>
          ) : (
            deposits.map(dep => (
              <Box key={dep.id} sx={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                py: 0.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 },
              }}>
                <Box>
                  <Typography variant="body2">
                    {dep.is_in_kind
                      ? <><strong>In-Kind</strong> — {dep.in_kind_description || "contribution"}</>
                      : fmt(dep.amount)
                    }
                    {dep.line_item_label && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        → {dep.line_item_label}
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dep.date}{dep.notes ? ` · ${dep.notes}` : ""}
                  </Typography>
                </Box>
                <IconButton size="small" color="error" onClick={async () => {
                  if (!confirm("Delete this deposit?")) return
                  await client.delete(`/fundraising/deposits/${dep.id}/`)
                  loadDeposits()
                }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </Collapse>
      {depositDialogOpen && (
        <DepositDialog
          open
          campaignId={campaign.id}
          allItems={allItems}
          onSave={async data => {
            await client.post(`/fundraising/campaigns/${campaign.id}/deposits/`, data)
            setDepositDialogOpen(false); loadDeposits()
          }}
          onClose={() => setDepositDialogOpen(false)}
        />
      )}
    </Paper>
  )
}

function DepositDialog({
  open, campaignId, allItems, onSave, onClose,
}: {
  open: boolean
  campaignId: number
  allItems: FundraisingItem[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    amount:              "",
    date:                new Date().toISOString().split("T")[0],
    notes:               "",
    line_item_id:        "" as string | number,
    is_in_kind:          false,
    in_kind_description: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const handleSave = async () => {
    if (!form.is_in_kind && (!form.amount || isNaN(Number(form.amount)))) {
      setError("Amount is required for cash deposits."); return
    }
    setSaving(true)
    try {
      await onSave({
        amount:              form.is_in_kind ? 0 : Number(form.amount),
        date:                form.date,
        notes:               form.notes,
        line_item_id:        form.line_item_id !== "" ? Number(form.line_item_id) : null,
        is_in_kind:          form.is_in_kind,
        in_kind_description: form.in_kind_description,
      })
    } catch { setError("Save failed."); setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Deposit</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControlLabel
          control={<Switch checked={form.is_in_kind} onChange={e => setForm(p => ({ ...p, is_in_kind: e.target.checked }))} />}
          label="In-Kind Contribution (non-cash)"
        />
        {form.is_in_kind ? (
          <TextField label="Description" value={form.in_kind_description}
            onChange={e => setForm(p => ({ ...p, in_kind_description: e.target.value }))}
            size="small" fullWidth placeholder="e.g. Labor for dugout repair, Equipment donation" />
        ) : (
          <TextField label="Amount" value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            size="small" type="number"
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            fullWidth required />
        )}
        <TextField label="Date" value={form.date}
          onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          size="small" type="date" fullWidth />
        <TextField select label="Earmark for Line Item (optional)" value={form.line_item_id}
          onChange={e => setForm(p => ({ ...p, line_item_id: e.target.value }))}
          size="small" fullWidth>
          <MenuItem value=""><em>None — general fund</em></MenuItem>
          {allItems.map(item => (
            <MenuItem key={item.id} value={item.id}>
              {item.location ? `[${item.location}] ` : ""}{item.description}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Notes" value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          size="small" fullWidth />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CampaignDialog({
  open, campaign, onSave, onClose,
}: {
  open: boolean
  campaign: Campaign | null
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:          campaign?.name ?? "",
    description:   campaign?.description ?? "",
    campaign_type: campaign?.campaign_type ?? "DONATION",
    goal:          campaign?.goal != null ? String(campaign.goal) : "",
    is_active:     campaign?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Campaign name is required."); return }
    setSaving(true)
    try {
      await onSave({ ...form, goal: form.goal !== "" ? Number(form.goal) : null })
    } catch { setError("Save failed."); setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{campaign ? "Edit Campaign" : "New Campaign"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Name" value={form.name} onChange={f("name")} size="small" fullWidth required />
        <TextField label="Description" value={form.description} onChange={f("description")} size="small" fullWidth multiline rows={2} />
        <TextField select label="Campaign Type" value={form.campaign_type}
          onChange={e => setForm(p => ({ ...p, campaign_type: e.target.value }))} size="small" fullWidth>
          {Object.entries(CAMPAIGN_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField label="Goal (optional)" value={form.goal} onChange={f("goal")} size="small" type="number"
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} fullWidth />
        <FormControlLabel
          control={<Switch checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />}
          label="Active"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function CampaignsTab({
  campaigns, allItems, onRefresh,
}: {
  campaigns: Campaign[]
  allItems: FundraisingItem[]
  onRefresh: () => void
}) {
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editCampaign, setEditCampaign]   = useState<Campaign | null>(null)
  const [typeFilter, setTypeFilter]       = useState<string | null>(null)

  const filtered = typeFilter ? campaigns.filter(c => c.campaign_type === typeFilter) : campaigns

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this campaign and all its deposits?")) return
    try { await client.delete(`/fundraising/campaigns/${id}/`); onRefresh() }
    catch (e) { console.error("Delete campaign failed", e) }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
          <Chip label="All" size="small" variant={typeFilter === null ? "filled" : "outlined"} onClick={() => setTypeFilter(null)} />
          {Object.entries(CAMPAIGN_TYPES).map(([key, info]) => (
            <Chip key={key} label={info.label} size="small" color={info.color}
              variant={typeFilter === key ? "filled" : "outlined"}
              onClick={() => setTypeFilter(typeFilter === key ? null : key)} />
          ))}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditCampaign(null); setDialogOpen(true) }}
          sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}>
          New Campaign
        </Button>
      </Box>

      {filtered.map(campaign => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          allItems={allItems}
          onEdit={() => { setEditCampaign(campaign); setDialogOpen(true) }}
          onDelete={() => handleDelete(campaign.id)}
        />
      ))}

      {filtered.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">
            {typeFilter ? `No ${CAMPAIGN_TYPES[typeFilter]?.label ?? typeFilter} campaigns.` : "No campaigns yet."}
          </Typography>
        </Box>
      )}

      {dialogOpen && (
        <CampaignDialog
          open
          campaign={editCampaign}
          onSave={async data => {
            if (editCampaign) await client.patch(`/fundraising/campaigns/${editCampaign.id}/`, data)
            else await client.post("/fundraising/campaigns/", data)
            setDialogOpen(false); onRefresh()
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </Box>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FundraisingPage() {
  const [tab, setTab]               = useState(0)
  const [summary, setSummary]       = useState<FundraisingSummary | null>(null)
  const [plans, setPlans]           = useState<Plan[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [allItems, setAllItems]     = useState<FundraisingItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState("")

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [sumRes, planRes, campRes, itemRes] = await Promise.all([
        client.get("/fundraising/summary/"),
        client.get("/fundraising/plans/"),
        client.get("/fundraising/campaigns/"),
        client.get("/fundraising/line-items/"),
      ])
      setSummary(sumRes.data)
      setPlans(planRes.data)
      setCampaigns(campRes.data)
      setAllItems(itemRes.data)
    } catch { setError("Failed to load fundraising data.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={load} size="small">Retry</Button>}>{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 3, pt: 3, pb: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#2e7d32" }}>Fundraising</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Capital improvement plans, campaigns, and progress tracker
        </Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Progress" />
          <Tab label="Plans" />
          <Tab label="Campaigns" />
        </Tabs>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {tab === 0 && summary && <ProgressTab summary={summary} />}
        {tab === 1 && <PlansTab plans={plans} allItems={allItems} onRefresh={load} />}
        {tab === 2 && <CampaignsTab campaigns={campaigns} allItems={allItems} onRefresh={load} />}
      </Box>
    </Box>
  )
}
