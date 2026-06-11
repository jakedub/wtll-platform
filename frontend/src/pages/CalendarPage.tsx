import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Box, CircularProgress, MenuItem, Select, TextField, Typography, Chip } from '@mui/material'

import {  getAllTeamEvents, getTeamEvents} from '../api/teams'


import SharedCalendar from '../components/calendar/SharedCalendar'
import {mapEvent} from '../mappers/events'
import type { CalendarEvent } from '@/models/calendar_event'

// ─────────────────────────────
// Page Mode
// ─────────────────────────────

type Mode = 'ALL' | 'TEAM'

export default function CalendarPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const mode: Mode = id ? 'TEAM' : 'ALL'
  const teamId = id ? Number(id) : null
  const TEAM_COLORS: Record<number, string> = {
    1: '#B22222', // Guardians (example)
    2: '#0A1F44', // Twins
    3: '#FF8C00', // Tigers
    4: '#4169E1', // Royals
    }

  const isMobile = window.innerWidth < 768
  const defaultView = isMobile ? 'agenda' : 'month'

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<string[]>([])
  const [initializedField, setInitializedField] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [search, setSearch] = useState('')

    function getTeamColor(teamId?: number) {
    if (!teamId) return undefined
    return TEAM_COLORS[teamId]
    }

  useEffect(() => {
    const field = searchParams.get('field')
    const type = searchParams.get('type')
    const team = searchParams.get('team')
    if (field) setSelectedField(field.split(','))
    if (type) setSelectedType(type)
    if (team) setSelectedTeam(team)

    setInitializedField(true)
  }, [])

    const filteredEvents = events.filter(e => {
    if (
        selectedField.length &&
        (!e.field || !selectedField.includes(e.field))
    ) return false

    if (selectedType && e.eventType !== selectedType) return false

    if (selectedTeam && String(e.team_id) !== selectedTeam) return false

    if (
        search &&
        !e.title.toLowerCase().includes(search.toLowerCase())
    ) return false

    return true
    })

  useEffect(() => {
    if (initializedField) return
    if (!selectedField.length && events.length > 0) {
      const firstField = events.map(e => e.field).filter(Boolean)[0]
      if (firstField) {
        setSelectedField([firstField])
      }
    }
  }, [events, selectedField, initializedField])

  

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  const navigate = useNavigate()

  // ─────────────────────────────
  // Load Events
  // ─────────────────────────────

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        let raw: any[] = []

        if (mode === 'ALL') {
          raw = await getAllTeamEvents()
        }

        if (mode === 'TEAM' && teamId) {
          raw = await getTeamEvents(teamId)
        }

        const mapped = raw.map(mapEvent)

        if (alive) setEvents(mapped)
      } catch (err) {
        console.error(err)
        if (alive) setError('Failed to load calendar events')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [mode, teamId])

  // ─────────────────────────────
  // Sync filters to URL
  // ─────────────────────────────

  useEffect(() => {
    const params: any = {}
    if (selectedField.length) params.field = selectedField.join(',')
    if (selectedType) params.type = selectedType
    if (selectedTeam) params.team = selectedTeam
    setSearchParams(params)
  }, [selectedField, selectedType, selectedTeam])

  // ─────────────────────────────
  // Click Handler
  // ─────────────────────────────

  function handleEventClick(event: CalendarEvent) {
    setSelectedEvent(event)
  }

  // ─────────────────────────────
  // UI
  // ─────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Box sx={{ p: 2 }}>{error}</Box>
  }

