import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

import {
  getPlayer,
  getPlayerPitchStatus,
  getPlayerPitchHistory,
} from '../api/players'
import { createPitchCount } from '../api/pitchCount'
import PitchStatusChip from '../components/PitchStatusChip'
import type { PlayerPitchStatus } from '../types'
import type { Player } from '@/models/player';
import type { PitchCount } from '@/models/pitch_count'

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const playerId = Number(id)

  const [player, setPlayer] = useState<Player | null>(null)
  const [pitchStatus, setPitchStatus] = useState<PlayerPitchStatus | null>(null)
  const [history, setHistory] = useState<PitchCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Log form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formPitches, setFormPitches] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const load = async () => {
    try {
      const [p, s, h] = await Promise.all([
        getPlayer(playerId),
        getPlayerPitchStatus(playerId),
        getPlayerPitchHistory(playerId),
      ])
      setPlayer(p)
      setPitchStatus(s)
      setHistory(h)
    } catch {
      setError('Failed to load player data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [playerId])

  const handleSubmit = async () => {
    if (!formPitches || isNaN(Number(formPitches))) return
    setSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await createPitchCount({
        player: playerId,
        team: player?.team ?? null,
        game_date: formDate,
        pitches_thrown: Number(formPitches),
        notes: formNotes,
      })
      setSubmitSuccess(true)
      setFormPitches('')
      setFormNotes('')
      // Refresh status + history
      const [s, h] = await Promise.all([
        getPlayerPitchStatus(playerId),
        getPlayerPitchHistory(playerId),
      ])
      setPitchStatus(s)
      setHistory(h)
    } catch {
      setSubmitError('Failed to save pitch count. Check the form and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !player) {
    return <Alert severity="error">{error ?? 'Player not found.'}</Alert>
  }

  const statusColor =
    pitchStatus?.status === 'AVAILABLE'
      ? 'success.main'
      : pitchStatus?.status === 'CAUTION'
      ? 'warning.main'
      : 'error.main'

  return (
    <Box>
      {/* Back nav */}
      <Button
        component={Link}
        to="/players"
        startIcon={<ArrowBackIcon />}
        size="small"
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        All Players
      </Button>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Player Detail
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {player.full_name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {player.division_name ?? 'No Division'} · {player.team_name ?? 'Unrostered'}
          </Typography>
        </Box>
        {pitchStatus && (
          <Box sx={{ pt: 2 }}>
            <PitchStatusChip status={pitchStatus.status} size="medium" />
          </Box>
        )}
      </Box>

      <Grid container spacing={2.5}>
        {/* Pitch Status Card */}
        {pitchStatus && (
          <Grid item xs={12} md={5}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" gutterBottom>
                  Pitch Status
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Last Outing</Typography>
                    <Typography variant="h5" fontWeight={700} color={statusColor}>
                      {pitchStatus.pitches_last_outing}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">pitches</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Last 7 Days</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {pitchStatus.pitches_last_7_days}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">total pitches</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Rest Required</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {pitchStatus.days_rest_required}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">days</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Next Available</Typography>
                    <Typography variant="body1" fontWeight={600} fontFamily="monospace">
                      {pitchStatus.next_available_date}
                    </Typography>
                  </Box>
                </Box>

                {pitchStatus.warnings.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    {pitchStatus.warnings.map((w, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 0.5 }}>
                        <WarningAmberIcon fontSize="small" color="warning" sx={{ mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">{w}</Typography>
                      </Box>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Log Pitches Form */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary" gutterBottom>
                Log Game Pitches
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Game Date"
                    type="date"
                    size="small"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Pitches Thrown"
                    type="number"
                    size="small"
                    value={formPitches}
                    onChange={e => setFormPitches(e.target.value)}
                    inputProps={{ min: 1, max: 120 }}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <TextField
                  label="Notes (optional)"
                  multiline
                  rows={2}
                  size="small"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. vs Tigers, threw well through 4 innings"
                />
                {submitError && <Alert severity="error" sx={{ py: 0.5 }}>{submitError}</Alert>}
                {submitSuccess && <Alert severity="success" sx={{ py: 0.5 }}>Pitch count logged.</Alert>}
                <Button
                  variant="contained"
                  disabled={!formPitches || submitting}
                  onClick={handleSubmit}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {submitting ? 'Saving…' : 'Log Pitches'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pitch History Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ pb: '0 !important' }}>
              <Typography variant="overline" color="text.secondary">
                Pitch History
              </Typography>
            </CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Pitches</TableCell>
                    <TableCell>Rest Required</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No pitch history recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map(entry => (
                      <TableRow key={entry.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {entry.game_date}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.pitches_thrown}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${entry.days_rest_required}d`}
                            size="small"
                            variant="outlined"
                            color={
                              entry.days_rest_required === 0
                                ? 'success'
                                : entry.days_rest_required <= 2
                                ? 'warning'
                                : 'error'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {entry.team_name ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.notes ?? '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
