import client from "./client"

export interface VolunteerSignup {
  id: number
  volunteer_name: string
  volunteer_email: string
  volunteer_phone: string
  role: "GROUNDS" | "CONCESSIONS"
  role_display: string
  notes: string
  signed_up_at: string
}

export interface VolunteerGame {
  id: number
  title: string
  start_time: string
  end_time: string | null
  location: string
  team_name: string | null
  division_name: string | null
  opponent: string
  grounds_crew: VolunteerSignup[]
  concessions: VolunteerSignup[]
  grounds_count: number
  concessions_count: number
  concessions_closed: boolean
}

export interface CreateSignupPayload {
  event_id?: number
  event_ids?: number[]
  volunteer_name: string
  volunteer_email: string
  volunteer_phone: string
  role: "GROUNDS" | "CONCESSIONS"
  notes: string
}

export async function getVolunteerGames(all = false): Promise<VolunteerGame[]> {
  const res = await client.get("/volunteers/games/", { params: all ? { all: 1 } : {} })
  return res.data ?? []
}

export async function createVolunteerSignup(payload: CreateSignupPayload): Promise<VolunteerSignup | VolunteerSignup[]> {
  const res = await client.post("/volunteers/signups/", payload)
  return res.data
}

export async function deleteVolunteerSignup(id: number): Promise<void> {
  await client.delete(`/volunteers/signups/${id}/`)
}

export async function toggleConcessionsClose(eventId: number): Promise<{ concessions_closed: boolean }> {
  const res = await client.post(`/volunteers/games/${eventId}/concessions-closed/`)
  return res.data
}
