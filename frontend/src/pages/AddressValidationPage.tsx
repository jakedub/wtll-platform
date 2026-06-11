import { useEffect, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import LocationOnIcon from "@mui/icons-material/LocationOn"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import RefreshIcon from "@mui/icons-material/Refresh"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import UploadFileIcon from "@mui/icons-material/UploadFile"
import DownloadIcon from "@mui/icons-material/Download"
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile"
import PeopleIcon from "@mui/icons-material/People"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import {
  geocodeMissingPlayers,
  checkPlayersInDistrict,
  checkPlayerEligibility,
  type BatchGeocodeSummary,
  type DistrictCheckSummary,
  type EligibilitySummary,
} from "../api/address"
import { getPlayers } from "../api/players"
import client from "../api/client"
import type { Player } from "../models/player"

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
  sub,
}: {
  label: string
  value: number | string
  color: string
  icon?: React.ReactNode
  sub?: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e4e4e7",
        borderRadius: 2,
        p: 2,
        minWidth: 130,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        {icon && <Box sx={{ color, display: "flex" }}>{icon}</Box>}
        <Typography sx={{ fontSize: "0.75rem", color: "#888", fontWeight: 500 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, color }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: "0.68rem", color: "#999", mt: -0.25 }}>{sub}</Typography>}
    </Paper>
  )
}

// ── Status chip ───────────────────────────────────────────────────────────────

function InDistrictChip({ value }: { value: boolean | null }) {
  if (value === null || value === undefined)
    return <Chip label="Unknown" size="small" sx={{ bgcolor: "#f4f4f5", color: "#888" }} />
  return value ? (
    <Chip label="In District" size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }} />
  ) : (
    <Chip label="Out of District" size="small" sx={{ bgcolor: "#fdecea", color: "#C41230", fontWeight: 600 }} />
  )
}

const REASON_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  address_in_district: { label: "✓ Address in District",  bg: "#e8f5e9", color: "#2e7d32" },
  school_enrollment:   { label: "✓ School Enrollment",    bg: "#e3f2fd", color: "#1565c0" },
  ineligible:          { label: "✗ Ineligible",            bg: "#fdecea", color: "#C41230" },
  not_checked:         { label: "— Not Checked",           bg: "#f4f4f5", color: "#888"    },
}

function EligibleChip({ value, reason }: { value: boolean; reason?: string }) {
  const key = reason ?? (value ? "address_in_district" : "ineligible")
  const cfg = REASON_LABELS[key] ?? REASON_LABELS[value ? "address_in_district" : "ineligible"]
  return <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: "0.7rem" }} />
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({
  label,
  loading,
  done,
  onClick,
  description,
}: {
  label: string
  loading: boolean
  done: boolean
  onClick: () => void
  description: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e4e4e7",
        borderRadius: 2,
        p: 2,
        flex: 1,
        minWidth: 200,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", mb: 0.5 }}>{label}</Typography>
      <Typography sx={{ color: "#888", fontSize: "0.75rem", mb: 1.5, lineHeight: 1.5 }}>{description}</Typography>
      <Button
        variant="contained"
        size="small"
        onClick={onClick}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : done ? <CheckCircleOutlineIcon /> : <PlayArrowIcon />}
        sx={{
          bgcolor: done ? "#2e7d32" : "#C41230",
          "&:hover": { bgcolor: done ? "#1b5e20" : "#960E24" },
          fontSize: "0.78rem",
        }}
      >
        {loading ? "Running…" : done ? "Done" : "Run"}
      </Button>
    </Paper>
  )
}

// ── KML boundary panel ────────────────────────────────────────────────────────

interface KmlInfo {
  filename: string
  size_bytes: number
  modified: string
  exists: boolean
}

