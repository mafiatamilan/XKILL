import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/types";

export type LeaderboardScope = "global" | "college" | "department" | "weekly" | "monthly";

export function useLeaderboard(scope: LeaderboardScope, id?: string, params?: { page?: number; limit?: number }) {
  let url = "";
  if (scope === "global") url = "/leaderboards/global";
  else if (scope === "college" && id) url = `/leaderboards/college/${id}`;
  else if (scope === "department" && id) url = `/leaderboards/department/${id}`;
  else if (scope === "weekly") url = "/leaderboards/weekly";
  else if (scope === "monthly") url = "/leaderboards/monthly";
  else url = "/leaderboards/global";

  return useQuery({
    queryKey: ["leaderboard", scope, id, params],
    queryFn: () => api.get<{ data: LeaderboardEntry[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(url, { params }).then((r) => r.data),
  });
}
