import { PlayerEnrollment } from "@/types";
import client from "./client";
import type { Player } from "@/models/player";

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
export async function getPlayerPitchStatus(id: number) {
  const res = await client.get(`/players/${id}/pitch-status/`);
  return unwrap(res);
}

/**
 * PITCH HISTORY (raw logs)
 */
export async function getPlayerPitchHistory(id: number) {
  const res = await client.get(`/players/${id}/pitch-history/`);
  return unwrap(res) ?? [];
}

export async function getPlayerPitchSummary() {
  const res = await client.get("/players/pitch-summary/");
  return unwrap(res) ?? [];
}

export async function getPlayerEnrollments(id: number): Promise<PlayerEnrollment[]> {
  const res = await client.get(`/players/${id}/enrollments/`)
  return res.data.data
}