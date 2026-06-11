import apiClient from "./client";

export interface UmpireSignup {
  id: number;
  umpire_name: string;
  umpire_email: string;
  umpire_phone: string;
  role: "PLATE" | "BASE";
  signed_up_at: string;
}

export interface UmpireGame {
  id: number;
  title: string;
  team_name: string;
  division_name: string;
  opponent: string;
  start_time: string;
  end_time: string | null;
  location: string;
  field: string | null;
  field_id: number | null;
  is_cancelled: boolean;
  umpire_signups: UmpireSignup[];
  plate_filled: boolean;
  base_filled: boolean;
}

export interface CreateSignupPayload {
  event: number;
  umpire_name: string;
  umpire_email?: string;
  umpire_phone?: string;
  role: "PLATE" | "BASE";
}

export interface BatchUmpireSignupItem {
  event_id: number;
  role: "PLATE" | "BASE";
}

export interface CreateBatchSignupPayload {
  event_ids: BatchUmpireSignupItem[];
  umpire_name: string;
  umpire_email?: string;
  umpire_phone?: string;
}

export const umpireApi = {
  getGames: (showAll = false) =>
    apiClient
      .get<{ success: boolean; data: UmpireGame[] }>(
        `/umpire/games/${showAll ? "?all=true" : ""}`
      )
      .then((r) => r.data.data),

  claimSlot: (payload: CreateSignupPayload) =>
    apiClient
      .post<{ success: boolean; data: UmpireSignup }>("/umpire/signups/", payload)
      .then((r) => r.data.data),

  claimBatch: (payload: CreateBatchSignupPayload) =>
    apiClient
      .post<{ success: boolean; data: UmpireSignup[]; count: number; errors: string[] }>(
        "/umpire/signups/",
        payload
      )
      .then((r) => r.data),

  releaseSlot: (signupId: number) =>
    apiClient.delete(`/umpire/signups/${signupId}/`),
};
