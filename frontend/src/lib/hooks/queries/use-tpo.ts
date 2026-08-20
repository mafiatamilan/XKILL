import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CompanyDrive {
  id: string;
  companyName: string;
  role: string;
  date: string;
  status: "upcoming" | "active" | "completed";
  eligibleStudents: number;
  applied: number;
}

export interface TpoDashboard {
  totalDrives: number;
  totalOffers: number;
  placedStudents: number;
  upcomingDrives: number;
}

export function useTpoDashboard() {
  return useQuery({
    queryKey: ["tpo-dashboard"],
    queryFn: () => api.get<TpoDashboard>("/tpo/dashboard").then((r) => r.data),
  });
}

export function useCompanyDrives() {
  return useQuery({
    queryKey: ["company-drives"],
    queryFn: () => api.get<{ data: CompanyDrive[] }>("/tpo/company-drives").then((r) => r.data.data),
  });
}

export function useCreateDrive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyName: string; role: string; date: string }) =>
      api.post("/tpo/company-drives", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-drives"] }),
  });
}

export function useCreateOffer() {
  return useMutation({
    mutationFn: ({ driveId, ...data }: { driveId: string; studentId: string; package: number }) =>
      api.post(`/tpo/company-drives/${driveId}/offers`, data),
  });
}

export function usePlacementReport() {
  return useMutation({
    mutationFn: (data: { title: string; department: string; academicYear: string }) =>
      api.post("/tpo/placement-reports", data),
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: ["department-stats"],
    queryFn: () => api.get("/tpo/department-stats").then((r) => r.data),
  });
}
