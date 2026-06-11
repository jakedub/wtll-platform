import client from "./client"

export interface GeoResult {
  lat: number
  lng: number
  formatted_address: string
}

export interface BatchGeocodeSummary {
  total: number
  success: number
  failed: number
}

export interface DistrictCheckSummary {
  total: number
  in_district: number
  out_of_district: number
}

export interface EligibilitySummary {
  total: number
  eligible: number
  ineligible: number
}

export interface DistrictPolygons {
  polygons: [number, number][][]
}

export async function geocodeAddress(address: string): Promise<GeoResult> {
  const res = await client.get("/geocode/", { params: { address } })
  return res.data
}

export async function geocodeMissingPlayers(): Promise<BatchGeocodeSummary> {
  const res = await client.post("/geocode/batch/")
  return res.data
}

export async function checkPlayersInDistrict(): Promise<DistrictCheckSummary> {
  const res = await client.post("/district/check/")
  return res.data
}

export async function checkPlayerEligibility(): Promise<EligibilitySummary> {
  const res = await client.post("/district/eligibility/")
  return res.data
}

export async function getDistrictPolygons(): Promise<DistrictPolygons> {
  const res = await client.get("/district/polygons/")
  return res.data
}

export function getKMLUrl(): string {
  const base = (client.defaults.baseURL ?? "").replace(/\/api$/, "")
  return `${base}/api/district/kml/`
}
