import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Company {
  slug: string;
  name: string;
  logoUrl?: string;
  industry: string;
  questionCount: number;
  difficulty: string;
  hiringPattern: string;
}

export interface CompanyQuestions {
  data: Array<{ id: string; title: string; difficulty: string; frequency: number; tags: string[] }>;
}

export interface CompanyHiringPatterns {
  rounds: Array<{ name: string; description: string; duration: string }>;
  timeline: string;
  eligibility: string;
}

export interface SalaryInsights {
  averageCtc: number;
  medianCtc: number;
  highestCtc: number;
  batchWise: Array<{ year: number; average: number }>;
}

export function useCompanyPrepList(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["company-prep", params],
    queryFn: () => api.get<{ data: Company[]; meta: { total: number; page: number; limit: number; totalPages: number } }>("/company-prep", { params }).then((r) => r.data),
  });
}

export function useCompanyPrepDetail(slug: string) {
  return useQuery({
    queryKey: ["company-prep", slug],
    queryFn: () => api.get<Company>(`/company-prep/${slug}`).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useCompanyQuestions(slug: string) {
  return useQuery({
    queryKey: ["company-questions", slug],
    queryFn: () => api.get<CompanyQuestions>(`/company-prep/${slug}/questions`).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useCompanyHiringPatterns(slug: string) {
  return useQuery({
    queryKey: ["company-hiring", slug],
    queryFn: () => api.get<CompanyHiringPatterns>(`/company-prep/${slug}/hiring-patterns`).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useCompanySalaryInsights(slug: string) {
  return useQuery({
    queryKey: ["company-salary", slug],
    queryFn: () => api.get<SalaryInsights>(`/company-prep/${slug}/salary-insights`).then((r) => r.data),
    enabled: !!slug,
  });
}
