import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RecruiterDashboard {
  totalJobs: number;
  totalApplications: number;
  shortlisted: number;
  interviewsScheduled: number;
}

export function useRecruiterDashboard() {
  return useQuery({
    queryKey: ["recruiter-dashboard"],
    queryFn: () => api.get<RecruiterDashboard>("/recruiter/dashboard").then((r) => r.data),
  });
}

export function useCandidateSearch(params?: { page?: number; limit?: number; skills?: string; search?: string }) {
  return useQuery({
    queryKey: ["candidates", params],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; skills: string[]; rating: number; avatarUrl?: string }>; meta: { total: number; page: number; limit: number; totalPages: number } }>("/recruiter/candidates/search", { params }).then((r) => r.data),
  });
}

export function useShortlistCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (candidateId: string) => api.post(`/recruiter/shortlist/${candidateId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });
}

export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { candidateId: string; date: string; time: string; type: string }) =>
      api.post("/recruiter/interviews", data),
  });
}

export function useRecruiterAnalytics() {
  return useQuery({
    queryKey: ["recruiter-analytics"],
    queryFn: () => api.get("/recruiter/analytics").then((r) => r.data),
  });
}
