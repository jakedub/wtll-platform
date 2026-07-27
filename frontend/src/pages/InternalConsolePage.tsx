/**
 * InternalConsolePage — staff-only platform health and debug overview.
 * Route: /internal-console  (not in navConfig — hidden from sidebar)
 *
 * Panels:
 *   1. API Health  — live ping via /api/auth/me/
 *   2. Users       — counts by role from /api/auth/users/
 *   3. Season      — player + program snapshot from /api/dashboard/stats/
 *   4. Modules     — enabled/disabled flags from /api/settings/site/
 *   5. Environment — client-visible config values
 */
import { useEffect, useState } from "react"
import {
  Alert, Box, Chip, CircularProgress, Divider,
  IconButton, Paper, Tooltip, Typography,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ErrorIcon from "@mui/icons-material/Error"
import client from "../api/client"
import { useAuth } from "../context/AuthContext"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ManagedUser {
  id: number
  email: string
  is_staff: boolean
  is_board_member: boolean
  is_coach: boolean
  is_umpire: boolean
  is_active: boolean
  last_login: string | null
}

interface DashStats {
  players: { total: number; baseball: number; softball: number }
  programs: { id: number; name: string; program_type: string; season_closed: boolean }[]
  season_year: number
  evaluations_this_year: number
  drafts: { total: number; open: number; complete: number }
  budget: { has_data: boolean; net_est: number; net_act: number }
}

interface SiteSettings {
  module_finance_enabled: boolean
  module_baseball_enabled: boolean
  module_softball_enabled: boolean
  module_schedule_enabled: boolean
  module_involvement_enabled: boolean
  module_preseason_enabled: boolean
  umpire_signups_enabled: boolean
  volunteer_signups_enabled: boolean
  evaluation_signups_enabled: boolean
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{
      fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.07em", color: "#888", mb: 1.5,
    }}>
      {children}
    </Typography>
  )
}

function StatRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.75 }}>
      <Typography sx={{ fontSize: "0.82rem", color: muted ? "#aaa" : "#444" }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: muted ? "#bbb" : "#111" }}>
        {value}
      </Typography>
    </Box>
  )
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.6 }}>
      <Typography sx={{ fontSize: "0.82rem", color: "#444" }}>{label}</Typography>
      <Chip
        label={on ? "On" : "Off"}
        size="small"
        sx={{
          height: 18, fontSize: "0.62rem", fontWeight: 700,
          bgcolor: on ? "#e8f5e9" : "#f5f5f5",
          color: on ? "#2e7d32" : "#aaa",
        }}
      />
    </Box>
  )
}

function Card({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5, ...sx }}>
      {children}
    </Paper>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function ApiHealthPanel({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking")
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    setStatus("checking")
    const t0 = performance.now()
    client.get("/auth/me/")
      .then(() => { setMs(Math.round(performance.now() - t0)); setStatus("ok") })
      .catch(() => setStatus("error"))
  }, [refreshKey])

  return (
    <Card>
      <SectionLabel>API Health</SectionLabel>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {status === "checking" && <CircularProgress size={18} sx={{ color: "#C41230" }} />}
        {status === "ok" && <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 22 }} />}
        {status === "error" && <ErrorIcon sx={{ color: "#C41230", fontSize: 22 }} />}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {status === "checking" ? "Pinging…" : status === "ok" ? "Backend reachable" : "Backend unreachable"}
          </Typography>
          {status === "ok" && ms !== null && (
            <Typography sx={{ fontSize: "0.72rem", color: "#888" }}>{ms} ms round-trip</Typography>
          )}
          {status === "error" && (
            <Typography sx={{ fontSize: "0.72rem", color: "#C41230" }}>
              /api/auth/me/ returned an error
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  )
}

function UsersPanel({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setUsers(null); setError(false)
    client.get("/auth/users/")
      .then(r => setUsers(r.data ?? []))
      .catch(() => setError(true))
  }, [refreshKey])

  const active   = users?.filter(u => u.is_active) ?? []
  const inactive = users?.filter(u => !u.is_active) ?? []
  const staff    = users?.filter(u => u.is_staff) ?? []
  const board    = users?.filter(u => u.is_board_member) ?? []
  const coaches  = users?.filter(u => u.is_coach) ?? []
  const umpires  = users?.filter(u => u.is_umpire) ?? []

  const lastLogins = users
    ?.filter(u => u.last_login)
    .sort((a, b) => new Date(b.last_login!).getTime() - new Date(a.last_login!).getTime())
    .slice(0, 5) ?? []

  return (
    <Card>
      <SectionLabel>Users</SectionLabel>
      {!users && !error && <CircularProgress size={18} sx={{ color: "#C41230" }} />}
      {error && <Alert severity="error" sx={{ py: 0.5 }}>Failed to load users.</Alert>}
      {users && (
        <>
          <StatRow label="Total accounts" value={users.length} />
          <StatRow label="Active" value={active.length} />
          <StatRow label="Inactive" value={inactive.length} muted={inactive.length === 0} />
          <Divider sx={{ my: 1 }} />
          <StatRow label="Admins (staff)" value={staff.length} />
          <StatRow label="Board members" value={board.length} />
          <StatRow label="Coaches" value={coaches.length} />
          <StatRow label="Umpires" value={umpires.length} />

          {lastLogins.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1 }}>
                Recent logins
              </Typography>
              {lastLogins.map(u => (
                <Box key={u.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                  <Typography sx={{ fontSize: "0.75rem", color: "#555" }}>{u.email}</Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#aaa" }}>{formatDate(u.last_login)}</Typography>
                </Box>
              ))}
            </>
          )}
        </>
      )}
    </Card>
  )
}

