import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball'

import { getPlayers, getPlayerEnrollments } from '../api/players'
import { createPitchCount } from '../api/pitchCount'


import type { Player } from '@/models/player'
import { PlayerEnrollment } from '@/types'

// Local helper — mirrors backend rest rule
// function localRestRequired(pitches: number): number {
//   if (pitches >= 66) return 4
//   if (pitches >= 51) return 3
//   if (pitches >= 36) return 2
//   if (pitches >= 21) return 1
//   return 0
// }

// Divisions eligible for pitch count tracking
const BASEBALL_PITCH_DIVISIONS = ["majors", "aaa"]
const SOFTBALL_PITCH_DIVISIONS = ["softball majors", "softball minors"]

// Program label inference from division name — determines ordering
function inferProgram(divisionName: string): { label: string; order: number } {
  const d = (divisionName || "").toLowerCase()
  if (d.includes("fall ball"))  return { label: "Fall Ball",           order: 5 }
  if (d.includes("all star"))   return { label: "All Stars",           order: 4 }
  if (d.includes("showcase"))   return { label: "Showcase",            order: 3 }
  if (d.includes("teen"))       return { label: "Teen Baseball",       order: 2 }
  if (d.includes("softball"))   return { label: "Recreation Softball", order: 1 }
  return                               { label: "Recreation Baseball", order: 0 }
}

// Build a sortable group key: "00 Recreation Baseball / AAA / Tigers"
function groupKey(player: any): string {
  const div  = (player as any).division_name ?? "No Division"
  const team = (player as any).team_name     ?? "Free Agents"
  const prog = inferProgram(div)
  return `${String(prog.order).padStart(2, "0")} ${prog.label} / ${div} / ${team}`
}

// Human-readable group label (strip sort prefix)
function groupLabel(key: string): string {
  return key.replace(/^\d{2} /, "")
}