return (
  <Box
    sx={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      p: 2,
      backgroundColor: "#f6f7fb",
    }}
  >
    {/* Header / optional title area (this is what you lost from TeamCalendar) */}
    <Box sx={{
      display: 'flex',
      gap: 2,
      mb: 2,
      alignItems: 'center',
      flexWrap: 'wrap',
      flexDirection: { xs: 'column', sm: 'row' }
    }}>
    <Select
      multiple
      size="small"
      value={selectedField}
      onChange={(e) => {
        const value = typeof e.target.value === 'string'
          ? e.target.value.split(',')
          : e.target.value

        if (value.includes('ALL_FIELDS')) {
          setSelectedField([])
        } else {
          setSelectedField(value)
        }
      }}
      displayEmpty
      renderValue={(selected) => {
        if (!selected.length) {
            return <em>All Fields</em>
            }
        return (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {selected.map((value) => (
              <Chip key={value} label={value} size="small" />
            ))}
          </Box>
        )
      }}
      sx={{
        width: { xs: '100%', sm: 160 },
        backgroundColor: '#fff',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', height: 40 }
      }}
    >
      <MenuItem value="ALL_FIELDS">
        <em>All Fields</em>
      </MenuItem>
      {[...new Set(events.map(e => e.field).filter(Boolean))]
        .sort((a, b) => (a ?? '').localeCompare(b ?? ''))
        .map(field => (
        <MenuItem key={field} value={field}>
          {field}
        </MenuItem>
      ))}
    </Select>

    <Select
      size="small"
      value={selectedType ?? ''}
      onChange={(e) => setSelectedType(e.target.value || null)}
      displayEmpty
      sx={{
        width: { xs: '100%', sm: 160 },
        backgroundColor: '#fff',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', height: 40 }
      }}
    >
      <MenuItem value="">
        <em>All Types</em>
      </MenuItem>
      <MenuItem value="GAME">Games</MenuItem>
      <MenuItem value="PRACTICE">Practice</MenuItem>
      <MenuItem value="OTHER">Other</MenuItem>
    </Select>

<Select
  size="small"
  value={selectedTeam ?? ''}
  onChange={(e) => setSelectedTeam(e.target.value || null)}
  displayEmpty
  sx={{
    width: { xs: '100%', sm: 160 },
    backgroundColor: '#fff',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' },
    '& .MuiSelect-select': { display: 'flex', alignItems: 'center', height: 40 }
  }}
>
  <MenuItem value="">
    <em>All Teams</em>
  </MenuItem>

  {Object.entries(
    events.reduce((acc: any, e) => {
      const division = e.division?.name ?? 'Unknown'
      if (!acc[division]) acc[division] = []
      acc[division].push(e)
      return acc
    }, {})
  ).map(([division, divisionEvents]) => [
    // Division header (NOT selectable)
    <MenuItem key={`header-${division}`} disabled>
      <strong>{division}</strong>
    </MenuItem>,

    // Teams under division
    ...Array.from(
      new Map(
        (divisionEvents as any[])
          .filter(e => e.team_id)
          .map(e => [e.team_id, e])
      ).values()
    ).map(team => (
      <MenuItem
        key={team.team_id}
        value={String(team.team_id)}
        sx={{ pl: 3 }}
      >
        {team.team_name ?? `Team ${team.team_id}`}
      </MenuItem>
    ))
  ])}
</Select>
    <TextField
      placeholder="Search events..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      size="small"
      sx={{
        width: { xs: '100%', sm: 200 },
        backgroundColor: '#fff',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ccc' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' }
      }}
    />

    <Box>
      <Chip
        label="Clear Filters"
        onClick={() => {
          setSelectedField([])
          setSelectedType(null)
          setSelectedTeam(null)
          setSearch('')
        }}
        sx={{
          cursor: 'pointer',
          border: '1px solid #ccc',
          backgroundColor: '#fff',
          height: 40,
          '&:hover': { backgroundColor: '#f5f5f5' }
        }}
      />
      <Chip
        label="Agenda"
        onClick={() => navigate('/agenda')}
        sx={{
          cursor: 'pointer',
          border: '1px solid #ccc',
          backgroundColor: '#d32f2f',
          color: '#fff',
          height: 40,
          '&:hover': { backgroundColor: '#b71c1c' }
        }}
      />
    </Box>

    </Box>
    {/* Calendar container */}
    <Box
      sx={{
        flex: 1,
        backgroundColor: "white",
        borderRadius: 2,
        boxShadow: 1,
        p: 2,
      }}
    >
      <SharedCalendar
        events={filteredEvents.map(e => ({
          ...e,
          color: getTeamColor(e.team_id)
        })) as any}
        onSelectEvent={handleEventClick}
      />
    </Box>

    {/* Optional selected event preview */}
    {selectedEvent && (
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 300,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: 3,
          p: 2,
          zIndex: 1000,
        }}
      >
        <Typography variant="h6">{selectedEvent.title}</Typography>
        <Typography variant="body2">
          {selectedEvent.start.toLocaleString()}
        </Typography>
        {selectedEvent.field && (
          <Typography variant="body2">
            Field: {selectedEvent.field}
          </Typography>
        )}
        <Box sx={{ mt: 1, textAlign: 'right' }}>
          <Typography
            sx={{ cursor: 'pointer', color: '#1976d2' }}
            onClick={() => setSelectedEvent(null)}
          >
            Close
          </Typography>
        </Box>
      </Box>
    )}
  </Box>
)
}