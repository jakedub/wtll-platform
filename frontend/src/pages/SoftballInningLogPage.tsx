import { useEffect, useState } from 'react'
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
import client from '../api/client'
import { getPlayers, getPlayerEnrollments } from '../api/players'
import type { Player } from '@/models/player'
import { PlayerEnrollment } from '@/types'

// Softball Minors and Majors eligible for inning tracking
const SOFTBALL_INNING_DIVISIONS = ["softball majors", "softball minors"]

const STATUS_CONFIG = {
  AVAILABLE:   { label: "Available to Pitch", bg: "#e8f5e9", color: "#2e7d32" },
  RESTING:     { label: "Resting",            bg: "#fff8e1", color: "#b45309" },
  MAX_INNINGS: { label: "Max Innings Today",  bg: "#fdecea", color: "#C41230" },
}

interface SoftballStatus {
  status: "AVAILABLE" | "RESTING" | "MAX_INNINGS"
  innings_today: number
  innings_remaining_today: number
  innings_last_game: number
  last_game_date: string | null
  days_rest_required: number
  days_since_last_game: number
  next_available_date: string
}

export default function SoftballInningLogPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [enrollments, setEnrollments] = useState<PlayerEnrollment[]>([])
  const [selectedEnrollment, setSelectedEnrollment] = useState<PlayerEnrollment | null>(null)
  const [pitchStatus, setPitchStatus] = useState<SoftballStatus | null>(null)

  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formInnings, setFormInnings] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [lastLogged, setLastLogged] = useState<{ player: string; innings: number; date: string } | null>(null)

  // Load softball pitchers in eligible divisions
  useEffect(() => {
    getPlayers({ sport: 'softball' } as any)
      .then(data => {
        const eligible = data.filter(p => {
          const divName = ((p as any).division_name ?? '').toLowerCase()
          return SOFTBALL_INNING_DIVISIONS.some(d => divName.includes(d)) || !divName
        })
        eligible.sort((a, b) => {
          const da = (a as any).division_name ?? ''
          const db = (b as any).division_name ?? ''
          if (da !== db) return da.localeCompare(db)
          return (a.last_name ?? '').localeCompare(b.last_name ?? '')
        })
        setPlayers(eligible)
      })
      .finally(() => setLoadingPlayers(false))
  }, [])

  // Load enrollments + status when player changes
  useEffect(() => {
    if (!selectedPlayer) {
      setEnrollments([]); setSelectedEnrollment(null); setPitchStatus(null)
      return
    }
    getPlayerEnrollments(selectedPlayer.id)
      .then(data => { setEnrollments(data); setSelectedEnrollment(null) })
      .catch(() => { setEnrollments([]); setSelectedEnrollment(null) })

    client.get(`/softball-innings/status/${selectedPlayer.id}/`)
      .then(r => setPitchStatus(r.data))
      .catch(() => setPitchStatus(null))
  }, [selectedPlayer])

  const innings = Number(formInnings)

  const handleSubmit = async () => {
    if (!selectedPlayer || !formInnings || innings < 1 || innings > 12) return
    setSubmitting(true); setSubmitError(null)
    try {
      await client.post('/softball-innings/', {
        player: selectedPlayer.id,
        player_enrollment: selectedEnrollment?.id ?? null,
        game_date: formDate,
        innings_pitched: innings,
      })
      setLastLogged({ player: selectedPlayer.full_name, innings, date: formDate })
      setFormInnings('')
      // Refresh status
      const r = await client.get(`/softball-innings/status/${selectedPlayer.id}/`)
      setPitchStatus(r.data)
    } catch (e: any) {
      setSubmitError(e?.response?.data?.error ?? 'Failed to save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const statusCfg = pitchStatus ? STATUS_CONFIG[pitchStatus.status] ?? STATUS_CONFIG.AVAILABLE : null

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box sx={{ width: 4, height: 28, bgcolor: '#C41230', borderRadius: 1, flexShrink: 0 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111' }}>Log Softball Innings</Typography>
        </Box>
        <Typography sx={{ color: '#777', fontSize: '0.875rem', ml: '20px' }}>
          Softball uses innings, not pitch count. Max 12 innings/day · 1 day rest if 7+ innings pitched.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Player selector */}
          <Autocomplete
            options={players}
            getOptionLabel={p => `${p.last_name ?? ''}, ${p.first_name ?? ''}`}
            groupBy={p => (p as any).division_name ?? 'No Division'}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={selectedPlayer}
            onChange={(_, val) => { setSelectedPlayer(val); setLastLogged(null) }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={loadingPlayers ? 'Loading players…' : 'Search player by name…'}
                size="small"
                label="Player"
              />
            )}
            loading={loadingPlayers}
            noOptionsText="No softball pitchers found"
          />

          {/* Status chip */}
          {pitchStatus && statusCfg && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={statusCfg.label}
                size="small"
                sx={{ bgcolor: statusCfg.bg, color: statusCfg.color, fontWeight: 700, fontSize: '0.78rem' }}
              />
              <Typography sx={{ fontSize: '0.78rem', color: '#666' }}>
                {pitchStatus.innings_today} inn today · {pitchStatus.innings_remaining_today} remaining
              </Typography>
              {pitchStatus.status === 'RESTING' && (
                <Typography sx={{ fontSize: '0.78rem', color: '#b45309' }}>
                  Next available: {pitchStatus.next_available_date}
                </Typography>
              )}
            </Box>
          )}

          {/* Enrollment */}
          {enrollments.length > 0 && (
            <Autocomplete
              options={enrollments}
              getOptionLabel={e => e?.label ?? ''}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              value={selectedEnrollment}
              onChange={(_, val) => setSelectedEnrollment(val)}
              renderInput={params => (
                <TextField {...params} placeholder="Select Division / Team" size="small" />
              )}
            />
          )}

          <Divider />

          {/* Date + innings */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              type="date"
              size="small"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              size="small"
              label="Innings Pitched"
              value={formInnings}
              onChange={e => setFormInnings(e.target.value)}
              inputProps={{ min: 1, max: 12 }}
              sx={{ flex: 1 }}
              helperText="1–12 innings"
            />
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}

          <Button
            variant="contained"
            disabled={!selectedPlayer || submitting || !formInnings || innings < 1 || innings > 12}
            onClick={handleSubmit}
            sx={{ bgcolor: '#C41230', '&:hover': { bgcolor: '#960E24' } }}
          >
            {submitting ? 'Saving…' : 'Log Innings'}
          </Button>
        </CardContent>
      </Card>

      {lastLogged && (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CheckCircleOutlineIcon color="success" />
            <Typography>
              {lastLogged.player} — {lastLogged.innings} inning{lastLogged.innings !== 1 ? 's' : ''} on {lastLogged.date}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Rule reference */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#fafafa', border: '1px solid #e4e4e7', borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>LL Softball Pitching Rules (Minors & Majors)</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.8 }}>
          • Max <strong>12 innings</strong> pitched per calendar day<br />
          • Pitched in <strong>7 or more innings</strong> in a day → <strong>1 calendar day of rest</strong> required<br />
          • Pitched in <strong>1–6 innings</strong> → no rest required<br />
          • Delivery of a single pitch constitutes having pitched in an inning
        </Typography>
      </Box>
    </Box>
  )
}
