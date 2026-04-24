export interface Player {
  id: number
  first_name: string
  last_name: string
  full_name: string
  date_of_birth: string | null
  team: number | null
  team_name: string | null
  division: number | null
  division_name: string | null
  batting_hand: 'R' | 'L' | 'S' | null
  throwing_hand: 'R' | 'L' | 'S' | null
  is_eligible: boolean
  is_allstar: boolean
  is_showcase: boolean
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}