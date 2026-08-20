import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StudentProfile, SkillProfile, CareerGoal } from "@/lib/types";

export function useStudentProfile() {
  return useQuery({
    queryKey: ["student-profile"],
    queryFn: () => api.get<StudentProfile>("/students/me/profile").then((r) => r.data),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StudentProfile>) => api.patch("/students/me/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-profile"] }),
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get<{ data: SkillProfile[] }>("/students/me/skills").then((r) => r.data.data),
  });
}

export function useAddSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SkillProfile>) => api.post("/students/me/skills", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SkillProfile> & { id: string }) => api.patch(`/students/me/skills/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/students/me/skills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
}

export function useCareerGoals() {
  return useQuery({
    queryKey: ["career-goals"],
    queryFn: () => api.get<{ data: CareerGoal[] }>("/students/me/career-goals").then((r) => r.data.data),
  });
}

export function useAddCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CareerGoal>) => api.post("/students/me/career-goals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career-goals"] }),
  });
}

export function useUpdateCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<CareerGoal> & { id: string }) =>
      api.patch(`/students/me/career-goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career-goals"] }),
  });
}

export function useDeleteCareerGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/students/me/career-goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["career-goals"] }),
  });
}
