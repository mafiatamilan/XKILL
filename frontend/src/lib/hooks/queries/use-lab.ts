import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface LabSubject {
  id: string;
  name: string;
  code: string;
  language: string;
  semester: number;
}

export interface LabExperiment {
  id: string;
  subjectId: string;
  weekNumber: number;
  title: string;
  objective: string;
  problemStatement: string;
  deadline?: string;
}

export interface LabSubmission {
  id: string;
  experimentId: string;
  status: "pending" | "evaluated" | "plagiarism_detected";
  marks?: number;
  feedback?: string;
  submittedAt: string;
}

export function useLabSubjects() {
  return useQuery({
    queryKey: ["lab-subjects"],
    queryFn: () => api.get<{ data: LabSubject[] }>("/lab/subjects").then((r) => r.data.data),
  });
}

export function useLabExperiments(subjectId: string) {
  return useQuery({
    queryKey: ["lab-experiments", subjectId],
    queryFn: () => api.get<{ data: LabExperiment[] }>(`/lab/subjects/${subjectId}/experiments`).then((r) => r.data.data),
    enabled: !!subjectId,
  });
}

export function useSubmitLabCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ experimentId, sourceCode }: { experimentId: string; sourceCode: string }) =>
      api.post(`/lab/experiments/${experimentId}/submit`, { sourceCode }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-submissions"] }),
  });
}

export function useLabSubmissions() {
  return useQuery({
    queryKey: ["lab-submissions"],
    queryFn: () => api.get<{ data: LabSubmission[] }>("/lab/submissions/me").then((r) => r.data.data),
  });
}
