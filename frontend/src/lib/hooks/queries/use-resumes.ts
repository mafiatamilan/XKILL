import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Resume {
  id: string;
  title: string;
  templateId: string;
  content: Record<string, unknown>;
  atsScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
}

export interface AtsAnalysis {
  score: number;
  breakdown: Record<string, number>;
  suggestions: Array<{ category: string; message: string; severity: "info" | "warning" | "critical" }>;
}

export interface ResumeVersion {
  id: string;
  versionNumber: number;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

export function useResumes() {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: () => api.get<{ data: Resume[] }>("/resumes").then((r) => r.data.data),
  });
}

export function useResume(id: string) {
  return useQuery({
    queryKey: ["resume", id],
    queryFn: () => api.get<Resume>(`/resumes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; templateId: string }) =>
      api.post("/resumes", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });
}

export function useUpdateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: Record<string, unknown>; templateId?: string }) =>
      api.patch(`/resumes/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      qc.invalidateQueries({ queryKey: ["resume", variables.id] });
    },
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });
}

export function useResumeTemplates() {
  return useQuery({
    queryKey: ["resume-templates"],
    queryFn: () => api.get<{ data: ResumeTemplate[] }>("/resumes/templates").then((r) => r.data.data),
  });
}

export function useRunAtsAnalysis(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<AtsAnalysis>(`/resumes/${id}/ats-analysis`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resume", id] }),
  });
}

export function useAtsScore(id: string) {
  return useQuery({
    queryKey: ["ats-score", id],
    queryFn: () => api.get<{ score: number }>(`/resumes/${id}/score`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useExportResume() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: "pdf" | "docx" }) =>
      api.get(`/resumes/${id}/export`, { params: { format }, responseType: "blob" }).then((r) => r.data),
  });
}

export function useResumeVersions(id: string) {
  return useQuery({
    queryKey: ["resume-versions", id],
    queryFn: () => api.get<{ data: ResumeVersion[] }>(`/resumes/${id}/versions`).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, versionId }: { resumeId: string; versionId: string }) =>
      api.post(`/resumes/${resumeId}/versions/${versionId}/restore`).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["resume", variables.resumeId] });
      qc.invalidateQueries({ queryKey: ["resume-versions", variables.resumeId] });
    },
  });
}
