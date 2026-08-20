import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { GamificationSummary, Badge, Mission } from "@/lib/types";

export interface DailyReward {
  claimed: boolean;
  xp: number;
  streak: number;
  available: boolean;
}

export function useGamificationSummary() {
  return useQuery({
    queryKey: ["gamification-summary"],
    queryFn: () => api.get<GamificationSummary>("/gamification/me/summary").then((r) => r.data),
  });
}

export function useClaimDailyReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<DailyReward>("/gamification/daily-reward/claim").then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gamification-summary"] });
      qc.invalidateQueries({ queryKey: ["daily-reward"] });
    },
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: ["all-badges"],
    queryFn: () => api.get<{ data: Badge[] }>("/gamification/badges").then((r) => r.data.data),
  });
}

export function useMyAchievements() {
  return useQuery({
    queryKey: ["my-achievements"],
    queryFn: () => api.get<{ data: Badge[] }>("/gamification/achievements").then((r) => r.data.data),
  });
}

export function useMissions() {
  return useQuery({
    queryKey: ["missions"],
    queryFn: () => api.get<{ data: Mission[] }>("/gamification/missions").then((r) => r.data.data),
  });
}
