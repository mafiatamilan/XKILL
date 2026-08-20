import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CollegeAdminDashboard {
  totalStudents: number;
  totalFaculty: number;
  totalDepartments: number;
  totalCourses: number;
}

export function useCollegeAdminDashboard() {
  return useQuery({
    queryKey: ["college-admin-dashboard"],
    queryFn: () => api.get<CollegeAdminDashboard>("/admin/dashboard").then((r) => r.data),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; head: string; facultyCount: number; studentCount: number }> }>("/admin/departments").then((r) => r.data.data),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; head: string }) => api.post("/admin/departments", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; department: string; duration: string; credits: number }> }>("/admin/courses").then((r) => r.data.data),
  });
}

export function useAdminFaculty() {
  return useQuery({
    queryKey: ["admin-faculty"],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; email: string; department: string; designation: string }> }>("/admin/faculty").then((r) => r.data.data),
  });
}

export function useAdminStudents() {
  return useQuery({
    queryKey: ["admin-students"],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; email: string; department: string; semester: number }> }>("/admin/students").then((r) => r.data.data),
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<{ data: Array<{ id: string; title: string; body: string; publishedAt: string; author: string }> }>("/admin/announcements").then((r) => r.data.data),
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; targetRoles: string[] }) => api.post("/admin/announcements", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
