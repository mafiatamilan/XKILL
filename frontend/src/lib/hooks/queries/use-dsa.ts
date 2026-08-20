import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Problem, Submission, Contest } from "@/lib/types";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  problemCount: number;
  createdAt: string;
}

export interface Sheet {
  id: string;
  name: string;
  description: string;
  problemCount: number;
  category: string;
}

export interface DsaProgress {
  totalProblems: number;
  solved: number;
  attempted: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  byTag: Record<string, number>;
}

export interface DsaRating {
  rating: number;
  tier: string;
  history: Array<{ date: string; rating: number }>;
}

export function useProblems(params?: { page?: number; limit?: number; difficulty?: string; search?: string; tag?: string }) {
  return useQuery({
    queryKey: ["problems", params],
    queryFn: () => api.get<{ data: Problem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/dsa/problems", { params }).then((r) => r.data),
  });
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: ["problem", id],
    queryFn: () => api.get<Problem>(`/dsa/problems/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useRunCode() {
  return useMutation({
    mutationFn: ({ id, sourceCode, languageId }: { id: string; sourceCode: string; languageId: string }) =>
      api.post(`/dsa/problems/${id}/run`, { sourceCode, languageId }).then((r) => r.data),
  });
}

export function useSubmitSolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sourceCode, languageId }: { id: string; sourceCode: string; languageId: string }) =>
      api.post(`/dsa/problems/${id}/submit`, { sourceCode, languageId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-submissions"] });
      qc.invalidateQueries({ queryKey: ["dsa-progress"] });
    },
  });
}

export function useMySubmissions(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["my-submissions", params],
    queryFn: () => api.get<{ data: Submission[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/dsa/submissions/me", { params }).then((r) => r.data),
  });
}

export function usePlaylists() {
  return useQuery({
    queryKey: ["playlists"],
    queryFn: () => api.get<{ data: Playlist[] }>("/dsa/playlists").then((r) => r.data.data),
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post("/dsa/playlists", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["playlists"] }),
  });
}

export function useSheets() {
  return useQuery({
    queryKey: ["sheets"],
    queryFn: () => api.get<{ data: Sheet[] }>("/dsa/sheets").then((r) => r.data.data),
  });
}

export function useDsaProgress() {
  return useQuery({
    queryKey: ["dsa-progress"],
    queryFn: () => api.get<DsaProgress>("/dsa/progress/me").then((r) => r.data),
  });
}

export function useDsaAnalytics() {
  return useQuery({
    queryKey: ["dsa-analytics"],
    queryFn: () => api.get("/dsa/analytics/me").then((r) => r.data),
  });
}

export function useDsaRating() {
  return useQuery({
    queryKey: ["dsa-rating"],
    queryFn: () => api.get<DsaRating>("/dsa/rating/me").then((r) => r.data),
  });
}

export function useContests(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["contests", params],
    queryFn: () => api.get<{ data: Contest[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/dsa/contests", { params }).then((r) => r.data),
  });
}

export function useRegisterContest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/dsa/contests/${id}/register`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contests"] }),
  });
}

export function useContestLeaderboard(id: string) {
  return useQuery({
    queryKey: ["contest-leaderboard", id],
    queryFn: () => api.get(`/dsa/contests/${id}/leaderboard`).then((r) => r.data),
    enabled: !!id,
  });
}