function KmlPanel({ onUploaded }: { onUploaded: () => void }) {
  const [info, setInfo]           = useState<KmlInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadInfo = () => {
    setLoadingInfo(true)
    client.get("/district/kml/?info=1")
      .then(r => setInfo(r.data))
      .catch(() => setInfo(null))
      .finally(() => setLoadingInfo(false))
  }

  useEffect(() => { loadInfo() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".kml")) {
      setUploadMsg({ type: "error", text: "Please select a .kml file." })
      return
    }
    setUploading(true)
    setUploadMsg(null)
    const form = new FormData()
    form.append("file", file)
    try {
      await client.post("/district/kml/", form, { headers: { "Content-Type": "multipart/form-data" } })
      setUploadMsg({ type: "success", text: `${file.name} uploaded successfully. Re-run the district boundary check to apply the new boundaries.` })
      loadInfo()
      onUploaded()
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Upload failed."
      setUploadMsg({ type: "error", text: msg })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    } catch { return iso }
  }

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <InsertDriveFileIcon sx={{ color: "#888", fontSize: 18 }} />
        <Typography sx={{ fontWeight: 600 }}>District KML Boundary File</Typography>
      </Box>
      <Typography sx={{ color: "#888", fontSize: "0.8rem", mb: 2 }}>
        The KML file defines the geographic district boundary used for address eligibility checks.
        Upload a new file to update the boundary without redeploying.
      </Typography>

      {/* Current file info */}
      <Box sx={{ bgcolor: "#fafafa", border: "1px solid #ebebeb", borderRadius: 1.5, px: 2, py: 1.5, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
        {loadingInfo ? (
          <CircularProgress size={16} />
        ) : info ? (
          <>
            <InsertDriveFileIcon sx={{ color: "#1565c0", fontSize: 22 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "#111" }}>{info.filename}</Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "#888" }}>
                {formatSize(info.size_bytes)} · Last updated {formatDate(info.modified)}
              </Typography>
            </Box>
            <Tooltip title="Download current KML">
              <IconButton
                size="small"
                component="a"
                href="/api/district/kml/"
                download
                sx={{ color: "#1565c0" }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <Typography sx={{ fontSize: "0.82rem", color: "#C41230" }}>No KML file found on server.</Typography>
        )}
      </Box>

      {uploadMsg && (
        <Alert severity={uploadMsg.type} sx={{ mb: 2 }} onClose={() => setUploadMsg(null)}>
          {uploadMsg.text}
        </Alert>
      )}

      {/* Upload */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".kml"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
        <Button
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon />}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          sx={{ borderColor: "#1565c0", color: "#1565c0", "&:hover": { borderColor: "#0d47a1", bgcolor: "#e3f2fd" }, textTransform: "none", fontWeight: 600 }}
        >
          {uploading ? "Uploading…" : "Upload New KML"}
        </Button>
        <Typography sx={{ fontSize: "0.75rem", color: "#aaa" }}>
          .kml files only · replaces the current boundary immediately
        </Typography>
      </Box>
    </Paper>
  )
}

// ── Eligibility re-check panel ────────────────────────────────────────────────

interface RecheckResult {
  total_checked: number
  changed: number
  newly_eligible: { id: number; name: string; school: string; address: string; in_district: boolean; school_eligible: boolean }[]
  newly_ineligible: { id: number; name: string; school: string; address: string; in_district: boolean; school_eligible: boolean }[]
  unchanged_eligible: number
  unchanged_ineligible: number
  dry_run: boolean
  filters: { registered_after: string | null; registered_before: string | null }
}

async function runRecheck(after: string, before: string, dryRun: boolean): Promise<RecheckResult> {
  const body: Record<string, any> = { dry_run: dryRun }
  if (after) body.registered_after = after
  if (before) body.registered_before = before
  const res = await client.post("/eligibility/recheck/", body)
  return res.data
}

