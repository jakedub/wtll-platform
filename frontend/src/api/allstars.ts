import client from "./client"
import type { AllStarSelection, AllStarSummary } from "../models/allstar"

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export async function getAllStarSelections(params?: {
  year?: number
  division?: number
  paperwork_complete?: "true" | "false"
}): Promise<AllStarSelection[]> {
  const res = await client.get("/allstars/", { params })
  return unwrap<AllStarSelection[]>(res) ?? []
}

export async function getAllStarSummary(year?: number): Promise<AllStarSummary> {
  const res = await client.get("/allstars/summary/", { params: year ? { year } : {} })
  return unwrap<AllStarSummary>(res)
}

export async function createAllStarSelection(data: Partial<AllStarSelection>): Promise<AllStarSelection> {
  const res = await client.post("/allstars/", data)
  return unwrap<AllStarSelection>(res)
}

export async function updateAllStarSelection(id: number, data: Partial<AllStarSelection>): Promise<AllStarSelection> {
  const res = await client.patch(`/allstars/${id}/`, data)
  return unwrap<AllStarSelection>(res)
}

export async function deleteAllStarSelection(id: number): Promise<void> {
  await client.delete(`/allstars/${id}/`)
}

export function getAllStarFormURL(id: number, form: "tvf" | "enrollment" | "enrollment-softball"): string {
  const base = (client.defaults.baseURL ?? "").replace(/\/$/, "")
  return `${base}/allstars/${id}/forms/${form}/`
}
