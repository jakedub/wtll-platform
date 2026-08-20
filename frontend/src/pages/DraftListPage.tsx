import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
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
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import SportsIcon from "@mui/icons-material/Sports"
import DownloadIcon from "@mui/icons-material/Download"
import CheckroomIcon from "@mui/icons-material/Checkroom"
import { getDrafts, createDraft, getSelectExportURL, getJerseyExportURL } from "../api/draft"
import { getDivisions } from "../api/divisions"
import type { Draft } from "../models/draft"

interface Division { id: number; name: string }

export default function DraftListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sportFilter = searchParams.get('sport') ?? undefined
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [openExportDialog, setOpenExportDialog] = useState(false)
  const [exportType, setExportType] = useState<"results" | "jersey">("results")
  const [selectedExportDrafts, setSelectedExportDrafts] = useState<number[]>([])

  const [name, setName] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())
  const [division, setDivision] = useState<number | "">("")
  const [creating, setCreating] = useState(false)

  const sport = sportFilter || "baseball"

  const load = async (currentSport: string) => {
    setLoading(true)
    setDrafts([])
    setDivision("")
    try {
      const [d, divs] = await Promise.all([getDrafts(), getDivisions()])
      // Filter drafts to only show those whose division matches the sport
      const sportDrafts = d.filter((draft: any) => {
        const divName = (draft.division_name || "").toLowerCase()
        return currentSport === "softball" ? divName.includes("softball") : !divName.includes("softball")
      })
      setDrafts(sportDrafts)
      // Filter divisions by sport
      const sportDivs = divs.filter((div: Division) => {
        const name = (div.name || "").toLowerCase()
        return currentSport === "softball" ? name.includes("softball") : !name.includes("softball")
      })
      setDivisions(sportDivs)
      if (sportDivs.length) setDivision(sportDivs[0].id)
    } catch {
      setError("Failed to load drafts.")
    } finally {
      setLoading(false)
    }
  }

  // Re-run whenever the sport param changes (baseball ↔ softball nav switch)
  useEffect(() => { load(sport) }, [sport]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!name.trim() || !division) return
    setCreating(true)
    try {
      const draft = await createDraft({ name: name.trim(), year, division: division as number })
      setDialogOpen(false)
      setName("")
      navigate(`/draft/${draft.id}`)
    } catch {
      setError("Failed to create draft.")
    } finally {
      setCreating(false)
    }
  }

  const handleOpenExportModal = (type: "results" | "jersey") => {
    setExportType(type)
    setSelectedExportDrafts([])
    setOpenExportDialog(true)
  }

  const toggleSelectExportDraft = (id: number) => {
    setSelectedExportDrafts((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    )
  }

  const handleExport = () => {
    if (!selectedExportDrafts.length) return
    const url = exportType === "results" 
      ? getSelectExportURL(selectedExportDrafts)
      : getJerseyExportURL(selectedExportDrafts)

    window.open(url, "_blank")
    setOpenExportDialog(false)
    setSelectedExportDrafts([])
  }

  // Filter completed drafts for export selection
  const completedDrafts = drafts.filter((d) => d.is_complete)

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>
            {(sportFilter || "baseball") === "softball" ? "Softball Draft" : "Baseball Draft"}
          </Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Create and manage player drafts by division.
        </Typography>
      </Box>

      {/* Action Buttons Header */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mb: 2.5 }}>
        <Button
          variant="outlined"
          startIcon={<CheckroomIcon />}
          onClick={() => handleOpenExportModal("jersey")}
          sx={{ borderColor: "#444", color: "#333", "&:hover": { borderColor: "#111", bgcolor: "#f5f5f5" } }}
        >
          Export Jersey Roster
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => handleOpenExportModal("results")}
          sx={{ borderColor: "#111", color: "#111", "&:hover": { borderColor: "#333", bgcolor: "#f5f5f5" } }}
        >
          Export Draft Results
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
        >
          New Draft
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} sx={{ color: "#C41230" }} />
          </Box>
        ) : drafts.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <SportsIcon sx={{ fontSize: 48, color: "#e4e4e7", mb: 1 }} />
            <Typography sx={{ color: "#aaa" }}>No drafts yet. Create one to get started.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                {["Name", "Division", "Year", "Players", "Status", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {drafts.map((d) => (
                <TableRow
                  key={d.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/draft/${d.id}`)}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                  <TableCell>{d.division_name ?? "—"}</TableCell>
                  <TableCell>{d.year}</TableCell>
                  <TableCell>{d.selection_count}</TableCell>
                  <TableCell>
                    {d.is_complete ? (
                      <Chip label="Complete" size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }} />
                    ) : (
                      <Chip label="In Progress" size="small" sx={{ bgcolor: "#fff3e0", color: "#ed6c02", fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" color="inherit" onClick={(e) => { e.stopPropagation(); navigate(`/draft/${d.id}`) }}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Modal: New Draft */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Draft</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Draft Name" size="small" fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Majors 2026 Draft" />
            <TextField label="Season Year" type="number" size="small" sx={{ width: 140 }} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            <FormControl size="small">
              <InputLabel>Division</InputLabel>
              <Select value={division} label="Division" onChange={(e) => setDivision(Number(e.target.value))}>
                {divisions.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !name.trim() || !division}
            startIcon={creating ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
          >
            {creating ? "Creating…" : "Create & Open"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Bulk Export Selection */}
      <Dialog open={openExportDialog} onClose={() => setOpenExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {exportType === "results" ? "Export Draft Results" : "Export Jersey Rosters"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ color: "#666", mb: 2 }}>
            Select completed drafts to export into the Excel file:
          </Typography>

          {completedDrafts.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#888", italic: "true", py: 2 }}>
              No completed drafts available for export.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {completedDrafts.map((d) => {
                const isSelected = selectedExportDrafts.includes(d.id)
                return (
                  <Chip
                    key={d.id}
                    label={`${d.name} (${d.year})`}
                    clickable
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    onClick={() => toggleSelectExportDraft(d.id)}
                    sx={isSelected ? { bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } } : {}}
                  />
                )
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenExportDialog(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={selectedExportDrafts.length === 0}
            startIcon={exportType === "jersey" ? <CheckroomIcon /> : <DownloadIcon />}
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
          >
            Export ({selectedExportDrafts.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}