function SeasonPanel({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<DashStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setStats(null); setError(false)
    client.get("/dashboard/stats/")
      .then(r => setStats(r.data))
      .catch(() => setError(true))
  }, [refreshKey])

  return (
    <Card>
      <SectionLabel>Season {stats?.season_year ?? "—"}</SectionLabel>
      {!stats && !error && <CircularProgress size={18} sx={{ color: "#C41230" }} />}
      {error && <Alert severity="error" sx={{ py: 0.5 }}>Failed to load stats.</Alert>}
      {stats && (
        <>
          <StatRow label="Total players" value={stats.players.total} />
          <StatRow label="Baseball" value={stats.players.baseball} />
          <StatRow label="Softball" value={stats.players.softball} />
          <Divider sx={{ my: 1 }} />
          <StatRow label="Active programs" value={stats.programs.filter(p => !p.season_closed).length} />
          <StatRow label="Evaluations logged" value={stats.evaluations_this_year} />
          <StatRow label="Drafts (open / total)" value={`${stats.drafts.open} / ${stats.drafts.total}`} />
          {stats.budget.has_data && (
            <>
              <Divider sx={{ my: 1 }} />
              <StatRow
                label="Budget net (est.)"
                value={`${stats.budget.net_est >= 0 ? "+" : ""}$${stats.budget.net_est.toLocaleString()}`}
              />
              <StatRow
                label="Budget net (actual)"
                value={`${stats.budget.net_act >= 0 ? "+" : ""}$${stats.budget.net_act.toLocaleString()}`}
              />
            </>
          )}
        </>
      )}
    </Card>
  )
}

function ModulesPanel({ refreshKey }: { refreshKey: number }) {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setSettings(null); setError(false)
    client.get("/settings/site/")
      .then(r => setSettings(r.data))
      .catch(() => setError(true))
  }, [refreshKey])

  return (
    <Card>
      <SectionLabel>Modules and Public Pages</SectionLabel>
      {!settings && !error && <CircularProgress size={18} sx={{ color: "#C41230" }} />}
      {error && <Alert severity="error" sx={{ py: 0.5 }}>Failed to load settings.</Alert>}
      {settings && (
        <>
          <Flag on={settings.module_preseason_enabled}   label="Pre-Season module" />
          <Flag on={settings.module_finance_enabled}     label="Finance module" />
          <Flag on={settings.module_baseball_enabled}    label="Baseball Ops module" />
          <Flag on={settings.module_softball_enabled}    label="Softball Ops module" />
          <Flag on={settings.module_schedule_enabled}    label="Schedule module" />
          <Flag on={settings.module_involvement_enabled} label="Involvement module" />
          <Divider sx={{ my: 1 }} />
          <Flag on={settings.umpire_signups_enabled}      label="Public umpire sign-ups" />
          <Flag on={settings.volunteer_signups_enabled}   label="Public volunteer sign-ups" />
          <Flag on={settings.evaluation_signups_enabled}  label="Public eval sign-ups" />
        </>
      )}
    </Card>
  )
}

function EnvPanel() {
  const apiBase = import.meta.env.VITE_API_URL || "(proxy — dev)"
  const mode    = import.meta.env.MODE || "unknown"
  const prod    = import.meta.env.PROD

  return (
    <Card>
      <SectionLabel>Environment</SectionLabel>
      <StatRow label="Mode"     value={mode} />
      <StatRow label="API base" value={apiBase} />
      <StatRow label="Build"    value={prod ? "Production" : "Development"} />
    </Card>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InternalConsolePage() {
  const { user } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: "#C41230", borderRadius: 1, flexShrink: 0 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Internal Console</Typography>
            <Typography variant="body2" color="text.secondary">
              Signed in as {user?.email} · staff only
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh all panels">
          <IconButton onClick={() => setRefreshKey(k => k + 1)} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Grid */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2.5,
      }}>
        <ApiHealthPanel refreshKey={refreshKey} />
        <EnvPanel />
        <UsersPanel refreshKey={refreshKey} />
        <SeasonPanel refreshKey={refreshKey} />
        <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
          <ModulesPanel refreshKey={refreshKey} />
        </Box>
      </Box>
    </Box>
  )
}
