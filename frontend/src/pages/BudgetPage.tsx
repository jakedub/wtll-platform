import { useCallback, useEffect, useState } from "react"
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, FormControlLabel,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Slider, Switch, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DownloadIcon from "@mui/icons-material/Download"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditIcon from "@mui/icons-material/Edit"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import ExpandLessIcon from "@mui/icons-material/ExpandLess"
import SearchIcon from "@mui/icons-material/Search"
import FilterListIcon from "@mui/icons-material/FilterList"
import CloseIcon from "@mui/icons-material/Close"
import {
  getBudgetLines, getBudgetSummary, createBudgetLine, updateBudgetLine,
  deleteBudgetLine, approveBudget, revokeApproval, getBudgetExportURL,
  getBudgetYears, copyBudgetYear,
  CATEGORIES, type BudgetLine, type BudgetSummary,
} from "../api/budget"

const RED = "#C41230"
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const GAP_COLOR = (n: number) => (n >= 0 ? "#2e7d32" : "#C41230")

// ── Summary cards ──────────────────────────────────────────────────────────────

function GapCard({ summary }: { summary: BudgetSummary }) {
  return (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
      {[
        { label: "Total Expenses (Actual)", value: summary.total_expenses.actual, color: "#111" },
        { label: "Total Expenses (Est.)",   value: summary.total_expenses.estimate, color: RED },
        { label: "Total Revenue (Actual)",  value: summary.total_revenue.actual, color: "#1565c0" },
        { label: "Total Revenue (Est.)",    value: summary.total_revenue.estimate, color: "#1565c0" },
        { label: "Net Gap (Actual)",        value: summary.gap.actual, color: GAP_COLOR(summary.gap.actual) },
        { label: "Net Gap (Est.)",          value: summary.gap.estimate, color: GAP_COLOR(summary.gap.estimate) },
      ].map(({ label, value, color }) => (
        <Paper key={label} elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 1.75, flex: 1, minWidth: 130 }}>
          <Typography sx={{ fontSize: "0.7rem", color: "#888", mb: 0.5 }}>{label}</Typography>
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color }}>{fmt(value)}</Typography>
        </Paper>
      ))}
    </Box>
  )
}

// ── Add / Edit line dialog ────────────────────────────────────────────────────

const EMPTY = (): Partial<BudgetLine> => ({
  year: new Date().getFullYear(),
  category: "ADMIN",
  item: "",
  sub_group: "",
  owner_role: "",
  is_revenue: false,
  actual: null,
  estimate: null,
  estimate_override: false,
  notes: "",
})

