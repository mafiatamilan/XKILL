import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CareerRoadmap {
  currentStage: string;
  targetRole: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    status: "pending" | "in_progress" | "completed";
    targetDate?: string;
  }>;
  progress: number;
}

export interface LearningRecommendation {
  id: string;
  title: string;
  type: "course" | "project" | "article" | "video";
  url?: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
}

export interface SalaryPrediction {
  predictedCtc: number;
  confidence: number;
  factors: Array<{ name: string; impact: number }>;
  marketAverage: number;
  percentile: number;
}

export interface SkillGap {
  required: Array<{ name: string; currentLevel: number; requiredLevel: number }>;
  recommended: Array<{ name: string; reason: string; resources: string[] }>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function useCareerRoadmap() {
  return useQuery({
    queryKey: ["career-roadmap"],
    queryFn: () => api.get<CareerRoadmap>("/career-coach/roadmap").then((r) => r.data),
  });
}

export function useCareerRecommendations() {
  return useQuery({
    queryKey: ["career-recommendations"],
    queryFn: () => api.get<{ data: LearningRecommendation[] }>("/career-coach/recommendations").then((r) => r.data.data),
  });
}

export function useSalaryPrediction() {
  return useQuery({
    queryKey: ["salary-prediction"],
    queryFn: () => api.get<SalaryPrediction>("/career-coach/salary-prediction").then((r) => r.data),
  });
}

export function useSkillGap() {
  return useQuery({
    queryKey: ["skill-gap"],
    queryFn: () => api.get<SkillGap>("/career-coach/skill-gap").then((r) => r.data),
  });
}

export function useCareerChatHistory() {
  return useQuery({
    queryKey: ["career-chat"],
    queryFn: () => api.get<{ data: ChatMessage[] }>("/career-coach/chat").then((r) => r.data.data),
  });
}

export function useSendCareerMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api.post("/career-coach/chat", { message }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career-chat"] }),
  });
}
