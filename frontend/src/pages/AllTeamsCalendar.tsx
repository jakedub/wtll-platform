import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Tooltip from '@mui/material/Tooltip'
import SyncIcon from '@mui/icons-material/Sync'
import SharedCalendar from '../components/Calendar'
import { Dialog, DialogTitle, DialogContent, Typography } from '@mui/material'
import { getAllTeamEvents } from '../api/teams'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import client from '../api/client'

interface Props {
  sport?: 'baseball' | 'softball'
}

function matchesSport(event: any, sport?: string): boolean {
  if (!sport) return true
  const divName = (event.division?.name ?? event.division ?? '').toLowerCase()
  if (sport === 'softball') return divName.includes('softball')
  // baseball = anything that's NOT softball
  return !divName.includes('softball')
}

export default function AllTeamsCalendar({ sport }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const label = sport === 'baseball' ? 'Baseball' : sport === 'softball' ? 'Softball' : null

  useEffect(() => {
    getAllTeamEvents()
      .then((res) => {
        const filtered = sport ? res.filter((e: any) => matchesSport(e, sport)) : res
        const mapped = filtered.map((e: any) => ({
          id: e.id,
          title: e.title,
          start: new Date(e.start_time),
          end: e.end_time ? new Date(e.end_time) : null,
          raw: {
            ...e,
            startFormatted: format(new Date(e.start_time), 'HH:mm, MM/dd/yy'),
            endFormatted: e.end_time ? format(new Date(e.end_time), 'HH:mm, MM/dd/yy') : null,
          }
        }))
        setEvents(mapped)
      })
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false))
  }, [sport])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const params = sport ? { sport } : {}
      const res = await client.post('/calendars/sync/', null, { params })
      const d = res.data
      setSyncMsg(`Synced ${d.synced} calendar${d.synced !== 1 ? 's' : ''} — ${d.total_created} new, ${d.total_updated} updated`)
      // Reload events
      const all = await getAllTeamEvents()
      const filtered = sport ? all.filter((e: any) => matchesSport(e, sport)) : all
      setEvents(filtered.map((e: any) => ({
        id: e.id, title: e.title,
        start: new Date(e.start_time),
        end: e.end_time ? new Date(e.end_time) : null,
        raw: { ...e, startFormatted: format(new Date(e.start_time), 'HH:mm, MM/dd/yy'), endFormatted: e.end_time ? format(new Date(e.end_time), 'HH:mm, MM/dd/yy') : null },
      })))
    } catch { setSyncMsg('Sync failed — check server logs.') }
    finally { setSyncing(false) }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography variant="h4" fontWeight={700}>Calendar</Typography>
        {label && <Chip label={label} size="small" sx={{ bgcolor: '#C41230', color: '#fff', fontWeight: 700 }} />}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Pull latest events from GameChanger ICS feeds">
          <Button size="small" variant="outlined" startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
            onClick={handleSync} disabled={syncing} color="inherit" sx={{ fontSize: '0.78rem' }}>
            {syncing ? 'Syncing…' : 'Sync Calendars'}
          </Button>
        </Tooltip>
      </Box>

      <SharedCalendar
        events={events}
        onSelectEvent={(event: any) => { setSelectedEvent(event); setOpen(true) }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>{selectedEvent?.title}</DialogTitle>
        <DialogContent>
          <Typography>Type: {selectedEvent?.raw?.event_type}</Typography>
          <Typography>Location: {selectedEvent?.raw?.location}</Typography>
          <Typography>Opponent: {selectedEvent?.raw?.opponent || 'N/A'}</Typography>
          <Typography>Start: {selectedEvent?.raw?.startFormatted}</Typography>
          <Typography>End: {selectedEvent?.raw?.endFormatted}</Typography>
          <Typography>Field: {selectedEvent?.raw?.field}</Typography>
          <Button component={Link} to={`/team-calendars/${selectedEvent?.raw?.team}`}
            variant="contained" sx={{ mt: 2 }}>
            Open Team Calendar
          </Button>
        </DialogContent>
      </Dialog>
      <Snackbar open={!!syncMsg} autoHideDuration={5000} onClose={() => setSyncMsg(null)}
        message={syncMsg} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  )
}
