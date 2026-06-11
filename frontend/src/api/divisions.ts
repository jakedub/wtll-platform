import client from "./client"

export interface Division {
  id: number
  name: string
}

export async function getDivisions(): Promise<Division[]> {
  const res = await client.get("/divisions/")
  return res?.data?.data ?? res?.data ?? []
}
