export interface AllStarSelection {
  id: number
  player: number
  player_first_name: string
  player_last_name: string
  player_dob: string | null
  player_school: string
  player_is_eligible: boolean
  player_sport: string
  division: number | null
  division_name: string | null
  season_year: number
  is_returning: boolean
  // Paperwork
  doc_tournament_verification: boolean
  doc_team_affidavit: boolean
  doc_uniforms_ordered: boolean
  doc_ll_patches: boolean
  doc_drivers_license: boolean
  doc_birth_certificate: boolean
  doc_residency_proof: boolean
  residency_type: "SCHOOL" | "UTILITY" | ""
  // Computed
  paperwork_complete: boolean
  docs_required: number
  docs_complete: number
  notes: string
  selected_at: string
  updated_at: string
}

export interface AllStarSummary {
  total: number
  complete: number
  incomplete: number
  by_division: Record<string, { total: number; complete: number; incomplete: number }>
}
