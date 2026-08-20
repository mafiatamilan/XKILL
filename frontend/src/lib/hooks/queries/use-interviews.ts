import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface InterviewSession {
  id: string;
  title: string;
  type: string;
  role: string;
  status: "pending" | "active" | "completed";
  score?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface InterviewTurn {
  id: string;
  role: "interviewer" | "candidate";
  message: string;
  timestamp: string;
  feedback?: string;
}

export interface InterviewReport {
  sessionId: string;
  overallScore: number;
  breakdown: Record<string, number>;
  strengths: string[];
  improvements: string[];
  summary: string;
}

export function useInterviewSessions(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["interview-sessions", params],
    queryFn: () => api.get<{ data: InterviewSession[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/interviews/sessions", { params }).then((r) => r.data),
  });
}

export function useInterviewSession(id: string) {
  return useQuery({
    queryKey: ["interview-session", id],
    queryFn: () => api.get<{ session: InterviewSession; transcript: InterviewTurn[] }>(`/interviews/sessions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInterviewSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; type: string; role: string }) =>
      api.post("/interviews/sessions", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview-sessions"] }),
  });
}

export function useSubmitInterviewTurn() {
  return useMutation({
    mutationFn: ({ sessionId, answer }: { sessionId: string; answer: string }) =>
      api.post(`/interviews/sessions/${sessionId}/turns`, { answer }).then((r) => r.data),
  });
}

export function useEndInterviewSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.post(`/interviews/sessions/${sessionId}/end`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview-sessions"] }),
  });
}

export function useInterviewReport(sessionId: string) {
  return useQuery({
    queryKey: ["interview-report", sessionId],
    queryFn: () => api.get<InterviewReport>(`/interviews/sessions/${sessionId}/report`).then((r) => r.data),
    enabled: !!sessionId,
  });
}
