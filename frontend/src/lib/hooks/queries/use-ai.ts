import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AiTutorResponse {
  answer: string;
  references?: string[];
}

export interface AiCodeReviewResponse {
  score: number;
  issues: Array<{ line: number; message: string; severity: "error" | "warning" | "info" }>;
  suggestions: string[];
}

export interface AiDoubtResponse {
  answer: string;
  steps: string[];
}

export function useAiTutor() {
  return useMutation({
    mutationFn: (data: { question: string; context?: string }) =>
      api.post<AiTutorResponse>("/ai/tutor/ask", data).then((r) => r.data),
  });
}

export function useAiDoubtSolver() {
  return useMutation({
    mutationFn: (data: { question: string; subject?: string }) =>
      api.post<AiDoubtResponse>("/ai/doubt-solver", data).then((r) => r.data),
  });
}

export function useAiCodeReview() {
  return useMutation({
    mutationFn: (data: { sourceCode: string; language: string }) =>
      api.post<AiCodeReviewResponse>("/ai/code-review", data).then((r) => r.data),
  });
}

export function useAiResumeAnalyzer() {
  return useMutation({
    mutationFn: (data: { resumeText: string }) =>
      api.post("/ai/resume-analyzer", data).then((r) => r.data),
  });
}

export function useAiQuestionGenerator() {
  return useMutation({
    mutationFn: (data: { topic: string; difficulty: string; count: number }) =>
      api.post("/ai/question-generator", data).then((r) => r.data),
  });
}

export function useAiStudyPlanner() {
  return useMutation({
    mutationFn: (data: { subjects: string[]; hoursPerDay: number; deadline: string }) =>
      api.post("/ai/study-planner", data).then((r) => r.data),
  });
}
