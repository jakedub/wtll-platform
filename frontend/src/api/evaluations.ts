import client from "./client"
import type { Evaluation, EvaluationImportResult } from "../models/evaluation"

function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res
}

export async function getEvaluations(params?: {
  division?: number
  year?: number
  type?: "pre" | "post"
  sport?: string
}): Promise<Evaluation[]> {
  const res = await client.get("/evaluations/", { params })
  return unwrap<Evaluation[]>(res) ?? []
}

export async function getEvaluation(id: number): Promise<Evaluation> {
  const res = await client.get(`/evaluations/${id}/`)
  return unwrap<Evaluation>(res)
}

export async function createEvaluation(data: Partial<Evaluation>): Promise<Evaluation> {
  const res = await client.post("/evaluations/", data)
  return unwrap<Evaluation>(res)
}

export async function updateEvaluation(id: number, data: Partial<Evaluation>): Promise<Evaluation> {
  const res = await client.patch(`/evaluations/${id}/`, data)
  return unwrap<Evaluation>(res)
}

export async function deleteEvaluation(id: number): Promise<void> {
  await client.delete(`/evaluations/${id}/`)
}

export async function importEvaluationCSV(
  file: File,
  year?: number,
  evaluationType?: string,
): Promise<EvaluationImportResult> {
  const formData = new FormData()
  formData.append("file", file)
  if (year) formData.append("year", String(year))
  if (evaluationType) formData.append("evaluation_type", evaluationType)
  const res = await client.post("/evaluations/import/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}

export function getEvaluationExportURL(params?: { division?: number; year?: number }): string {
  const base = (client.defaults.baseURL ?? "").replace(/\/$/, "")
  const qs = new URLSearchParams()
  if (params?.division) qs.set("division", String(params.division))
  if (params?.year) qs.set("year", String(params.year))
  const query = qs.toString()
  return `${base}/evaluations/export/${query ? "?" + query : ""}`
}
