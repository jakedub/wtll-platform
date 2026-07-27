import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import PeopleIcon from '@mui/icons-material/People'
import GavelIcon from '@mui/icons-material/Gavel'
import AssessmentIcon from '@mui/icons-material/Assessment'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TerminalIcon from '@mui/icons-material/Terminal'
import PersonIcon from '@mui/icons-material/Person'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'

const RED = '#C41230'

interface DashStats {
  players: { total: number; baseball: number; softball: number }
  eligibility: { address_in_district: number; school_enrollment: number; ineligible: number; not_checked: number }
  drafts: { total: number; open: number; complete: number }
  evaluations_this_year: number
  programs: { id: number; name: string; program_type: string; season_closed: boolean }[]
  season_year: number
  budget: {
    has_data: boolean
    revenue_est: number
    expense_est: number
    net_est: number
    revenue_act: number
    expense_act: number
    net_act: number
  }
}

function StatCard({
  icon, label, value, sub, color = RED, to,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
  color?: string
  to?: string
}) {
  const inner = (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #e4e4e7', borderRadius: 2, p: 2.5,
        display: 'flex', flexDirection: 'column', gap: 1, height: '100%',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        ...(to ? { cursor: 'pointer', '&:hover': { borderColor: color, boxShadow: `0 0 0 1px ${color}20` } } : {}),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        {to && <ArrowForwardIcon sx={{ fontSize: 14, color: '#ccc', ml: 'auto' }} />}
      </Box>
      <Typography sx={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>{sub}</Typography>}
    </Paper>
  )
  return to
    ? <Box component={Link} to={to} sx={{ textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</Box>
    : inner
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/dashboard/stats/')
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: RED }} />
      </Box>
    )
  }

  if (!stats) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>WTLL League Platform</Typography>
        <Typography sx={{ color: '#888' }}>Could not load dashboard stats.</Typography>
      </Box>
    )
  }

  const eligibleCount = stats.eligibility.address_in_district + stats.eligibility.school_enrollment
  const eligPct = stats.players.total > 0 ? Math.round((eligibleCount / stats.players.total) * 100) : 0

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {stats.season_year} Season
          </Typography>
        </Box>
        <Typography sx={{ color: '#777', fontSize: '0.875rem', ml: '20px' }}>
          Washington Township Little League — league operations overview.
        </Typography>
      </Box>

      {/* Top stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<PeopleIcon />}
            label="Active Players"
            value={stats.players.total}
            sub={`${stats.players.baseball} baseball · ${stats.players.softball} softball`}
            to="/players"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<CheckCircleOutlineIcon />}
            label="Eligible"
            value={`${eligibleCount} (${eligPct}%)`}
            sub={`${stats.eligibility.address_in_district} address · ${stats.eligibility.school_enrollment} school`}
            color="#2e7d32"
            to="/address-validation"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<GavelIcon />}
            label="Drafts"
            value={stats.drafts.total}
            sub={`${stats.drafts.open} open · ${stats.drafts.complete} complete`}
            color="#1565c0"
            to="/draft"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<AssessmentIcon />}
            label="Evaluations"
            value={stats.evaluations_this_year}
            sub={`${stats.season_year} season`}
            color="#6a1b9a"
            to="/evaluations"
          />
        </Grid>
      </Grid>

      {/* Eligibility breakdown */}
      <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Eligibility Status</Typography>
          <Button component={Link} to="/address-validation" size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.78rem', color: '#888' }}>
            Run checks
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { key: 'address_in_district', label: '✓ Address in District', bg: '#e8f5e9', color: '#2e7d32' },
            { key: 'school_enrollment',   label: '✓ School Enrollment',   bg: '#e3f2fd', color: '#1565c0' },
            { key: 'ineligible',          label: '✗ Ineligible',          bg: '#fdecea', color: '#C41230' },
            { key: 'not_checked',         label: '— Not Checked',         bg: '#f4f4f5', color: '#888'    },
          ].map(({ key, label, bg, color }) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={stats.eligibility[key as keyof typeof stats.eligibility]}
                size="small"
                sx={{ bgcolor: bg, color, fontWeight: 700, height: 22, fontSize: '0.75rem' }}
              />
              <Typography sx={{ fontSize: '0.78rem', color: '#555' }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Budget summary */}
      {stats.budget?.has_data && (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon sx={{ color: '#1565c0', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{stats.season_year} Budget</Typography>
            </Box>
            <Button component={Link} to="/budget" size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              sx={{ fontSize: '0.78rem', color: '#888' }}>
              Full budget
            </Button>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { label: 'Revenue Est.',  value: stats.budget.revenue_est,  icon: <TrendingUpIcon sx={{ fontSize: 16 }} />, color: '#2e7d32' },
              { label: 'Expenses Est.', value: stats.budget.expense_est,  icon: <TrendingDownIcon sx={{ fontSize: 16 }} />, color: '#C41230' },
              { label: 'Net Estimate',  value: stats.budget.net_est,      icon: <AccountBalanceWalletIcon sx={{ fontSize: 16 }} />, color: stats.budget.net_est >= 0 ? '#2e7d32' : '#C41230' },
            ].map(({ label, value, icon, color }) => (
              <Box key={label} sx={{ p: 1.5, bgcolor: `${color}08`, borderRadius: 1.5, border: `1px solid ${color}20` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color }}>
                  {icon}
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
                    {label}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color }}>
                  ${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Program year status */}
      {stats.programs.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{stats.season_year} Programs</Typography>
            <Button component={Link} to="/program-years" size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              sx={{ fontSize: '0.78rem', color: '#888' }}>
              Manage
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {stats.programs.map(p => (
              <Chip
                key={p.id}
                label={p.name}
                size="small"
                icon={p.season_closed
                  ? <LockOutlinedIcon sx={{ fontSize: '0.75rem !important' }} />
                  : undefined}
                sx={{
                  bgcolor: p.season_closed ? '#f4f4f5' : `${RED}12`,
                  color: p.season_closed ? '#aaa' : RED,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24,
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Admin-only quick links */}
      {user?.is_staff && (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, p: 2, mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <LockOutlinedIcon sx={{ fontSize: 14, color: '#bbb' }} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#bbb' }}>
              Admin
            </Typography>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {[
              { to: '/internal-console', label: 'Internal Console', icon: <TerminalIcon sx={{ fontSize: 15 }} /> },
              { to: '/jake',             label: 'Jake',             icon: <PersonIcon    sx={{ fontSize: 15 }} /> },
            ].map(({ to, label, icon }) => (
              <Button
                key={to}
                component={Link}
                to={to}
                size="small"
                startIcon={icon}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                sx={{
                  fontSize: '0.78rem', color: '#555', fontWeight: 600,
                  border: '1px solid #e4e4e7', borderRadius: 1.5,
                  px: 1.5, py: 0.6, textTransform: 'none',
                  '&:hover': { borderColor: RED, color: RED, bgcolor: `${RED}08` },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}
