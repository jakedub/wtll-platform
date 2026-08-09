import { useEffect, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Typography,
} from "@mui/material"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import RefreshIcon from "@mui/icons-material/Refresh"
import SyncIcon from "@mui/icons-material/Sync"
import { importPlayerCSV } from "../api/players"
import client from "../api/client"
import { useAuth } from "../context/AuthContext"
import type { ImportResult, Player } from "../models/player"

interface ProgramOption {
  id: number
  name: string
  program_type: string
  season_year: number
  is_active: boolean
  season_closed: boolean
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
        {title}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          bgcolor: color,
          color: "#fff",
          fontWeight: 700,
          fontSize: "0.75rem",
          height: 20,
          minWidth: 28,
        }}
      />
    </Box>
  )
}

function PlayerTable({ players, emptyText }: { players: Player[]; emptyText: string }) {
  if (players.length === 0) {
    return (
      <Typography sx={{ color: "#aaa", fontSize: "0.875rem", py: 1 }}>{emptyText}</Typography>
    )
  }
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {["Last Name", "First Name", "DOB", "Division", "School", "Jersey", "Address"].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell sx={{ fontSize: "0.82rem" }}>{p.last_name}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem" }}>{p.first_name}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>{p.date_of_birth ?? "—"}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem" }}>{p.division_name || "—"}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem" }}>{p.school_name || "—"}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem" }}>{p.jersey_size || "—"}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem" }}>
                {[p.address_line_1, p.city, p.state].filter(Boolean).join(", ") || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function FailureTable({ failures }: { failures: { row: number; error: string }[] }) {
  if (failures.length === 0) {
    return (
      <Typography sx={{ color: "#aaa", fontSize: "0.875rem", py: 1 }}>No failures.</Typography>
    )
  }
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", width: 80 }}>Row</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>Error</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {failures.map((f, i) => (
            <TableRow key={i}>
              <TableCell sx={{ fontSize: "0.82rem" }}>{f.row}</TableCell>
              <TableCell sx={{ fontSize: "0.82rem", color: "#C41230" }}>{f.error}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerImportPage() {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Resync sports state
  const [resyncing, setResyncing] = useState(false)
  const [resyncResult, setResyncResult] = useState<string | null>(null)

  // Program selector state
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState<number | "">("")

  useEffect(() => {
    client.get("/program-years/").then((res) => {
      // Response shape: [{ year: 2026, programs: [...] }, ...]
      const grouped: { year: number; programs: ProgramOption[] }[] = res.data ?? []
      const all: ProgramOption[] = grouped.flatMap((g) => g.programs ?? [])
      const active = all
        .filter((p) => p.is_active && !p.season_closed)
        .sort((a, b) => b.season_year - a.season_year || a.name.localeCompare(b.name))
      setPrograms(active)
      if (active.length > 0) setSelectedProgramId(active[0].id)
    }).catch(() => {})
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setSelectedFile(f)
    setResult(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const progId = selectedProgramId !== "" ? (selectedProgramId as number) : undefined
      const data = await importPlayerCSV(selectedFile, progId)
      setResult(data)
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Upload failed. Please check your file and try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResync = async () => {
    setResyncing(true)
    setResyncResult(null)
    try {
      const res = await client.post("/players/resync-sports/")
      setResyncResult(res.data?.message ?? "Done.")
    } catch {
      setResyncResult("Resync failed. Check backend logs.")
    } finally {
      setResyncing(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>
            Player Import
          </Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Upload a SportsConnect enrollment CSV to create or update player records.
        </Typography>
      </Box>

      {/* Upload card */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #e4e4e7",
          borderRadius: 2,
          p: 3,
          mb: 3,
          maxWidth: 600,
        }}
      >
        <Typography sx={{ fontWeight: 600, mb: 2 }}>Select CSV File</Typography>

        {/* Program selector */}
        <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
          <InputLabel id="program-select-label">Target Program</InputLabel>
          <Select
            labelId="program-select-label"
            label="Target Program"
            value={selectedProgramId}
            onChange={(e) => setSelectedProgramId(e.target.value as number)}
            disabled={programs.length === 0}
          >
            {programs.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
            {programs.length === 0 && (
              <MenuItem value="" disabled>
                No active programs
              </MenuItem>
            )}
          </Select>
          <Typography sx={{ fontSize: "0.72rem", color: "#888", mt: 0.5 }}>
            Enrollment records will be created under the selected program.
          </Typography>
        </FormControl>

        {/* Drop zone */}
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: "2px dashed",
            borderColor: selectedFile ? "#C41230" : "#d4d4d8",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: selectedFile ? "rgba(196,18,48,0.03)" : "#fafafa",
            transition: "all 0.15s",
            "&:hover": { borderColor: "#C41230", bgcolor: "rgba(196,18,48,0.03)" },
            mb: 2,
          }}
        >
          <UploadFileIcon sx={{ fontSize: 36, color: selectedFile ? "#C41230" : "#bbb", mb: 1 }} />
          <Typography sx={{ fontSize: "0.875rem", color: selectedFile ? "#111" : "#888" }}>
            {selectedFile ? selectedFile.name : "Click to select a .csv file"}
          </Typography>
          {selectedFile && (
            <Typography sx={{ fontSize: "0.75rem", color: "#888", mt: 0.5 }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </Typography>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || loading || selectedProgramId === ""}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
            sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}
          >
            {loading ? "Importing..." : "Import Players"}
          </Button>
          {(selectedFile || result) && (
            <Button variant="outlined" onClick={handleReset} startIcon={<RefreshIcon />} color="inherit">
              Reset
            </Button>
          )}
        </Box>

        {/* Column reference */}
        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 0.5, fontWeight: 600 }}>
            Required columns:
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#aaa", lineHeight: 1.8, mb: 1.5 }}>
            Player First Name · Player Last Name · Player Birth Date
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 0.5, fontWeight: 600 }}>
            Auto-detected (if present):
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#aaa", lineHeight: 1.8, mb: 1.5 }}>
            Division Name · Program Name · Player Street · Player Unit · Player City · Player State ·
            Player Postal Code · Jersey Size · User Email · Teammate Request · Coach Request ·
            Little League School Name · Is this player's residency eligibility address… ·
            Is the player interested in trying out for Showcase…
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#888", mb: 0.5, fontWeight: 600 }}>
            Division mapping (CSV → Division):
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "#aaa", lineHeight: 1.8 }}>
            Major - Player Pitch - Major Baseball → Majors &nbsp;·&nbsp;
            Minor - Player Pitch - AAA Baseball → AAA &nbsp;·&nbsp;
            Minor - Coach Pitch - AA Baseball → AA &nbsp;·&nbsp;
            Minor - Coach Pitch - Pee Wee → Pee Wee &nbsp;·&nbsp;
            Tee Ball Clinics → Tee Ball &nbsp;·&nbsp;
            Major - Player Pitch (Ages 11-12) → Softball Majors &nbsp;·&nbsp;
            Minor - Player/Coach Pitch (Ages 7-10) → Softball Minors
          </Typography>
        </Box>
      </Paper>

      {/* Staff-only: Resync Player Sports */}
      {user?.is_staff && (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #e4e4e7",
            borderRadius: 2,
            p: 2.5,
            mb: 3,
            maxWidth: 600,
          }}
        >
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Fix Player Sports</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#777", mb: 1.5 }}>
            Run this after importing if softball players are still appearing under Baseball Ops.
            Updates each player's sport field based on their current enrollment division.
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={resyncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
              onClick={handleResync}
              disabled={resyncing}
            >
              {resyncing ? "Resyncing…" : "Resync Sports"}
            </Button>
            {resyncResult && (
              <Typography sx={{ fontSize: "0.8rem", color: resyncResult.includes("failed") ? "#C41230" : "#2e7d32" }}>
                {resyncResult}
              </Typography>
            )}
          </Box>
        </Paper>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {result && (
        <Box>
          {/* Summary banner */}
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e4e4e7",
              borderRadius: 2,
              p: 2.5,
              mb: 3,
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlineIcon sx={{ color: "#2e7d32", fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: "#2e7d32" }}>
                {result.summary.inserted_count} inserted
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleOutlineIcon sx={{ color: "#1565c0", fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: "#1565c0" }}>
                {result.summary.updated_count} updated
              </Typography>
            </Box>
            {result.summary.failure_count > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ErrorOutlineIcon sx={{ color: "#C41230", fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: "#C41230" }}>
                  {result.summary.failure_count} failed
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Inserted */}
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <SectionHeader title="Newly Inserted" count={result.inserted.length} color="#2e7d32" />
            <PlayerTable players={result.inserted} emptyText="No new players were inserted." />
          </Paper>

          {/* Updated */}
          <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 2 }}>
            <SectionHeader title="Updated" count={result.updated.length} color="#1565c0" />
            <PlayerTable players={result.updated} emptyText="No existing players were updated." />
          </Paper>

          {/* Failures */}
          {result.failures.length > 0 && (
            <Paper
              elevation={0}
              sx={{ border: "1px solid rgba(196,18,48,0.25)", borderRadius: 2, p: 2.5 }}
            >
              <SectionHeader title="Failures" count={result.failures.length} color="#C41230" />
              <FailureTable failures={result.failures} />
            </Paper>
          )}
        </Box>
      )}
    </Box>
  )
}
