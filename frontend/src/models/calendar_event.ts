import { ApiEvent } from "./api_event"

export interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date | null
  eventType: 'GAME' | 'PRACTICE' | 'OTHER'
  isCancelled: boolean
  location?: string
  opponent?:string
  field?: string
  field_id: number
  raw: ApiEvent;
  team_id?: number;
  team_name?: string;
  division?: {
    id: number
    name: string
    }
}