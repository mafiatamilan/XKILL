import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PlacementRoadmap, DailyTask } from "@/lib/types";

export interface CompanyPrep {
  slug: string;
  name: string;
  logoUrl?: string;
  difficulty: string;
  questionCount: number;
  hiringPattern: string;
}

export interface ReadinessPrediction {
  score: number;
  factors: Array<{ name: string; impact: number; current: number }>;
  recommendations: string[];
}

export function usePlacementRoadmap() {
  return useQuery({
    queryKey: ["placement-roadmap"],
    queryFn: () => api.get<PlacementRoadmap>("/placement/roadmap").then((r) => r.data),
  });
}

export function useRoadmapWeek(weekNumber: number) {
  return useQuery({
    queryKey: ["roadmap-week", weekNumber],
    queryFn: () => api.get<{ tasks: DailyTask[] }>(`/placement/roadmap/${weekNumber}/tasks`).then((r) => r.data),
    enabled: weekNumber > 0,
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.patch(`/placement/tasks/${taskId}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["placement-roadmap"] });
      qc.invalidateQueries({ queryKey: ["placement-progress"] });
    },
  });
}

export function useCompanyPrep(slug: string) {
  return useQuery({
    queryKey: ["company-prep", slug],
    queryFn: () => api.get<CompanyPrep>(`/placement/companies/${slug}/prep`).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useCompanyHiringPatterns(slug: string) {
  return useQuery({
    queryKey: ["company-patterns", slug],
    queryFn: () => api.get(`/placement/companies/${slug}/hiring-patterns`).then((r) => r.data),
    enabled: !!slug,
  });
}

export function usePlacementProgress() {
  return useQuery({
    queryKey: ["placement-progress"],
    queryFn: () => api.get("/placement/progress").then((r) => r.data),
  });
}

export function useReadinessPrediction() {
  return useQuery({
    queryKey: ["readiness-prediction"],
    queryFn: () => api.get<ReadinessPrediction>("/placement/readiness-prediction").then((r) => r.data),
  });
}

export function useDailyChallenge() {
  return useQuery({
    queryKey: ["daily-challenge"],
    queryFn: () => api.get("/placement/daily-challenge").then((r) => r.data),
  });
}