export default function PitchLogPage() {
  const [searchParams] = useSearchParams()
  const sportFilter = searchParams.get('sport') ?? 'baseball'
  const isSoftball = sportFilter === 'softball'

  const [allEligiblePlayers, setAllEligiblePlayers] = useState<Player[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [pitchersOnly, setPitchersOnly] = useState(false)

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  const [enrollments, setEnrollments] = useState<PlayerEnrollment[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<PlayerEnrollment | null>(null)

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formPitches, setFormPitches] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [lastLogged, setLastLogged] = useState<{
    player: string
    pitches: number
    date: string
  } | null>(null)

  // Load all active players for this sport, filter to pitch-eligible divisions,
  // then sort by program → division → team → last name
  useEffect(() => {
    getPlayers(isSoftball ? { sport: 'softball' } : {})
      .then(data => {
        const allowedDivisions = isSoftball ? SOFTBALL_PITCH_DIVISIONS : BASEBALL_PITCH_DIVISIONS
        const eligible = data.filter(p => {
          const divName = ((p as any).division_name ?? '').toLowerCase()
          return allowedDivisions.some(d => divName.includes(d)) || !divName
        })
        eligible.sort((a, b) => {
          const ga = groupKey(a)
          const gb = groupKey(b)
          if (ga !== gb) return ga.localeCompare(gb)
          const la = (a.last_name ?? '').toLowerCase()
          const lb = (b.last_name ?? '').toLowerCase()
          return la.localeCompare(lb)
        })
        setAllEligiblePlayers(eligible)
      })
      .finally(() => setLoadingPlayers(false))
  }, [isSoftball])

  // Apply pitchers-only filter
  useEffect(() => {
    setPlayers(pitchersOnly ? allEligiblePlayers.filter(p => p.is_pitcher) : allEligiblePlayers)
    setSelectedPlayer(null)
  }, [pitchersOnly, allEligiblePlayers])

  // Load enrollments when player changes
  useEffect(() => {
    if (!selectedPlayer) {
      setEnrollments([])
      setSelectedEnrollment(null)
      return
    }

    getPlayerEnrollments(selectedPlayer.id)
      .then((data) => {
        setEnrollments(data)
        setSelectedEnrollment(null)
      })
      .catch(() => {
        setEnrollments([])
        setSelectedEnrollment(null)
      })
  }, [selectedPlayer])

  const pitchCount = Number(formPitches)

  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedEnrollment || !formPitches) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      await createPitchCount({
        player: selectedPlayer.id,
        player_enrollment: selectedEnrollment.id,
        game_date: formDate,
        pitches_thrown: pitchCount,
      })

      setLastLogged({
        player: selectedPlayer.full_name,
        pitches: pitchCount,
        date: formDate,
      })

      // const updated = await getPlayerPitchStatus(selectedPlayer.id)
      // pitchStatus state removed, so no setPitchStatus call here

      setFormPitches('')
    } catch {
      setSubmitError('Failed to save. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Log Game Pitches
        </Typography>
      </Box>

      {/* Pitchers-only toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Chip
          icon={<SportsBaseballIcon sx={{ fontSize: '16px !important' }} />}
          label="Pitchers Only"
          clickable
          onClick={() => setPitchersOnly(v => !v)}
          variant={pitchersOnly ? 'filled' : 'outlined'}
          sx={{
            fontWeight: pitchersOnly ? 700 : 500,
            bgcolor: pitchersOnly ? '#C41230' : 'transparent',
            color: pitchersOnly ? '#fff' : '#555',
            borderColor: pitchersOnly ? '#C41230' : '#ccc',
            '& .MuiChip-icon': { color: pitchersOnly ? '#fff' : '#888' },
            '&:hover': { bgcolor: pitchersOnly ? '#960E24' : '#f5f5f5' },
          }}
        />
        {pitchersOnly && (
          <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>
            {players.length} pitcher{players.length !== 1 ? 's' : ''} in eligible divisions
          </Typography>
        )}
      </Box>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Player — grouped by Program → Division → Team */}
          <Autocomplete
            options={players}
            getOptionLabel={(p) =>
              `${p.last_name ?? ''}, ${p.first_name ?? ''}`
            }
            groupBy={(p) => groupKey(p)}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedPlayer}
            onChange={(_, val) => {
              setSelectedPlayer(val)
              setLastLogged(null)
            }}
            renderGroup={(params) => (
              <li key={params.key}>
                {/* Group header: "Recreation Baseball / AAA / Tigers" */}
                <Box
                  sx={{
                    px: 2, py: 0.6,
                    bgcolor: '#f4f4f5',
                    borderTop: '1px solid #e4e4e7',
                    position: 'sticky',
                    top: -8,
                    zIndex: 1,
                  }}
                >
                  {groupLabel(params.group).split(' / ').map((part, i, arr) => (
                    <Box key={i} component="span">
                      {i === 0 && (
                        <Box component="span" sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C41230' }}>
                          {part}
                        </Box>
                      )}
                      {i === 1 && (
                        <Box component="span" sx={{ fontWeight: 600, fontSize: '0.78rem', color: '#333' }}>
                          {' › '}{part}
                        </Box>
                      )}
                      {i === 2 && (
                        <Box component="span" sx={{ fontWeight: 400, fontSize: '0.75rem', color: '#777' }}>
                          {' › '}{part}
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
                <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={loadingPlayers ? 'Loading players…' : 'Search player by name…'}
                size="small"
                label="Player"
              />
            )}
            loading={loadingPlayers}
            noOptionsText="No players found"
            sx={{ '& .MuiAutocomplete-listbox': { maxHeight: 400 } }}
          />

          {/* Enrollment */}
          {enrollments.length > 0 && (
            <Autocomplete
              options={enrollments}
              getOptionLabel={(e) => e?.label ?? ''}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              value={selectedEnrollment}
              onChange={(_, val) => setSelectedEnrollment(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select Division / Team"
                  size="small"
                />
              )}
            />
          )}

          <Divider />

          {/* Inputs */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="date"
              size="small"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              sx={{ flex: 1 }}
            />

            <TextField
              type="number"
              size="small"
              label="Pitches"
              value={formPitches}
              onChange={(e) => setFormPitches(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Button
            variant="contained"
            disabled={!selectedPlayer || !selectedEnrollment || submitting || !formPitches}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : 'Log Pitches'}
          </Button>
        </CardContent>
      </Card>

      {/* Last log */}
      {lastLogged && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <CheckCircleOutlineIcon color="success" />
            <Typography>
              {lastLogged.player} — {lastLogged.pitches} pitches
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}