import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { getTeams, getTeamRosterWithSummary } from '../api/teams'
import type { Team } from '@/models/team'

const DIVISION_ORDER = ['PeeWee', 'AA', 'AAA', 'Majors', 'Softball']

function groupByDivision(teams: Team[]): Record<string, Team[]> {
  return teams.reduce<Record<string, Team[]>>((acc, team) => {
    const key = team.division?.name ?? 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(team)
    return acc
  }, {})
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)
  const [rosterMap, setRosterMap] = useState<Record<number, any[]>>({})
  const [loadingRoster, setLoadingRoster] = useState<Record<number, boolean>>({})

  const toggleTeam = async (teamId: number) => {
    const isOpen = expandedTeamId === teamId
    setExpandedTeamId(isOpen ? null : teamId)

    if (isOpen) return

    // already loaded
    if (rosterMap[teamId]) return

    setLoadingRoster(prev => ({ ...prev, [teamId]: true }))

    try {
      const res = await getTeamRosterWithSummary(teamId)

      console.log('✅ RAW TEAM ROSTER RESPONSE:', res)

      setRosterMap(prev => ({
        ...prev,
        [teamId]: res.roster ?? [],
      }))
    } catch (err) {
      console.error(err)
      setRosterMap(prev => ({
        ...prev,
        [teamId]: [],
      }))
    } finally {
      setLoadingRoster(prev => ({ ...prev, [teamId]: false }))
    }
  }

  useEffect(() => {
    getTeams({ is_active: true })
      .then((data) => {
        console.log('✅ TEAMS RAW:', data)
        setTeams(Array.isArray(data) ? data : [])
      })
      .catch(() => setError('Failed to load teams.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) return <Alert severity="error">{error}</Alert>

  const grouped = groupByDivision(teams)
  const divisionKeys = [
    ...DIVISION_ORDER.filter(d => grouped[d]),
    ...Object.keys(grouped).filter(d => !DIVISION_ORDER.includes(d)),
  ]

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
        Teams
      </Typography>

      {divisionKeys.map(divName => (
        <Box key={divName} sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
            {divName}
          </Typography>

          <Grid container spacing={2}>
            {grouped[divName].map(team => (
              <Grid item xs={12} sm={6} md={4} key={team.id}>
                <Card
                  sx={{ cursor: 'pointer' }}
                  onClick={() => toggleTeam(team.id)}
                >
                  <CardContent>
                    <Typography fontWeight={700}>{team.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {team.coach}
                    </Typography>
                  </CardContent>
                </Card>

                {expandedTeamId === team.id && (
                  <Card sx={{ mt: 1 }}>
                    <CardContent>
                      {loadingRoster[team.id] ? (
                        <CircularProgress size={18} />
                      ) : (
                        <>
                          {(rosterMap[team.id] ?? []).length === 0 ? (
                            <Typography variant="caption">
                              No players found
                            </Typography>
                          ) : (
                            (rosterMap[team.id] ?? []).map((p: any) => (
                              <Box key={p.id} sx={{ mb: 1 }}>
                                <Typography fontWeight={600}>
                                  {p.player_name}
                                </Typography>

                                <Typography variant="caption">
                                  {p.division} • {p.team}
                                </Typography>

                                <Typography variant="caption" display="block">
                                  Status: {p.pitch_status?.status} • Rest: {p.pitch_status?.days_rest_required}
                                </Typography>
                              </Box>
                            ))
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  )
}