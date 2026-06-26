import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BlockIcon from '@mui/icons-material/Block'
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball'

import { getTeams, getTeamRosterWithSummary } from '../api/teams'
import type { Team } from '@/models/team'

const RED = '#C41230'

// Program-type grouping — Recreation first, then Showcase; Field Rental excluded
interface ProgramGroup {
  label: string
  color: string
  divisions: Record<string, Team[]>
}

function groupByProgram(teams: Team[]): ProgramGroup[] {
  // Exclude Field Rental (is_calendar_only) teams
  const active = teams.filter(t => !t.division?.is_calendar_only)

  const rec: Record<string, Team[]> = {}
  const show: Record<string, Team[]> = {}
  const other: Record<string, Team[]> = {}

  for (const team of active) {
    const divName = team.division?.name ?? 'Unassigned'
    const pt = team.division?.program_type ?? ''
    const target = pt === 'RECREATION' ? rec : pt === 'SHOWCASE' ? show : other
    if (!target[divName]) target[divName] = []
    target[divName].push(team)
  }

  const groups: ProgramGroup[] = []
  if (Object.keys(rec).length) groups.push({ label: 'Recreation', color: '#1565c0', divisions: rec })
  if (Object.keys(show).length) groups.push({ label: 'Showcase', color: '#6a1b9a', divisions: show })
  if (Object.keys(other).length) groups.push({ label: 'Other', color: '#555', divisions: other })
  return groups
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string | undefined }) {
  if (!status) return <Chip label="—" size="small" sx={{ bgcolor: '#f0f0f0', color: '#aaa', fontSize: '0.7rem' }} />
  const cfg: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
    AVAILABLE: { label: 'Available', bg: '#e8f5e9', color: '#2e7d32', icon: <CheckCircleIcon sx={{ fontSize: 13 }} /> },
    CAUTION:   { label: 'Caution',   bg: '#fff8e1', color: '#b45309', icon: <WarningAmberIcon sx={{ fontSize: 13 }} /> },
    REST:      { label: 'Resting',   bg: '#fdecea', color: RED,       icon: <BlockIcon sx={{ fontSize: 13 }} /> },
  }
  const c = cfg[status] ?? cfg.AVAILABLE
  return (
    <Chip
      icon={<Box sx={{ color: c.color, display: 'flex', ml: '6px !important' }}>{c.icon}</Box>}
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: '0.72rem' }}
    />
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pitchersOnly, setPitchersOnly] = useState(true)

  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [rosterMap, setRosterMap] = useState<Record<number, any[]>>({})
  const [loadingRoster, setLoadingRoster] = useState<Record<number, boolean>>({})

  const toggleTeam = async (teamId: number) => {
    const isOpen = expandedTeamId === teamId
    setExpandedTeamId(isOpen ? null : teamId)
    if (isOpen) return
    if (rosterMap[teamId]) return

    setLoadingRoster(prev => ({ ...prev, [teamId]: true }))
    try {
      const res = await getTeamRosterWithSummary(teamId)
      setRosterMap(prev => ({ ...prev, [teamId]: res.roster ?? [] }))
    } catch {
      setRosterMap(prev => ({ ...prev, [teamId]: [] }))
    } finally {
      setLoadingRoster(prev => ({ ...prev, [teamId]: false }))
    }
  }

  useEffect(() => {
    getTeams({ is_active: true })
      .then(data => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load teams.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress sx={{ color: RED }} />
    </Box>
  )

  if (error) return <Alert severity="error">{error}</Alert>

  const programGroups = groupByProgram(teams)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: RED, borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111' }}>
            Pitch Count
          </Typography>
        </Box>
        <Chip
          icon={<SportsBaseballIcon sx={{ fontSize: '16px !important' }} />}
          label="Pitchers Only"
          clickable
          onClick={() => setPitchersOnly(v => !v)}
          variant={pitchersOnly ? 'filled' : 'outlined'}
          sx={{
            fontWeight: pitchersOnly ? 700 : 500,
            bgcolor: pitchersOnly ? RED : 'transparent',
            color: pitchersOnly ? '#fff' : '#555',
            borderColor: pitchersOnly ? RED : '#ccc',
            '& .MuiChip-icon': { color: pitchersOnly ? '#fff' : '#888' },
            '&:hover': { bgcolor: pitchersOnly ? '#960E24' : '#f5f5f5' },
          }}
        />
      </Box>

      {programGroups.map(pg => (
        <Box key={pg.label} sx={{ mb: 4 }}>
          {/* Program group header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 3, height: 18, bgcolor: pg.color, borderRadius: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: pg.color }}>
              {pg.label}
            </Typography>
          </Box>

          {Object.keys(pg.divisions).sort().map(divName => (
            <Box key={divName} sx={{ mb: 3 }}>
              {/* Division label */}
              <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', mb: 1, pl: 1 }}>
                {divName}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {pg.divisions[divName].map(team => {
              const isOpen = expandedTeamId === team.id
              const roster: any[] = rosterMap[team.id] ?? []
              const displayRoster = pitchersOnly
                ? roster.filter(p => p.is_pitcher)
                : roster

              return (
                <Paper
                  key={team.id}
                  elevation={0}
                  sx={{ border: '1px solid #e4e4e7', borderRadius: 2, overflow: 'hidden' }}
                >
                  {/* Team header row */}
                  <Box
                    onClick={() => toggleTeam(team.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: 2.5, py: 1.5,
                      bgcolor: '#1c1c1e',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#2a2a2e' },
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                        {team.name}
                      </Typography>
                      {team.coach && (
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                          {team.coach}
                        </Typography>
                      )}
                    </Box>
                    {loadingRoster[team.id] && <CircularProgress size={14} sx={{ color: '#888' }} />}
                    <ExpandMoreIcon
                      sx={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 20,
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </Box>

                  {/* Expanded roster */}
                  <Collapse in={isOpen}>
                    {loadingRoster[team.id] ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} sx={{ color: RED }} />
                      </Box>
                    ) : displayRoster.length === 0 ? (
                      <Box sx={{ px: 2.5, py: 2 }}>
                        <Typography sx={{ fontSize: '0.82rem', color: '#aaa', fontStyle: 'italic' }}>
                          {pitchersOnly ? 'No flagged pitchers on this team.' : 'No players found.'}
                        </Typography>
                      </Box>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1, borderBottom: '1px solid #f0f0f0' } }}>
                            <TableCell>Player</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell align="center">Last Outing</TableCell>
                            <TableCell align="center">7-Day Total</TableCell>
                            <TableCell align="center">Consec. Days</TableCell>
                            <TableCell align="center">Next Available</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {displayRoster.map((p: any) => {
                            const ps = p.pitch_status
                            const isResting  = ps?.status === 'REST'
                            const isCaution  = ps?.status === 'CAUTION'
                            const consecutive = ps?.consecutive_days_pitched ?? 0
                            return (
                              <TableRow
                                key={p.id}
                                sx={{
                                  bgcolor: isResting ? '#fff8f8' : isCaution ? '#fffdf0' : 'transparent',
                                  '&:last-child td': { border: 0 },
                                  '& td': { py: 1.1, borderBottom: '1px solid #f5f5f5' },
                                }}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                      {p.player_name}
                                    </Typography>
                                    {p.is_pitcher && (
                                      <SportsBaseballIcon sx={{ fontSize: 13, color: '#bbb' }} />
                                    )}
                                  </Box>
                                  <Typography sx={{ fontSize: '0.72rem', color: '#aaa' }}>
                                    {p.division}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <StatusChip status={ps?.status} />
                                </TableCell>
                                <TableCell align="center">
                                  <Typography sx={{ fontSize: '0.82rem', color: ps?.pitches_last_outing > 0 ? '#111' : '#bbb', fontWeight: ps?.pitches_last_outing > 0 ? 600 : 400 }}>
                                    {ps?.pitches_last_outing > 0 ? ps.pitches_last_outing : '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography sx={{ fontSize: '0.82rem', color: ps?.pitches_last_7_days > 0 ? '#111' : '#bbb', fontWeight: ps?.pitches_last_7_days > 0 ? 600 : 400 }}>
                                    {ps?.pitches_last_7_days > 0 ? ps.pitches_last_7_days : '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  {consecutive >= 2 ? (
                                    <Chip
                                      label={`${consecutive}d`}
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        bgcolor: consecutive >= 3 ? '#fdecea' : '#fff8e1',
                                        color: consecutive >= 3 ? RED : '#b45309',
                                      }}
                                    />
                                  ) : (
                                    <Typography sx={{ fontSize: '0.82rem', color: '#bbb' }}>—</Typography>
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  {isResting ? (
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: RED }}>
                                      {formatDate(ps?.next_available_date)}
                                    </Typography>
                                  ) : (
                                    <Typography sx={{ fontSize: '0.8rem', color: '#2e7d32', fontWeight: 500 }}>
                                      Today
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </Collapse>
                </Paper>
                )
              })}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
