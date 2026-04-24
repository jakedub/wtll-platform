import type { Division } from '@/models/division'

export interface Team {
  id: number
  name: string
  coach: string | null
  assistant_coach: string | null
  jersey_color: string | null
  jersey_code: string | null
  year: number
  team_type: string | null
  division: Division
  division_name: string | null
  is_active: boolean
  created_at: string
}