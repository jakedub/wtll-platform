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