function LineDialog({
  open, initial, year, onSave, onClose, saving,
}: {
  open: boolean; initial: Partial<BudgetLine> | null; year: number
  onSave: (d: Partial<BudgetLine>) => void; onClose: () => void; saving: boolean
}) {
  const [form, setForm] = useState<Partial<BudgetLine>>(EMPTY())
  useEffect(() => { setForm(initial ? { ...initial } : { ...EMPTY(), year }) }, [initial, open, year])
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{initial?.id ? "Edit Line Item" : "Add Line Item"}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ flex: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select value={form.category ?? ""} label="Category" onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Year" type="number" size="small" sx={{ flex: 1 }}
              value={form.year ?? ""} onChange={e => set("year", parseInt(e.target.value))} />
          </Box>
          <TextField label="Item description" size="small" fullWidth required
            value={form.item ?? ""} onChange={e => set("item", e.target.value)} />
          <TextField label="Sub-group (optional)" size="small" fullWidth
            placeholder="e.g. Regular Season, Winter Workout, All Stars"
            value={form.sub_group ?? ""} onChange={e => set("sub_group", e.target.value)} />
          <TextField label="Owner / Role" size="small" fullWidth
            value={form.owner_role ?? ""} onChange={e => set("owner_role", e.target.value)} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField label="Prior Year Actual ($)" type="number" size="small" sx={{ flex: 1 }}
              value={form.actual ?? ""} onChange={e => set("actual", e.target.value || null)}
              inputProps={{ min: 0, step: "0.01" }} />
            <TextField label="Override Estimate ($)" type="number" size="small" sx={{ flex: 1 }}
              helperText="Leave blank to auto-calc actual × 1.05"
              value={form.estimate ?? ""} onChange={e => set("estimate", e.target.value || null)}
              inputProps={{ min: 0, step: "0.01" }} />
          </Box>
          <FormControlLabel
            control={<Switch checked={!!form.is_revenue} onChange={e => set("is_revenue", e.target.checked)} size="small" />}
            label={<Typography sx={{ fontSize: "0.85rem" }}>This is a revenue line</Typography>}
          />
          <TextField label="Notes" size="small" fullWidth multiline rows={2}
            value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={saving || !form.item?.trim()}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Approve dialog ────────────────────────────────────────────────────────────

function ApproveDialog({ open, year, onApprove, onClose }: {
  open: boolean; year: number
  onApprove: (name: string, notes: string) => void; onClose: () => void
}) {
  const [name, setName] = useState(""); const [notes, setNotes] = useState("")
  useEffect(() => { if (open) { setName(""); setNotes("") } }, [open])
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Approve {year} Budget</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Approved by (Treasurer name)" size="small" fullWidth required
            value={name} onChange={e => setName(e.target.value)} />
          <TextField label="Notes (optional)" size="small" fullWidth multiline rows={2}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={() => onApprove(name.trim(), notes)}
          sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}>
          Approve Budget
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [lines, setLines] = useState<BudgetLine[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [allYears, setAllYears] = useState<number[]>([])
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [newYearOpen, setNewYearOpen] = useState(false)
  const [newYearTarget, setNewYearTarget] = useState<number>(new Date().getFullYear() + 1)
  const [newYearMultiplier, setNewYearMultiplier] = useState<number>(1.05)
  const [newYearCreating, setNewYearCreating] = useState(false)
  const [newYearError, setNewYearError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editLine, setEditLine] = useState<Partial<BudgetLine> | null>(null)
  const [saving, setSaving] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch]         = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")
  const [catFilter, setCatFilter]   = useState<string>("")   // "" = all categories

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [ls, s, yrs] = await Promise.all([
        getBudgetLines(year),
        getBudgetSummary(year),
        getBudgetYears(),
      ])
      setLines(ls); setSummary(s)
      setAllYears(yrs)
    } catch { setError("Failed to load budget.") }
    finally { setLoading(false) }
  }, [year])

  useEffect(() => { load() }, [load])

  const handleCreateYear = async () => {
    setNewYearCreating(true); setNewYearError(null)
    try {
      await copyBudgetYear(year, newYearTarget, newYearMultiplier)
      setNewYearOpen(false)
      setYear(newYearTarget)
    } catch (err: any) {
      setNewYearError(err?.response?.data?.error ?? "Failed to create year.")
    } finally { setNewYearCreating(false) }
  }

  const handleSave = async (data: Partial<BudgetLine>) => {
    setSaving(true)
    try {
      if (editLine?.id) await updateBudgetLine(editLine.id, data)
      else await createBudgetLine(data)
      setDialogOpen(false); setEditLine(null); await load()
    } catch { setError("Save failed.") }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this line item?")) return
    try { await deleteBudgetLine(id); await load() }
    catch { setError("Delete failed.") }
  }

  const handleApprove = async (name: string, notes: string) => {
    try { await approveBudget(year, name, notes); setApproveOpen(false); await load() }
    catch { setError("Approval failed.") }
  }

  const handleRevoke = async () => {
    if (!confirm("Revoke approval for this budget?")) return
    try { await revokeApproval(year); await load() }
    catch { setError("Revoke failed.") }
  }

  // ── Apply filters ────────────────────────────────────────────────────────────
  const q = search.trim().toLowerCase()
  const isFiltering = !!q || typeFilter !== "all" || !!catFilter

  const filteredLines = lines.filter(ln => {
    if (typeFilter === "income"  && !ln.is_revenue) return false
    if (typeFilter === "expense" &&  ln.is_revenue) return false
    if (catFilter && ln.category !== catFilter) return false
    if (q) {
      const hay = [ln.item, ln.notes, ln.owner_role, ln.sub_group]
        .map(s => (s ?? "").toLowerCase()).join(" ")
      if (!hay.includes(q)) return false
    }
    return true
  })

  // Group filtered lines by category
  const grouped: Record<string, BudgetLine[]> = {}
  for (const ln of filteredLines) {
    if (!grouped[ln.category]) grouped[ln.category] = []
    grouped[ln.category].push(ln)
  }

  // When filtering, auto-expand all categories that have matches
  const displayExpanded = isFiltering
    ? new Set(Object.keys(grouped))
    : expandedCats

  const approval = summary?.approval
  // Show all years that have data, plus current year if not present
  const yearOptions = Array.from(new Set([...allYears, year])).sort((a, b) => b - a)
  const exportURL = getBudgetExportURL(year)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>Budget</Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Track actuals and estimates by category. Estimates auto-calculate at prior year × 1.05 unless overridden.
        </Typography>
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2.5 }}>
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel>Year</InputLabel>
          <Select value={year} label="Year" onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>

        {/* Approval status */}
        {approval ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, border: "1px solid #2e7d32", borderRadius: 1.5, px: 1.5, py: 0.5, bgcolor: "#f1f8f1" }}>
            <CheckCircleIcon sx={{ fontSize: 16, color: "#2e7d32" }} />
            <Typography sx={{ fontSize: "0.8rem", color: "#2e7d32", fontWeight: 600 }}>
              Approved by {approval.approved_by} · {new Date(approval.approved_at).toLocaleDateString()}
            </Typography>
            <Button size="small" onClick={handleRevoke} sx={{ fontSize: "0.72rem", color: "#888", ml: 1, minWidth: 0 }}>Revoke</Button>
          </Box>
        ) : (
          <Button size="small" variant="outlined" startIcon={<CheckCircleIcon />}
            onClick={() => setApproveOpen(true)}
            sx={{ borderColor: "#2e7d32", color: "#2e7d32", fontSize: "0.78rem" }}>
            Approve Budget
          </Button>
        )}

        <Box sx={{ flex: 1 }} />

        <Button size="small" variant="outlined" component="a" href={exportURL} download={`wtll_budget_${year}.xlsx`}
          startIcon={<DownloadIcon />} color="inherit">Export XLSX</Button>

        <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} color="inherit"
          onClick={() => { setNewYearTarget(year + 1); setNewYearError(null); setNewYearOpen(true) }}>
          New Year
        </Button>

        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditLine(null); setDialogOpen(true) }}
          sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}>
          Add Line
        </Button>
      </Box>

      {/* Filter bar */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search items, notes, owner…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#aaa", fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <CloseIcon
                  sx={{ color: "#aaa", fontSize: 16, cursor: "pointer", "&:hover": { color: "#555" } }}
                  onClick={() => setSearch("")}
                />
              </InputAdornment>
            ) : undefined,
          }}
        />

        <ToggleButtonGroup
          value={typeFilter}
          exclusive
          onChange={(_e, v) => { if (v) setTypeFilter(v) }}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              textTransform: "none", fontSize: "0.78rem", px: 1.5, py: 0.5,
              borderColor: "#e0e0e0", color: "#666",
              "&.Mui-selected": { bgcolor: RED, color: "#fff", borderColor: RED, "&:hover": { bgcolor: "#a80f28" } },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="income">Income</ToggleButton>
          <ToggleButton value="expense">Expense</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={catFilter}
            label="Category"
            onChange={e => setCatFilter(e.target.value)}
            startAdornment={<InputAdornment position="start"><FilterListIcon sx={{ fontSize: 16, color: "#aaa", ml: 0.5 }} /></InputAdornment>}
          >
            <MenuItem value="">All categories</MenuItem>
            {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>

        {isFiltering && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "0.78rem", color: "#888" }}>
              {filteredLines.length} of {lines.length} items
            </Typography>
            <Chip
              label="Clear filters"
              size="small"
              onDelete={() => { setSearch(""); setTypeFilter("all"); setCatFilter("") }}
              sx={{ height: 22, fontSize: "0.72rem", bgcolor: "#f0f0f0" }}
            />
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Gap summary */}
      {summary && !isFiltering && <GapCard summary={summary} />}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : filteredLines.length === 0 ? (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, py: 6, textAlign: "center" }}>
          {isFiltering ? (
            <>
              <Typography sx={{ color: "#aaa" }}>No items match your filters.</Typography>
              <Button size="small" onClick={() => { setSearch(""); setTypeFilter("all"); setCatFilter("") }}
                sx={{ mt: 1.5, color: RED }}>Clear filters</Button>
            </>
          ) : (
            <>
              <Typography sx={{ color: "#aaa" }}>No budget lines for {year}.</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
                sx={{ mt: 2, borderColor: RED, color: RED }}>Add First Line</Button>
            </>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {CATEGORIES.map(cat => {
            const catLines = grouped[cat.value] ?? []
            if (!catLines.length) return null

            const incomeLines  = catLines.filter(l => l.is_revenue)
            const expenseLines = catLines.filter(l => !l.is_revenue)
            const totalIncomeEst = incomeLines.reduce((s, l) => s + (parseFloat(l.effective_estimate ?? "0") || 0), 0)
            const totalExpEst    = expenseLines.reduce((s, l) => s + (parseFloat(l.effective_estimate ?? "0") || 0), 0)
            const totalIncomeActual = incomeLines.reduce((s, l) => s + (parseFloat(l.actual ?? "0") || 0), 0)
            const totalExpActual    = expenseLines.reduce((s, l) => s + (parseFloat(l.actual ?? "0") || 0), 0)
            const netEst    = totalIncomeEst - totalExpEst
            const netActual = totalIncomeActual - totalExpActual
            const isExpanded = displayExpanded.has(cat.value)

            return (
              <Paper key={cat.value} elevation={0} sx={{ border: `1px solid ${isExpanded ? cat.color + "40" : "#e4e4e7"}`, borderRadius: 2, overflow: "hidden", transition: "border-color 0.15s" }}>
                {/* Clickable card header */}
                <Box
                  onClick={() => { if (!isFiltering) setExpandedCats(prev => { const n = new Set(prev); n.has(cat.value) ? n.delete(cat.value) : n.add(cat.value); return n }) }}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, cursor: "pointer", bgcolor: isExpanded ? `${cat.color}08` : "#fff", borderBottom: isExpanded ? `1px solid ${cat.color}20` : "none", "&:hover": { bgcolor: `${cat.color}06` }, transition: "background 0.12s" }}
                >
                  {/* Color swatch + name */}
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: cat.color, flexShrink: 0 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", flex: 1, color: isExpanded ? cat.color : "#111" }}>{cat.label}</Typography>

                  {/* Summary chips */}
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    {incomeLines.length > 0 && (
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: "#aaa", lineHeight: 1 }}>Income</Typography>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#2e7d32" }}>{fmt(totalIncomeEst)}</Typography>
                      </Box>
                    )}
                    {expenseLines.length > 0 && (
                      <Box sx={{ textAlign: "right" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: "#aaa", lineHeight: 1 }}>Expense</Typography>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: RED }}>{fmt(totalExpEst)}</Typography>
                      </Box>
                    )}
                    {incomeLines.length > 0 && expenseLines.length > 0 && (
                      <Box sx={{ textAlign: "right", minWidth: 72, pl: 0.5, borderLeft: "1px solid #e4e4e7" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: "#aaa", lineHeight: 1 }}>Net</Typography>
                        <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: netEst >= 0 ? "#2e7d32" : RED }}>{fmt(netEst)}</Typography>
                      </Box>
                    )}
                    <Chip label={catLines.length} size="small" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#f4f4f5", color: "#888" }} />
                    {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18, color: cat.color }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#bbb" }} />}
                  </Box>
                </Box>

                <Collapse in={isExpanded}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {["Item", "Type", "Owner", "Prior Year Actual", "Budget", ""].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.72rem", color: "#888", bgcolor: "#fafafa", whiteSpace: "nowrap", py: 0.5 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        // Group lines by sub_group for rendering
                        const groups: Record<string, BudgetLine[]> = {}
                        for (const ln of catLines) {
                          const g = ln.sub_group || ""
                          if (!groups[g]) groups[g] = []
                          groups[g].push(ln)
                        }
                        const rows: React.ReactNode[] = []
                        Object.entries(groups).forEach(([groupName, groupLines]) => {
                          const grpActual = groupLines.reduce((s, l) => s + (parseFloat(l.actual ?? "0") || 0), 0)
                          const grpEst    = groupLines.reduce((s, l) => s + (parseFloat(l.effective_estimate ?? "0") || 0), 0)
                          // Sub-group header row
                          if (groupName) {
                            rows.push(
                              <TableRow key={`sg-${groupName}`} sx={{ bgcolor: `${cat.color}08` }}>
                                <TableCell colSpan={4} sx={{
                                  fontSize: "0.72rem", fontWeight: 700,
                                  color: cat.color, pl: 2, py: 0.6,
                                  borderBottom: `1px solid ${cat.color}30`,
                                  textTransform: "uppercase", letterSpacing: "0.07em",
                                }}>
                                  {groupName}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.72rem", textAlign: "right", color: cat.color, fontWeight: 700, py: 0.6, borderBottom: `1px solid ${cat.color}30` }}>
                                  {fmt(grpEst)}
                                </TableCell>
                                <TableCell sx={{ borderBottom: `1px solid ${cat.color}30`, py: 0.6 }} />
                              </TableRow>
                            )
                          }
                          // Line item rows
                          groupLines.forEach(ln => {
                            rows.push(
                              <TableRow key={ln.id} hover sx={{ bgcolor: ln.is_revenue ? "rgba(46,125,50,0.02)" : "transparent" }}>
                                <TableCell sx={{ fontSize: "0.82rem", pl: groupName ? 3 : 2 }}>
                                  {ln.item}
                                  {ln.notes && <Typography sx={{ fontSize: "0.7rem", color: "#aaa" }}>{ln.notes}</Typography>}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={ln.is_revenue ? "Income" : "Expense"}
                                    size="small"
                                    sx={{
                                      height: 18, fontSize: "0.65rem", fontWeight: 700,
                                      bgcolor: ln.is_revenue ? "rgba(46,125,50,0.1)" : "rgba(196,18,48,0.08)",
                                      color: ln.is_revenue ? "#2e7d32" : RED,
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.78rem", color: "#777" }}>{ln.owner_role || "—"}</TableCell>
                                <TableCell sx={{ fontSize: "0.82rem", textAlign: "right", color: "#555" }}>
                                  {fmt(parseFloat(ln.actual ?? "0") || null)}
                                </TableCell>
                                <TableCell sx={{ fontSize: "0.82rem", textAlign: "right", fontWeight: 600 }}>
                                  {fmt(parseFloat(ln.effective_estimate ?? "0") || null)}
                                  {ln.estimate_override && (
                                    <Chip label="set" size="small" sx={{ ml: 0.5, height: 14, fontSize: "0.6rem", bgcolor: "#fff3e0", color: "#e65100" }} />
                                  )}
                                </TableCell>
                                <TableCell sx={{ whiteSpace: "nowrap" }}>
                                  <Tooltip title="Edit">
                                    <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#888" }}
                                      onClick={() => { setEditLine(ln); setDialogOpen(true) }}>
                                      <EditIcon sx={{ fontSize: 15 }} />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <Button size="small" sx={{ minWidth: 0, p: 0.5, color: "#ccc", "&:hover": { color: RED } }}
                                      onClick={() => handleDelete(ln.id)}>
                                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                    </Button>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        })
                        return rows
                      })()}
                    </TableBody>
                  </Table>
                </Box>
                </Collapse>
              </Paper>
            )
          })}
        </Box>
      )}

      <LineDialog open={dialogOpen} initial={editLine} year={year}
        onSave={handleSave} onClose={() => { setDialogOpen(false); setEditLine(null) }} saving={saving} />
      <ApproveDialog open={approveOpen} year={year} onApprove={handleApprove} onClose={() => setApproveOpen(false)} />

      {/* New Budget Year dialog */}
      <Dialog open={newYearOpen} onClose={() => setNewYearOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarMonthIcon sx={{ color: RED }} />
            Create New Budget Year
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: "0.85rem", color: "#555", mb: 2.5 }}>
            Copies all {lines.length} line items from <strong>{year}</strong> into a new year.
            The FY{year} budget becomes the new "Actual" column. Estimates are recalculated at the chosen multiplier.
          </Typography>
          {newYearError && <Alert severity="error" sx={{ mb: 2 }}>{newYearError}</Alert>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label="New Budget Year"
              type="number"
              size="small"
              fullWidth
              value={newYearTarget}
              onChange={e => setNewYearTarget(parseInt(e.target.value) || year + 1)}
              inputProps={{ min: year + 1, max: year + 5 }}
            />
            <Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, mb: 0.5 }}>
                Estimate multiplier: <strong style={{ color: RED }}>{(newYearMultiplier * 100).toFixed(0)}%</strong>
                &nbsp;
                <Typography component="span" sx={{ fontSize: "0.75rem", color: "#888" }}>
                  (estimates = FY{year} budget × multiplier)
                </Typography>
              </Typography>
              <Slider
                value={newYearMultiplier}
                onChange={(_, v) => setNewYearMultiplier(v as number)}
                min={0.90} max={1.20} step={0.01}
                marks={[
                  { value: 0.95, label: "−5%" },
                  { value: 1.00, label: "Flat" },
                  { value: 1.05, label: "+5%" },
                  { value: 1.10, label: "+10%" },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={v => `${(v * 100).toFixed(0)}%`}
                sx={{ color: RED, "& .MuiSlider-markLabel": { fontSize: "0.72rem" } }}
              />
            </Box>
            <Box sx={{ bgcolor: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 1.5, p: 1.5 }}>
              <Typography sx={{ fontSize: "0.8rem", color: "#555" }}>
                This will create <strong>{lines.length}</strong> new line items for <strong>FY{newYearTarget}</strong>.
                You can edit individual lines after creation.
                {allYears.includes(newYearTarget) && (
                  <Typography component="span" sx={{ color: "#ed6c02", display: "block", mt: 0.5, fontSize: "0.78rem" }}>
                    ⚠️ FY{newYearTarget} already exists — creating will overwrite it.
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewYearOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateYear}
            disabled={newYearCreating || lines.length === 0}
            startIcon={newYearCreating ? <CircularProgress size={14} color="inherit" /> : <ContentCopyIcon />}
            sx={{ bgcolor: RED, "&:hover": { bgcolor: "#960E24" } }}
          >
            {newYearCreating ? "Creating…" : `Create FY${newYearTarget}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
