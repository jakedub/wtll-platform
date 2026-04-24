import { useQuery } from "@tanstack/react-query"
import { getTeamRosterWithSummary } from "../api/teams"

export function useTeamRoster(teamId: number | null) {
  return useQuery({
    queryKey: ['team-roster', teamId],
    queryFn: () => getTeamRosterWithSummary(teamId!),
    enabled: !!teamId,
  })
}