import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import { getPlayers, getPlayerPitchStatus, getPlayerEnrollments } from '../api/players'
import { createPitchCount } from '../api/pitchCount'


import type { Player } from '@/models/player'
import { PlayerEnrollment } from '@/types'

// Local helper — mirrors backend rest rule
function localRestRequired(pitches: number): number {
  if (pitches >= 66) return 4
  if (pitches >= 51) return 3
  if (pitches >= 36) return 2
  if (pitches >= 21) return 1
  return 0
}

export default function PitchLogPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)

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

  // Load players
  useEffect(() => {
    getPlayers()
      .then(setPlayers)
      .finally(() => setLoadingPlayers(false))
  }, [])

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

      const updated = await getPlayerPitchStatus(selectedPlayer.id)
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

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Player */}
          <Autocomplete
            options={players}
            getOptionLabel={(p) =>
              p.full_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
            }
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedPlayer}
            onChange={(_, val) => {
              setSelectedPlayer(val)
              setLastLogged(null)
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Select player" size="small" />
            )}
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