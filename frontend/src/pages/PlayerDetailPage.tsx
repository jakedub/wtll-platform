import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ArchiveIcon from '@mui/icons-material/Archive'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'

import {
  getPlayer,
  getPlayerPitchStatus,
  getPlayerPitchHistory,
  archivePlayer,
} from '../api/players'
import client from '../api/client'
import { createPitchCount } from '../api/pitchCount'
import PitchStatusChip from '../components/PitchStatusChip'
import SportChip from '../components/SportChip'
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

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false)
  const [editFields, setEditFields] = useState<Partial<Player>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openEdit = () => {
    if (!player) return
    setEditFields({
      first_name: player.first_name,
      last_name: player.last_name,
      date_of_birth: player.date_of_birth ?? null,
      batting_hand: player.batting_hand ?? "",
      throwing_hand: player.throwing_hand ?? "",
      jersey_size: player.jersey_size ?? "",
      is_pitcher: player.is_pitcher ?? false,
      is_catcher: player.is_catcher ?? false,
      address_line_1: player.address_line_1 ?? "",
      address_line_2: player.address_line_2 ?? "",
      city: player.city ?? "",
      state: player.state ?? "",
      zip_code: player.zip_code ?? "",
      school_name: player.school_name ?? "",
      teammate_request: player.teammate_request ?? "",
      coach_request: player.coach_request ?? "",
      sport: player.sport ?? "baseball",
    })
    setSaveError(null)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!player) return
    setSaving(true); setSaveError(null)
    try {
      const res = await client.patch(`/players/${player.id}/`, editFields)
      setPlayer(res.data)
      setEditOpen(false)
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data === "object" && !data.detail) {
        // Field-level validation errors: {batting_hand: ["..."]}
        const msgs = Object.entries(data).map(([f, v]) => `${f}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ")
        setSaveError(msgs)
      } else {
        setSaveError(data?.detail ?? "Save failed.")
      }
    } finally { setSaving(false) }
  }

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          component={Link}
          to="/players"
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          All Players
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!player.is_archived && (
            <>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditOutlinedIcon />}
                onClick={openEdit}
                sx={{ fontSize: '0.78rem', borderColor: '#1565c0', color: '#1565c0', '&:hover': { borderColor: '#0d47a1', bgcolor: '#e3f2fd30' } }}
              >
                Edit Profile
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArchiveIcon />}
                onClick={async () => {
                  if (!confirm(`Archive ${player.full_name}? They will be moved to the Recycling Bin and hidden from active views.`)) return
                  try {
                    await archivePlayer(player.id)
                    window.location.href = '/players'
                  } catch { alert('Archive failed.') }
                }}
                sx={{ borderColor: '#ed6c02', color: '#ed6c02', fontSize: '0.78rem', '&:hover': { borderColor: '#e65100', bgcolor: '#fff3e010' } }}
              >
                Archive
              </Button>
            </>
          )}
          {player.is_archived && (
            <Chip label="Archived" icon={<ArchiveIcon sx={{ fontSize: 14 }} />}
              sx={{ bgcolor: '#fff3e0', color: '#e65100', fontWeight: 700 }} />
          )}
        </Box>
      </Box>

      {/* Edit profile panel */}
      <Collapse in={editOpen}>
        <Paper elevation={0} sx={{ border: '1px solid #1565c0', borderRadius: 2, p: 2.5, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EditOutlinedIcon sx={{ color: '#1565c0', fontSize: 18 }} />
            <Typography sx={{ fontWeight: 700, color: '#1565c0' }}>Edit Player Profile</Typography>
          </Box>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
            <TextField label="First Name" size="small" value={editFields.first_name ?? ''} onChange={e => setEditFields(p => ({ ...p, first_name: e.target.value }))} />
            <TextField label="Last Name" size="small" value={editFields.last_name ?? ''} onChange={e => setEditFields(p => ({ ...p, last_name: e.target.value }))} />
            <TextField label="Date of Birth" size="small" type="date" InputLabelProps={{ shrink: true }}
              value={editFields.date_of_birth ?? ''}
              onChange={e => setEditFields(p => ({ ...p, date_of_birth: e.target.value || null }))} />
            <TextField label="School Name" size="small" value={editFields.school_name ?? ''} onChange={e => setEditFields(p => ({ ...p, school_name: e.target.value }))} />
            <TextField label="Jersey Size" size="small" value={editFields.jersey_size ?? ''} onChange={e => setEditFields(p => ({ ...p, jersey_size: e.target.value }))}
              select SelectProps={{ native: true }}>
              {['', 'YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'].map(s => <option key={s} value={s}>{s || '—'}</option>)}
            </TextField>
            <TextField label="Batting Hand" size="small" value={editFields.batting_hand ?? ''} onChange={e => setEditFields(p => ({ ...p, batting_hand: e.target.value }))}
              select SelectProps={{ native: true }}>
              {['', 'R', 'L', 'S'].map(s => <option key={s} value={s}>{s || '—'}</option>)}
            </TextField>
            <TextField label="Throwing Hand" size="small" value={editFields.throwing_hand ?? ''} onChange={e => setEditFields(p => ({ ...p, throwing_hand: e.target.value }))}
              select SelectProps={{ native: true }}>
              {['', 'R', 'L'].map(s => <option key={s} value={s}>{s || '—'}</option>)}
            </TextField>
            <TextField label="Sport" size="small" value={editFields.sport ?? 'baseball'} onChange={e => setEditFields(p => ({ ...p, sport: e.target.value }))}
              select SelectProps={{ native: true }}>
              <option value="baseball">Baseball</option>
              <option value="softball">Softball</option>
            </TextField>
          </Box>
          {/* Role flags */}
          <Box sx={{ display: 'flex', gap: 3, mt: 0.5 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!editFields.is_pitcher}
                  onChange={e => setEditFields(p => ({ ...p, is_pitcher: e.target.checked }))}
                  sx={{ '&.Mui-checked': { color: '#1565c0' } }}
                />
              }
              label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1565c0' }}>Pitcher</Typography>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!editFields.is_catcher}
                  onChange={e => setEditFields(p => ({ ...p, is_catcher: e.target.checked }))}
                  sx={{ '&.Mui-checked': { color: '#C41230' } }}
                />
              }
              label={<Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#C41230' }}>Catcher</Typography>}
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#555', mb: 1.5 }}>Address</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
            <TextField label="Street" size="small" value={editFields.address_line_1 ?? ''} onChange={e => setEditFields(p => ({ ...p, address_line_1: e.target.value }))} sx={{ gridColumn: 'span 2' }} />
            <TextField label="Unit / Apt" size="small" value={editFields.address_line_2 ?? ''} onChange={e => setEditFields(p => ({ ...p, address_line_2: e.target.value }))} />
            <TextField label="City" size="small" value={editFields.city ?? ''} onChange={e => setEditFields(p => ({ ...p, city: e.target.value }))} />
            <TextField label="State" size="small" value={editFields.state ?? ''} onChange={e => setEditFields(p => ({ ...p, state: e.target.value }))} />
            <TextField label="ZIP" size="small" value={editFields.zip_code ?? ''} onChange={e => setEditFields(p => ({ ...p, zip_code: e.target.value }))} />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#555', mb: 1.5 }}>Requests</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Teammate Request" size="small" value={editFields.teammate_request ?? ''} onChange={e => setEditFields(p => ({ ...p, teammate_request: e.target.value }))} />
            <TextField label="Coach Request" size="small" value={editFields.coach_request ?? ''} onChange={e => setEditFields(p => ({ ...p, coach_request: e.target.value }))} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, justifyContent: 'flex-end' }}>
            <Button variant="outlined" color="inherit" startIcon={<CancelOutlinedIcon />} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
              onClick={handleSave} disabled={saving}
              sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Player Detail
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {player.full_name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <SportChip sport={player.sport} />
            <Typography variant="body2" color="text.secondary">
              {player.division_name ?? 'No Division'} · {player.team_name ?? 'Unrostered'}
            </Typography>
          </Box>
        </Box>
        {player.is_pitcher && pitchStatus && (
          <Box sx={{ pt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <PitchStatusChip status={pitchStatus.status} pitchStatus={pitchStatus} size="medium" />
            {pitchStatus.consecutive_days_pitched > 0 && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                bgcolor: pitchStatus.consecutive_day_block ? '#ffebee' : pitchStatus.consecutive_days_pitched === 2 ? '#fff8e1' : '#f4f4f5',
                border: `1px solid ${pitchStatus.consecutive_day_block ? '#ef5350' : pitchStatus.consecutive_days_pitched === 2 ? '#ffa726' : '#ddd'}`,
                borderRadius: 5, px: 1.25, py: 0.3,
                fontSize: '0.75rem', fontWeight: 700,
                color: pitchStatus.consecutive_day_block ? '#b71c1c' : pitchStatus.consecutive_days_pitched === 2 ? '#e65100' : '#555',
              }}>
                {pitchStatus.consecutive_days_pitched} consecutive day{pitchStatus.consecutive_days_pitched !== 1 ? 's' : ''}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Grid container spacing={2.5}>
        {/* Pitch Status Card — only shown for pitchers */}
        {player.is_pitcher && pitchStatus && (
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
                  <Box>
                    <Typography variant="caption" color="text.secondary">Consecutive Days</Typography>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color={
                        pitchStatus.consecutive_day_block ? '#b71c1c'
                        : pitchStatus.consecutive_days_pitched >= 2 ? '#e65100'
                        : 'text.primary'
                      }
                    >
                      {pitchStatus.consecutive_days_pitched}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pitchStatus.consecutive_day_block ? '⛔ 3rd day blocked' : 'of 2 max'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">3-Day Rule</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ mt: 0.5 }}
                      color={pitchStatus.consecutive_day_block ? '#b71c1c' : pitchStatus.consecutive_days_pitched === 2 ? '#e65100' : '#2e7d32'}
                    >
                      {pitchStatus.consecutive_day_block
                        ? '⛔ Blocked'
                        : pitchStatus.consecutive_days_pitched === 2
                        ? '⚠️ Next day blocked'
                        : '✅ Clear'}
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

        {/* Log Pitches Form + History — only for pitchers */}
        {player.is_pitcher && <><Grid item xs={12} md={7}>
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
        </Grid></>}

        {/* Non-pitcher placeholder */}
        {!player.is_pitcher && (
          <Grid item xs={12}>
            <Card elevation={0} sx={{ border: '1px solid #f0f0f0', borderRadius: 2, bgcolor: '#fafafa' }}>
              <CardContent sx={{ py: '12px !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: '0.82rem', color: '#aaa' }}>
                  Pitch count tracking is not enabled for this player. Mark them as a <strong>Pitcher</strong> in Edit Profile to enable it.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}