function RecheckPanel({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false)
  const [after, setAfter] = useState("")
  const [before, setBefore] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (dry: boolean) => {
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await runRecheck(after, before, dry)
      setResult(r)
      if (!dry) onComplete()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Re-check failed.")
    } finally { setLoading(false) }
  }

  return (
    <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, mb: 3 }}>
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5, cursor: "pointer", "&:hover": { bgcolor: "#fafafa" } }}
        onClick={() => setOpen(v => !v)}
      >
        <RefreshIcon sx={{ color: "#C41230", fontSize: 20 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>February Eligibility Re-check</Typography>
          <Typography sx={{ color: "#777", fontSize: "0.78rem" }}>
            Re-run district boundary + school enrollment validation for a registration date window.
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{ color: "#aaa", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </Box>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ p: 2.5 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          <Typography sx={{ fontSize: "0.82rem", color: "#555", mb: 2 }}>
            Filter by registration date to re-check only players who registered during a specific window (e.g. current season only). Leave blank to re-check all geocoded players.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <TextField label="Registered After" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={after} onChange={e => setAfter(e.target.value)} sx={{ minWidth: 180 }} />
            <TextField label="Registered Before" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={before} onChange={e => setBefore(e.target.value)} sx={{ minWidth: 180 }} />
          </Box>

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button size="small" variant="outlined" color="inherit"
              disabled={loading} onClick={() => run(true)}
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}>
              Preview (Dry Run)
            </Button>
            <Button size="small" variant="contained" disabled={loading}
              onClick={() => run(false)}
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
              sx={{ bgcolor: "#C41230", "&:hover": { bgcolor: "#960E24" } }}>
              {loading ? "Running…" : "Run & Save"}
            </Button>
          </Box>

          {result && (
            <Box sx={{ mt: 2.5 }}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                {[
                  { label: "Checked", value: result.total_checked, color: "#111" },
                  { label: "Changed", value: result.changed, color: result.changed > 0 ? "#ed6c02" : "#2e7d32" },
                  { label: "Newly Eligible", value: result.newly_eligible.length, color: "#2e7d32" },
                  { label: "Newly Ineligible", value: result.newly_ineligible.length, color: "#C41230" },
                  { label: "Unchanged Eligible", value: result.unchanged_eligible, color: "#888" },
                  { label: "Unchanged Ineligible", value: result.unchanged_ineligible, color: "#888" },
                ].map(({ label, value, color }) => (
                  <Box key={label} sx={{ border: "1px solid #e4e4e7", borderRadius: 1.5, px: 1.5, py: 0.75, minWidth: 100 }}>
                    <Typography sx={{ fontSize: "0.68rem", color: "#888" }}>{label}</Typography>
                    <Typography sx={{ fontSize: "1.1rem", fontWeight: 700, color }}>{value}</Typography>
                  </Box>
                ))}
              </Box>

              {result.dry_run && (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  This was a dry run — no changes saved. Click "Run & Save" to apply.
                </Alert>
              )}

              {result.newly_eligible.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#2e7d32", mb: 0.75 }}>
                    ✅ Newly Eligible ({result.newly_eligible.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {result.newly_eligible.map(p => (
                      <Chip key={p.id} label={`${p.name}${p.in_district ? " (district)" : " (school)"}`}
                        size="small" sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600, fontSize: "0.72rem" }} />
                    ))}
                  </Box>
                </Box>
              )}

              {result.newly_ineligible.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#C41230", mb: 0.75 }}>
                    ❌ Newly Ineligible ({result.newly_ineligible.length})
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                    {result.newly_ineligible.map(p => (
                      <Chip key={p.id} label={p.name} size="small"
                        sx={{ bgcolor: "#fdecea", color: "#C41230", fontWeight: 600, fontSize: "0.72rem" }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

// ── Sibling check types ────────────────────────────────────────────────────────

interface SiblingPlayer {
  id: number
  first_name: string
  last_name: string
  full_name: string
  division: string | null
  qualifying_division: boolean
  younger_sibling_eligible: boolean
}

interface SiblingGroup {
  email: string
  player_count: number
  different_last_names: boolean
  last_names: string[]
  has_qualifying_sibling: boolean
  players: SiblingPlayer[]
}

interface SiblingResult {
  total_groups: number
  players_flagged: number
  different_last_name_groups: number
  younger_sibling_eligible_count: number
  groups: SiblingGroup[]
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AddressValidationPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

  const [geoLoading, setGeoLoading] = useState(false)
  const [geoDone, setGeoDone] = useState(false)
  const [geoResult, setGeoResult] = useState<BatchGeocodeSummary | null>(null)

  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtDone, setDistrictDone] = useState(false)
  const [districtResult, setDistrictResult] = useState<DistrictCheckSummary | null>(null)

  const [eligLoading, setEligLoading] = useState(false)
  const [eligDone, setEligDone] = useState(false)
  const [eligResult, setEligResult] = useState<EligibilitySummary | null>(null)

  const [siblingLoading, setSiblingLoading] = useState(false)
  const [siblingDone, setSiblingDone] = useState(false)
  const [siblingResult, setSiblingResult] = useState<SiblingResult | null>(null)

  const [error, setError] = useState<string | null>(null)

  const loadPlayers = async () => {
    setLoadingPlayers(true)
    try {
      const data = await getPlayers()
      setPlayers(data)
    } finally {
      setLoadingPlayers(false)
    }
  }

  useEffect(() => {
    loadPlayers()
  }, [])

  const handleGeocode = async () => {
    setGeoLoading(true)
    setError(null)
    try {
      const result = await geocodeMissingPlayers()
      setGeoResult(result)
      setGeoDone(true)
      await loadPlayers()
    } catch {
      setError("Geocoding failed. Make sure GOOGLE_MAPS_API_KEY is configured.")
    } finally {
      setGeoLoading(false)
    }
  }

  const handleDistrictCheck = async () => {
    setDistrictLoading(true)
    setError(null)
    try {
      const result = await checkPlayersInDistrict()
      setDistrictResult(result)
      setDistrictDone(true)
      await loadPlayers()
    } catch {
      setError("District check failed. Ensure the KML file is present and geopandas is installed.")
    } finally {
      setDistrictLoading(false)
    }
  }

  const handleEligibility = async () => {
    setEligLoading(true)
    setError(null)
    try {
      const result = await checkPlayerEligibility()
      setEligResult(result)
      setEligDone(true)
      await loadPlayers()
    } catch {
      setError("Eligibility check failed.")
    } finally {
      setEligLoading(false)
    }
  }

  const handleSiblingCheck = async () => {
    setSiblingLoading(true)
    setError(null)
    try {
      const res = await client.get("/players/sibling-check/")
      setSiblingResult(res.data)
      setSiblingDone(true)
    } catch {
      setError("Sibling check failed.")
    } finally {
      setSiblingLoading(false)
    }
  }

  // School token matching mirrors the backend _SCHOOL_TOKENS list so stat cards
  // reflect eligibility live without requiring Step 3 to have been run.
  const SCHOOL_TOKENS = [
    "crooked creek", "fox hill", "greenbriar", "nora elementary",
    "spring mill", "towne meadow", "willow lake", "brebeuf",
    "park tudor", "st. luke", "saint luke", "st luke",
    "st. monica", "saint monica", "st monica", "hasten",
    "sycamore school", "orchard school",
    "international montessori", "international school of indiana",
  ]
  const schoolMatches = (name: string) => {
    const lower = (name || "").toLowerCase().trim()
    return SCHOOL_TOKENS.some((t) => lower.includes(t))
  }

  // Derived counts
  const geocodedCount       = players.filter((p) => p.latitude != null).length
  const uncheckedCount      = players.filter((p) => p.latitude != null && p.in_district == null).length
  const inDistrictCount     = players.filter((p) => p.in_district === true).length
  const outDistrictCount    = players.filter((p) => p.in_district === false).length
  const schoolEligibleCount = players.filter((p) => !p.in_district && schoolMatches(p.school_name ?? "")).length
  const eligibleCount       = inDistrictCount + schoolEligibleCount

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111" }}>
            Eligibility
          </Typography>
        </Box>
        <Typography sx={{ color: "#777", fontSize: "0.875rem", ml: "20px" }}>
          Geocode player addresses, check district boundaries, determine eligibility, and identify siblings.
        </Typography>
      </Box>

      {/* Summary stats */}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <StatCard
          label="Total Players"
          value={loadingPlayers ? "…" : players.length}
          color="#111"
          icon={<LocationOnIcon fontSize="small" />}
        />
        <StatCard
          label="Geocoded"
          value={loadingPlayers ? "…" : geocodedCount}
          color="#1565c0"
          icon={<LocationOnIcon fontSize="small" />}
        />
        <StatCard
          label="In District"
          value={loadingPlayers ? "…" : inDistrictCount}
          color="#2e7d32"
          icon={<CheckCircleOutlineIcon fontSize="small" />}
        />
        <StatCard
          label="Out of District"
          value={loadingPlayers ? "…" : outDistrictCount}
          color="#C41230"
          icon={<CancelOutlinedIcon fontSize="small" />}
        />
        <StatCard
          label="Eligible"
          value={loadingPlayers ? "…" : eligibleCount}
          color="#2e7d32"
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          sub={loadingPlayers ? undefined : `${inDistrictCount} address · ${schoolEligibleCount} school`}
        />
        {uncheckedCount > 0 && (
          <StatCard
            label="Needs Check"
            value={uncheckedCount}
            color="#ed6c02"
            icon={<HelpOutlineIcon fontSize="small" />}
          />
        )}
      </Box>

      {/* Action panel */}
      <Paper
        elevation={0}
        sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 3 }}
      >
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Validation Steps</Typography>
        <Typography sx={{ color: "#888", fontSize: "0.8rem", mb: 2 }}>
          Run these steps in order after importing players.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <ActionButton
            label="1. Geocode Addresses"
            description="Look up lat/lng for all players missing coordinates using Google Maps."
            loading={geoLoading}
            done={geoDone}
            onClick={handleGeocode}
          />
          <ActionButton
            label="2. Check District Boundary"
            description="Compare geocoded coordinates against the district KML boundary polygon."
            loading={districtLoading}
            done={districtDone}
            onClick={handleDistrictCheck}
          />
          <ActionButton
            label="3. Determine Eligibility"
            description="Mark players eligible if: (1) address is in district, OR (2) they attend a WTLL feeder school. School enrollment alone qualifies — geocoding not required."
            loading={eligLoading}
            done={eligDone}
            onClick={handleEligibility}
          />
          <ActionButton
            label="4. Sibling Check"
            description="Identify likely siblings by finding players who share the same contact email address. Flags groups with different last names for closer review."
            loading={siblingLoading}
            done={siblingDone}
            onClick={handleSiblingCheck}
          />
        </Box>

        {/* Step results */}
        {(geoResult || districtResult || eligResult) && (
          <Box sx={{ mt: 2.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
            {geoResult && (
              <Alert severity="info" sx={{ flex: 1, minWidth: 200 }}>
                Geocoded {geoResult.success} of {geoResult.total} players
                {geoResult.failed > 0 && ` (${geoResult.failed} failed)`}.
              </Alert>
            )}
            {districtResult && (
              <Alert severity="info" sx={{ flex: 1, minWidth: 200 }}>
                {districtResult.in_district} in district, {districtResult.out_of_district} out of{" "}
                {districtResult.total} checked.
              </Alert>
            )}
            {eligResult && (
              <Alert severity="success" sx={{ flex: 1, minWidth: 200 }}>
                {eligResult.eligible} eligible, {eligResult.ineligible} ineligible out of {eligResult.total}.
              </Alert>
            )}
          </Box>
        )}
      </Paper>

      {/* Sibling check results */}
      {siblingResult && (
        <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5, mb: 3 }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <PeopleIcon sx={{ color: "#6a1b9a", fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Sibling Check Results</Typography>
              <Typography sx={{ color: "#777", fontSize: "0.78rem" }}>
                Players sharing the same contact email are likely siblings or from the same household.
              </Typography>
            </Box>
            {/* Summary chips */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                icon={<PeopleIcon sx={{ fontSize: "14px !important" }} />}
                label={`${siblingResult.total_groups} group${siblingResult.total_groups !== 1 ? "s" : ""}`}
                size="small"
                sx={{ bgcolor: "#f3e5f5", color: "#6a1b9a", fontWeight: 600 }}
              />
              <Chip
                label={`${siblingResult.players_flagged} players`}
                size="small"
                sx={{ bgcolor: "#e8eaf6", color: "#3949ab", fontWeight: 600 }}
              />
              {siblingResult.younger_sibling_eligible_count > 0 && (
                <Chip
                  icon={<CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />}
                  label={`${siblingResult.younger_sibling_eligible_count} younger sibling eligible`}
                  size="small"
                  sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
                />
              )}
              {siblingResult.different_last_name_groups > 0 && (
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
                  label={`${siblingResult.different_last_name_groups} need review`}
                  size="small"
                  sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 600 }}
                />
              )}
            </Box>
          </Box>

          {siblingResult.total_groups === 0 ? (
            <Alert severity="success">No sibling groups found — no players share the same contact email.</Alert>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 1.5 }}>
              {siblingResult.groups.map((group) => (
                <Paper
                  key={group.email}
                  elevation={0}
                  sx={{
                    border: `1px solid ${
                      group.has_qualifying_sibling ? "#c8e6c9" :
                      group.different_last_names ? "#ffe0b2" : "#e8eaf6"
                    }`,
                    borderRadius: 1.5,
                    p: 1.75,
                    bgcolor: group.has_qualifying_sibling ? "#f1f8e9" :
                             group.different_last_names ? "#fffde7" : "#fafafa",
                  }}
                >
                  {/* Card header */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1, flexWrap: "wrap" }}>
                    {group.has_qualifying_sibling ? (
                      <CheckCircleOutlineIcon sx={{ color: "#2e7d32", fontSize: 16 }} />
                    ) : group.different_last_names ? (
                      <WarningAmberIcon sx={{ color: "#e65100", fontSize: 16 }} />
                    ) : (
                      <PeopleIcon sx={{ color: "#6a1b9a", fontSize: 16 }} />
                    )}
                    <Typography sx={{
                      fontSize: "0.75rem", fontWeight: 600,
                      color: group.has_qualifying_sibling ? "#2e7d32" :
                             group.different_last_names ? "#e65100" : "#6a1b9a"
                    }}>
                      {group.has_qualifying_sibling ? "Younger Sibling Rule Applies" :
                       group.different_last_names ? "Different Last Names" : "Same Family"}
                    </Typography>
                    <Chip
                      label={`${group.player_count} players`}
                      size="small"
                      sx={{ ml: "auto", height: 18, fontSize: "0.68rem", bgcolor: "#ede7f6", color: "#6a1b9a", fontWeight: 700 }}
                    />
                  </Box>

                  {/* Email */}
                  <Typography sx={{ fontSize: "0.72rem", color: "#888", mb: 1, fontFamily: "monospace", wordBreak: "break-all" }}>
                    {group.email}
                  </Typography>

                  {/* Players */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {group.players.map((p) => (
                      <Box key={p.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Box sx={{
                            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                            bgcolor: p.qualifying_division ? "#43a047" : p.younger_sibling_eligible ? "#1565c0" : "#9c27b0",
                          }} />
                          <Typography sx={{ fontSize: "0.82rem", fontWeight: 500 }}>
                            {p.first_name} <strong>{p.last_name}</strong>
                          </Typography>
                          {p.division && (
                            <Chip
                              label={p.division}
                              size="small"
                              sx={{
                                height: 16, fontSize: "0.65rem", fontWeight: 600,
                                bgcolor: p.qualifying_division ? "#e8f5e9" : "#f3e5f5",
                                color: p.qualifying_division ? "#2e7d32" : "#6a1b9a",
                              }}
                            />
                          )}
                        </Box>
                        {p.younger_sibling_eligible && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1.75, mt: 0.25 }}>
                            <CheckCircleOutlineIcon sx={{ color: "#2e7d32", fontSize: 12 }} />
                            <Typography sx={{ fontSize: "0.68rem", color: "#2e7d32", fontWeight: 600 }}>
                              Younger Sibling Eligible
                            </Typography>
                          </Box>
                        )}
                        {p.qualifying_division && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1.75, mt: 0.25 }}>
                            <Typography sx={{ fontSize: "0.68rem", color: "#43a047", fontWeight: 500 }}>
                              Qualifying sibling (AA or lower)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* KML boundary file management */}
      <KmlPanel onUploaded={() => { setDistrictDone(false); setDistrictResult(null) }} />

      {/* February re-check panel */}
      <RecheckPanel onComplete={loadPlayers} />

      {/* Player table */}
      <Paper elevation={0} sx={{ border: "1px solid #e4e4e7", borderRadius: 2, p: 2.5 }}>
        <Typography sx={{ fontWeight: 600, mb: 1.5 }}>
          Player Address Status{" "}
          <Chip
            label={players.length}
            size="small"
            sx={{ bgcolor: "#e4e4e7", fontWeight: 700, fontSize: "0.75rem", height: 20 }}
          />
        </Typography>

        {loadingPlayers ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "#C41230" }} />
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Name", "School", "City/State", "Geocoded", "District", "Eligibility"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {p.last_name}, {p.first_name}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.82rem", color: p.school_name ? "#111" : "#bbb" }}>
                      {p.school_name || "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.82rem", whiteSpace: "nowrap" }}>
                      {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {p.latitude != null ? (
                        <Tooltip title={`${p.latitude?.toFixed(5)}, ${p.longitude?.toFixed(5)}`}>
                          <Chip
                            label="Yes"
                            size="small"
                            sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip label="No" size="small" sx={{ bgcolor: "#f4f4f5", color: "#888" }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <InDistrictChip value={p.in_district ?? null} />
                    </TableCell>
                    <TableCell>
                      <EligibleChip value={p.is_eligible} reason={(p as any).eligibility_reason} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
