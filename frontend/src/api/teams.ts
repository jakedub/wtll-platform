import client from './client'
import type { Team } from '@/models/team'


export interface TeamFilters {
  division?: number
  is_active?: boolean
}

export async function getTeams(filters?: TeamFilters): Promise<Team[]> {
  const params: Record<string, string | number | boolean> = {}
  if (filters?.division) params.division = filters.division
  if (filters?.is_active !== undefined) params.is_active = filters.is_active

  const res = await client.get<{ success: true; data: Team[] }>('/teams/', { params })
  return res.data.data
}
export async function getTeamRoster(teamId: number) {
  const res = await client.get(`/teams/${teamId}/roster`)
  return res.data.data
}
export async function getTeamRosterWithSummary(teamId: number) {
  const res = await client.get(`/teams/${teamId}/roster-with-pitch-summary/`)
  return res.data
}

export async function getMyTeams() {
  const res = await client.get("/my-teams/");
  return res.data.data ?? res.data;
}

export async function getTeam(teamId: number) {
  const res = await client.get<{ success: true; data: Team }>(`/teams/${teamId}/`)
  return res.data.data
}

/**
 * Convenience helper if you only want events for a team page.
 * Events are included in the team payload from the backend serializer.
 */
export async function getTeamEvents(teamId: number) {
  console.log('📡 getTeamEvents CALLED with:', teamId)

  const res = await client.get(`/teams/${teamId}/`)

  console.log('📦 RAW API RESPONSE:', res.data)

  return res.data?.data ?? res.data
}

export async function getAllTeamEvents() {
  const teams = await getTeams()
  return teams.flatMap((team: any) =>
  (team.events ?? []).map((event: any) => ({
    ...event,
    team_id: team.id,
    team_name: team.name,
    division: team.division
  }))
)
}