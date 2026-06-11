export interface EvaluationPlayerDetail {
  id: number
  first_name: string
  last_name: string
  full_name: string
  division: string | null
  program: string
  sport: string
}

export interface Evaluation {
  id: number
  player: number
  player_detail: EvaluationPlayerDetail
  season_year: number
  evaluation_type: "pre" | "post"

  hitting_power: number | null
  hitting_contact: number | null
  hitting_form: number | null

  fielding_form: number | null
  fielding_glove: number | null
  fielding_hustle: number | null

  throwing_form: number | null
  throwing_speed: number | null
  throwing_accuracy: number | null

  pitching_speed: number | null
  pitching_accuracy: number | null

  catcher_receiving: number | null
  catcher_blocking: number | null

  total_hitting: number
  total_fielding: number
  total_throwing: number
  total_pitching: number
  total_catcher: number
  overall_total: number
  tier_spot: number | null

  created_at: string
}

export interface EvaluationImportResult {
  processed: number
  failure_count: number
  failures: { row: number | string; player?: string; error: string }[]
}

export type ScoreField =
  | "hitting_power"
  | "hitting_contact"
  | "hitting_form"
  | "fielding_form"
  | "fielding_glove"
  | "fielding_hustle"
  | "throwing_form"
  | "throwing_speed"
  | "throwing_accuracy"
  | "pitching_speed"
  | "pitching_accuracy"
  | "catcher_receiving"
  | "catcher_blocking"
