import { Calendar as RBCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { CalendarEvent } from '@/models/calendar_event'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

type Props = {
  events: CalendarEvent[]
    onSelectEvent?: (event: CalendarEvent) => void
}

function eventStyleGetter(event: any) {
  let backgroundColor = '#1976d2' // default blue

  if (event.eventType === 'GAME') backgroundColor = '#2e7d32'      // green
  if (event.eventType === 'PRACTICE') backgroundColor = '#ed6c02'  // orange
  if (event.eventType === 'OTHER') backgroundColor = '#6d6d6d'     // gray

  if (event.isCancelled) {
    backgroundColor = '#b71c1c' // red
  }

  return {
    style: {
      backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
    },
  }
}

export default function SharedCalendar({ events, onSelectEvent }: Props) {
  return (
    <RBCalendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 700 }}
      views={['month', 'week', 'day', 'agenda']}
      onSelectEvent={onSelectEvent}
      eventPropGetter={eventStyleGetter}
    />
  )
}

export const Calendar = SharedCalendar;