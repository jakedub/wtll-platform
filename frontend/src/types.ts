// ─── Domain Types ─────────────────────────────────────────────────────────────
export type PitchStatus = 'AVAILABLE' | 'CAUTION' | 'REST'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface PlayerPitchStatus {
  status: PitchStatus
  risk_level: RiskLevel
  days_rest_required: number
  next_available_date: string
  pitches_last_outing: number
  pitches_last_7_days: number
  warnings: string[]
}

// ─── API Response Envelope ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Form Types ───────────────────────────────────────────────────────────────

export type PitchCountFormData = {
  player: number
  player_enrollment: number
  game_date: string
  pitches_thrown: number
  notes?: string
}
export type PlayerEnrollment = {
  id: number
  division_name?: string
  team_name?: string
  program_name?: string
  label?: string
}