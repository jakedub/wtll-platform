import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import SharedCalendar from '../components/Calendar'
import { format } from 'date-fns'

import {  getTeam } from '../api/teams'
import { useParams } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle } from '@mui/material'


export default function TeamCalendar() {
    // const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const { id } = useParams<{ id: string }>()
  const teamId = Number(id)

useEffect(() => {
  const id = Number(teamId)

  if (!teamId || isNaN(id)) {
    setLoading(false)
    return
  }

  setLoading(true)

  getTeam(id)
    .then((team) => {
      const mapped = (team.events ?? []).map((e: any) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time ?? e.start_time),
        raw: {
          ...e,
          startFormatted: format(new Date(e.start_time), 'HH:mm, MM/dd/yy'),
          endFormatted: e.end_time
            ? format(new Date(e.end_time), 'HH:mm, MM/dd/yy')
            : null,
        }
      }))

      setEvents(mapped)
    })
    .catch((err) => {
      console.error("❌ ERROR:", err)
      setError("Failed to load events.")
    })
    .finally(() => setLoading(false))
}, [teamId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) return <Alert severity="error">{error}</Alert>


return (
  <Box>
    <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>
      Calendar
    </Typography>

    <SharedCalendar
      events={events}
      onSelectEvent={(event: any) => {
        setSelectedEvent(event)
        setOpen(true)
      }}
    />

    <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
      <DialogTitle>{selectedEvent?.title}</DialogTitle>

      <DialogContent>
        <Typography>
          Type: {selectedEvent?.raw?.event_type}
        </Typography>

        <Typography>
          Location: {selectedEvent?.raw?.location}
        </Typography>

        <Typography>
          Opponent: {selectedEvent?.raw?.opponent || 'N/A'}
        </Typography>

        <Typography>
          Start: {selectedEvent?.raw?.startFormatted}
        </Typography>

        <Typography>
          End: {selectedEvent?.raw?.endFormatted}
        </Typography>

        <Typography>
          Field: {selectedEvent?.raw?.field}
        </Typography>
      </DialogContent>
    </Dialog>
  </Box>
)}