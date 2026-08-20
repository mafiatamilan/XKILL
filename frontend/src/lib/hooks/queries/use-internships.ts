import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Internship {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  location: string;
  type: string;
  duration: string;
  stipend?: number;
  description: string;
  requirements: string[];
  deadline: string;
  isActive: boolean;
}

export interface InternshipApplication {
  id: string;
  internshipId: string;
  title: string;
  companyName: string;
  status: string;
  appliedAt: string;
}

export function useInternshipSearch(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["internships", params],
    queryFn: () => api.get<{ data: Internship[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/internships/search", { params }).then((r) => r.data),
  });
}

export function useInternship(id: string) {
  return useQuery({
    queryKey: ["internship", id],
    queryFn: () => api.get<Internship>(`/internships/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useApplyToInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (internshipId: string) => api.post(`/internships/${internshipId}/apply`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["internship-applications"] }),
  });
}

export function useMyInternshipApplications() {
  return useQuery({
    queryKey: ["internship-applications"],
    queryFn: () => api.get<{ data: InternshipApplication[] }>("/internships/me/applications").then((r) => r.data.data),
  });
}
