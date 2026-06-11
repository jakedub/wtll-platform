import { PlayerEnrollment, PlayerPitchStatus } from "@/types";
import client from "./client";
import type { Player } from "@/models/player";
import { PitchCount } from "@/models/pitch_count";
/**
 * SAFE RESPONSE EXTRACTOR
 * Normalizes Django responses so frontend never crashes.
 */
function unwrap<T>(res: any): T {
  return res?.data?.data ?? res?.data ?? res;
}

/**
 * LIST PLAYERS
 */
export async function getPlayers(params?: {
  division?: number;
  team?: number;
  is_eligible?: boolean;
  sport?: string;
}): Promise<Player[]> {
  const res = await client.get("/players/", { params });
  return unwrap<Player[]>(res) ?? [];
}

/**
 * PLAYER DETAIL
 */
export async function getPlayer(id: number): Promise<Player> {
  const res = await client.get(`/players/${id}/`);
  return unwrap<Player>(res);
}

/**
 * PITCH STATUS (engine output)
 */
export async function getPlayerPitchStatus(
  playerId: number
): Promise<PlayerPitchStatus> {
  const res = await client.get(`/players/${playerId}/pitch-status/`);
  return unwrap<PlayerPitchStatus>(res);
}

/**
 * PITCH HISTORY (raw logs)
 */
export async function getPlayerPitchHistory(id: number): Promise<PitchCount[]> {
  const res = await client.get(`/players/${id}/pitch-history/`);
  return unwrap<PitchCount[]>(res) ?? [];
}

export async function getPlayerPitchSummary() {
  const res = await client.get("/players/pitch-summary/");
  return unwrap(res) ?? [];
}

export async function getPlayerEnrollments(id: number): Promise<PlayerEnrollment[]> {
  const res = await client.get(`/players/${id}/enrollments/`)
  return res.data.data
}

export async function archivePlayer(id: number): Promise<void> {
  await client.post(`/players/${id}/archive/`)
}

export async function restorePlayer(id: number): Promise<void> {
  await client.post(`/players/${id}/restore/`)
}

export async function deletePlayerPermanently(id: number): Promise<void> {
  await client.delete(`/players/${id}/delete/`)
}

export async function importPlayerCSV(file: File, sport: "baseball" | "softball" = "baseball") {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("sport", sport)
  const res = await client.post("/players/import/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}