export interface Player {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  date_of_birth: string | null

  batting_hand: string
  throwing_hand: string

  is_eligible: boolean
  is_allstar: boolean
  is_showcase: boolean
  interested_showcase: boolean
  residency_same: boolean
  is_pitcher: boolean
  is_catcher: boolean
  is_archived: boolean

  program: string
  sport: string

  // Computed / joined fields returned by the API
  division_name: string | null
  team_name: string | null
  team: number | null

  address_line_1: string
  address_line_2: string
  city: string
  state: string
  zip_code: string

  latitude: number | null
  longitude: number | null
  in_district: boolean | null
  district_checked_at: string | null

  school_name: string
  teammate_request: string
  coach_request: string
  jersey_size: string

  tier: string
  tier_spot: number
  overall_total: number
  pitcher_tier: string
  catcher_tier: string

  created_at: string
  updated_at: string
}

export interface ImportResult {
  inserted: Player[]
  updated: Player[]
  failures: { row: number; error: string }[]
  summary: {
    inserted_count: number
    updated_count: number
    failure_count: number
  }
}
