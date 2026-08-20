import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { JobListing } from "@/lib/types";

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: "applied" | "reviewed" | "shortlisted" | "rejected" | "offered";
  appliedAt: string;
}

export function useJobSearch(params?: { page?: number; limit?: number; search?: string; type?: string; location?: string }) {
  return useQuery({
    queryKey: ["jobs", params],
    queryFn: () => api.get<{ data: JobListing[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/jobs/search", { params }).then((r) => r.data),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api.get<JobListing>(`/jobs/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/apply`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-applications"] }),
  });
}

export function useSaveJob() {
  return useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/save`),
  });
}

export function useMyApplications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["my-applications", params],
    queryFn: () => api.get<{ data: JobApplication[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/jobs/me/applications", { params }).then((r) => r.data),
  });
}
