import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Battle {
  id: string;
  type: "ranked" | "practice" | "private";
  status: "waiting" | "active" | "completed";
  problemId: string;
  problemTitle: string;
  participants: Array<{ userId: string; name: string; solved: boolean; submissionCount: number }>;
  winnerId?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface BattleHistory {
  data: Battle[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useJoinRankedQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/battles/ranked/join-queue").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["battle-queue"] }),
  });
}

export function useLeaveRankedQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/battles/ranked/leave-queue"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["battle-queue"] }),
  });
}

export function useCreatePracticeBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { difficulty?: string }) => api.post("/battles/practice", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["battles"] }),
  });
}

export function useCreatePrivateBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string }) => api.post("/battles/private", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["battles"] }),
  });
}

export function useJoinPrivateBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => api.post("/battles/private/join", { inviteCode }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["battles"] }),
  });
}

export function useSubmitBattleCode() {
  return useMutation({
    mutationFn: ({ battleId, sourceCode, languageId }: { battleId: string; sourceCode: string; languageId: string }) =>
      api.post(`/battles/${battleId}/submit`, { sourceCode, languageId }).then((r) => r.data),
  });
}

export function useBattleHistory(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["battle-history", params],
    queryFn: () => api.get<BattleHistory>("/battles/history", { params }).then((r) => r.data),
  });
}
