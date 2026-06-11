import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse,
  Divider, InputAdornment, Paper, TextField, ToggleButton,
  ToggleButtonGroup, Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PeopleIcon from '@mui/icons-material/People'
import { getPlayers } from '../api/players'
import type { Player } from '@/models/player'
import PitchStatusChip from '../components/PitchStatusChip'
import SportChip from '../components/SportChip'

type RoleFilter = 'all' | 'pitcher' | 'catcher'

const RED = '#C41230'

// ── Pitcher / Catcher chips ───────────────────────────────────────────────────

function RoleChip({ label, color }: { label: string; color: string }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: `${color}18`, color, mr: 0.5 }}
    />
  )
}

// ── Player row ────────────────────────────────────────────────────────────────

function PlayerRow({ player }: { player: any }) {
  return (
    <Box
      component={Link}
      to={`/players/${player.id}`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1,
        textDecoration: 'none', color: 'inherit',
        borderBottom: '1px solid #f4f4f5',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: '#fafafa' },
        transition: 'background 0.1s',
      }}
    >
      {/* Name */}
      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>
        {player.last_name}, {player.first_name}
      </Typography>

      {/* Pitcher / Catcher chips */}
      <Box>
        {player.is_pitcher && <RoleChip label="P" color="#1565c0" />}
        {player.is_catcher && <RoleChip label="C" color={RED} />}
      </Box>

      {/* Jersey size */}
      {player.jersey_size && (
        <Typography sx={{ fontSize: '0.75rem', color: '#aaa', minWidth: 32 }}>
          {player.jersey_size}
        </Typography>
      )}

      {/* Eligibility */}
      <Chip
        label={player.is_eligible ? 'Eligible' : 'Ineligible'}
        size="small"
        sx={{
          height: 18, fontSize: '0.65rem', fontWeight: 700,
          bgcolor: player.is_eligible ? 'rgba(46,125,50,0.1)' : 'rgba(196,18,48,0.08)',
          color: player.is_eligible ? '#2e7d32' : RED,
        }}
      />
    </Box>
  )
}

// ── Team group ────────────────────────────────────────────────────────────────

