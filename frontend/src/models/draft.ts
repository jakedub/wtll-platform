export interface Draft {
  id: number
  name: string
  year: number
  division: number
  division_name: string | null
  is_complete: boolean
  created_at: string
  selection_count: number
}

export interface DraftPlayerEntry {
  selection_id?: number
  id: number
  name: string
  first_name: string
  last_name: string
  batting_hand: string
  throwing_hand: string
  jersey_size: string
  tier_spot: number | null
  overall_total: number | null
  total_hitting: number | null
  total_fielding: number | null
  total_throwing: number | null
  total_pitching: number | null
  total_catcher: number | null
  is_pitcher: boolean
  is_catcher: boolean
  sport: string
}

export interface DraftTeam {
  id: number
  name: string
  coach: string
  assistant_coach: string
  jersey_color: string
}

export interface DraftState {
  draft: Draft
  selected_teams: DraftTeam[]
  selections_by_team: Record<string, DraftPlayerEntry[]>
}

export interface TeamStats {
  team_id: number
  team_name: string
  coach: string
  player_count: number
  pitchers: number
  catchers: number
  avg_overall: number
}
