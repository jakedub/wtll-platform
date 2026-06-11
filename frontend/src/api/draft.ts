import client from "./client"
import type { Draft, DraftState, DraftPlayerEntry, TeamStats } from "../models/draft"

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export async function getDrafts(): Promise<Draft[]> {
  const res = await client.get("/drafts/")
  return unwrap<Draft[]>(res) ?? []
}

export async function createDraft(data: { name: string; year: number; division: number }): Promise<Draft> {
  const res = await client.post("/drafts/", data)
  return unwrap<Draft>(res)
}

export async function getDraftState(id: number): Promise<DraftState> {
  const res = await client.get(`/drafts/${id}/state/`)
  return unwrap<DraftState>(res)
}

export async function getAvailablePlayers(draftId: number, divisionId?: number): Promise<DraftPlayerEntry[]> {
  const res = await client.get(`/drafts/${draftId}/available-players/`, {
    params: divisionId ? { division: divisionId } : {},
  })
  return unwrap<DraftPlayerEntry[]>(res) ?? []
}

export async function draftPlayer(draftId: number, playerId: number, teamId: number): Promise<void> {
  await client.post(`/drafts/${draftId}/pick/`, { player_id: playerId, team_id: teamId })
}

export async function undraftPlayer(draftId: number, playerId: number): Promise<void> {
  await client.delete(`/drafts/${draftId}/pick/`, { data: { player_id: playerId } })
}

export async function saveDraftTeams(draftId: number, teamIds: number[]): Promise<void> {
  await client.post(`/drafts/${draftId}/teams/`, { team_ids: teamIds })
}

export async function getTeamStats(draftId: number): Promise<TeamStats[]> {
  const res = await client.get(`/drafts/${draftId}/team-stats/`)
  return unwrap<TeamStats[]>(res) ?? []
}

export async function markDraftComplete(draftId: number): Promise<Draft> {
  const res = await client.post(`/drafts/${draftId}/complete/`)
  return unwrap<Draft>(res)
}

export function getDraftExportURL(draftId: number): string {
  const base = (client.defaults.baseURL ?? "").replace(/\/$/, "")
  return `${base}/drafts/${draftId}/export/`
}
