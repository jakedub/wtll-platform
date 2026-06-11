export interface ApiEvent {
  id: number
  team: number
  title: string
  start_time: string
  end_time?: string
  location?: string
  description?: string
  field?: string
  field_id:number
  event_type: 'GAME' | 'PRACTICE' | 'OTHER'
  opponent?: string
  is_cancelled: boolean
  team_name?: string
  division?: {
    id: number
    name: string
  }
}