function TeamGroup({ teamName, players }: { teamName: string; players: any[] }) {
  const [open, setOpen] = useState(true)
  const isFreeAgent = teamName === 'Free Agents'

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
          bgcolor: isFreeAgent ? '#fff8f0' : '#f9f9f9',
          borderRadius: 1, cursor: 'pointer',
          border: `1px solid ${isFreeAgent ? '#fed7aa' : '#e4e4e7'}`,
          '&:hover': { bgcolor: isFreeAgent ? '#fff3e0' : '#f4f4f5' },
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', flex: 1, color: isFreeAgent ? '#c2410c' : '#444' }}>
          {teamName}
        </Typography>
        <Chip label={players.length} size="small" sx={{ height: 18, fontSize: '0.68rem', bgcolor: '#e4e4e7' }} />
        {open ? <ExpandLessIcon sx={{ fontSize: 16, color: '#aaa' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#aaa' }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ ml: 0, mt: 0.5, border: '1px solid #f0f0f0', borderRadius: 1, overflow: 'hidden' }}>
          {players.map(p => <PlayerRow key={p.id} player={p} />)}
        </Box>
      </Collapse>
    </Box>
  )
}

// ── Division section ──────────────────────────────────────────────────────────

function DivisionSection({ division, players }: { division: string; players: any[] }) {
  const [open, setOpen] = useState(true)

  // Group by team
  const teams: Record<string, any[]> = {}
  for (const p of players) {
    const t = p.team_name || 'Free Agents'
    if (!teams[t]) teams[t] = []
    teams[t].push(p)
  }

  // Sort: named teams first alphabetically, Free Agents last
  const sortedTeams = Object.keys(teams).sort((a, b) => {
    if (a === 'Free Agents') return 1
    if (b === 'Free Agents') return -1
    return a.localeCompare(b)
  })

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
      {/* Division header */}
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
          bgcolor: '#f4f4f5', cursor: 'pointer',
          borderBottom: open ? '1px solid #e4e4e7' : 'none',
          '&:hover': { bgcolor: '#ebebeb' },
        }}
      >
        <Box sx={{ width: 4, height: 18, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', flex: 1 }}>{division}</Typography>
        <Chip label={`${players.length} players`} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#e4e4e7' }} />
        {open ? <ExpandLessIcon sx={{ fontSize: 18, color: '#888' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: '#888' }} />}
      </Box>

      <Collapse in={open}>
        <Box sx={{ p: 1.5 }}>
          {sortedTeams.map(team => (
            <TeamGroup key={team} teamName={team} players={teams[team]} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayersPage() {
  const [searchParams] = useSearchParams()
  const sportFilter = searchParams.get('sport') ?? undefined

  const [players, setPlayers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params: any = {}
      if (sportFilter) params.sport = sportFilter
      const data = await getPlayers(params)
      setPlayers(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load players. Is the backend running?')
    } finally { setLoading(false) }
  }, [sportFilter])

  useEffect(() => { load() }, [load])

  // Filter by search + role
  const q = search.trim().toLowerCase()
  const filtered = players.filter(p => {
    // Role filter
    if (roleFilter === 'pitcher' && !p.is_pitcher) return false
    if (roleFilter === 'catcher' && !p.is_catcher) return false
    // Search filter
    if (!q) return true
    const name = `${p.first_name} ${p.last_name} ${p.last_name} ${p.first_name}`.toLowerCase()
    const team = (p.team_name || '').toLowerCase()
    const div  = (p.division_name || '').toLowerCase()
    return name.includes(q) || team.includes(q) || div.includes(q)
  })

  // Group by division
  const divisions: Record<string, any[]> = {}
  for (const p of filtered) {
    const div = p.division_name || 'No Division'
    if (!divisions[div]) divisions[div] = []
    divisions[div].push(p)
  }

  // Sort divisions
  const DIVISION_ORDER = ['Majors', 'AAA', 'AA', 'Pee Wee', 'Tee Ball', 'Softball Majors', 'Softball Minors']
  const sortedDivisions = Object.keys(divisions).sort((a, b) => {
    const ia = DIVISION_ORDER.indexOf(a)
    const ib = DIVISION_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  const totalTeams = new Set(players.map(p => p.team_name).filter(Boolean)).size

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          {sportFilter ? `${sportFilter.charAt(0).toUpperCase() + sportFilter.slice(1)} Ops` : 'Roster'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h4" fontWeight={700}>Players</Typography>
          {sportFilter && (
            <Chip label={sportFilter.charAt(0).toUpperCase() + sportFilter.slice(1)} size="small"
              sx={{ bgcolor: '#6a1b9a', color: '#fff', fontWeight: 700 }} />
          )}
        </Box>
        {!loading && (
          <Typography sx={{ color: '#888', fontSize: '0.82rem', mt: 0.25 }}>
            {players.length} players · {sortedDivisions.length} divisions · {totalTeams} teams
          </Typography>
        )}
      </Box>

      {/* Search + Role filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search by name, team, or division…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ maxWidth: 380 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#aaa', fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={roleFilter}
          exclusive
          onChange={(_e, v) => { if (v) setRoleFilter(v) }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontSize: '0.78rem',
              px: 1.75,
              py: 0.5,
              borderColor: '#e0e0e0',
              color: '#666',
              '&.Mui-selected': {
                bgcolor: RED,
                color: '#fff',
                borderColor: RED,
                '&:hover': { bgcolor: '#a80f28' },
              },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="pitcher">Pitchers</ToggleButton>
          <ToggleButton value="catcher">Catchers</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ border: '1px solid #e4e4e7', borderRadius: 2, py: 6, textAlign: 'center' }}>
          <PeopleIcon sx={{ fontSize: 48, color: '#e4e4e7', mb: 1 }} />
          <Typography sx={{ color: '#aaa' }}>
            {search ? `No players match "${search}"` : 'No players found.'}
          </Typography>
        </Paper>
      ) : (
        sortedDivisions.map(div => (
          <DivisionSection key={div} division={div} players={divisions[div]} />
        ))
      )}
    </Box>
  )
}
