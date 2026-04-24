export interface PitchCount {
  id: number
  player: number
  player_name: string
  team: number | null
  team_name: string | null
  game_date: string
  pitches_thrown: number
  days_rest_required: number
  notes: string | null
  created_at: string
}