import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Subject, Exam, Assignment, AttendanceRecord } from "@/lib/types";

export interface MarksRecord {
  id: string;
  subjectId: string;
  examId: string;
  marksObtained: number;
  totalMarks: number;
  examTitle: string;
  subjectName: string;
}

export interface GpaData {
  gpa: number;
  semester: number;
}

export interface CgpaData {
  cgpa: number;
}

export function useSubjects(params?: { semester?: number }) {
  return useQuery({
    queryKey: ["subjects", params],
    queryFn: () => api.get<{ data: Subject[] }>("/academics/subjects", { params }).then((r) => r.data.data),
  });
}

export function useSubjectMaterials(subjectId: string) {
  return useQuery({
    queryKey: ["subject-materials", subjectId],
    queryFn: () => api.get(`/academics/subjects/${subjectId}/materials`).then((r) => r.data),
    enabled: !!subjectId,
  });
}

export function useMyExams() {
  return useQuery({
    queryKey: ["my-exams"],
    queryFn: () => api.get<{ data: Exam[] }>("/academics/exams/me").then((r) => r.data.data),
  });
}

export function useMyAssignments() {
  return useQuery({
    queryKey: ["my-assignments"],
    queryFn: () => api.get<{ data: Assignment[] }>("/academics/assignments/me").then((r) => r.data.data),
  });
}

export function useSubmitAssignment() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      api.post(`/academics/assignments/${id}/submit`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  });
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ["my-attendance"],
    queryFn: () => api.get<{ data: AttendanceRecord[] }>("/academics/attendance/me").then((r) => r.data.data),
  });
}

export function useMyMarks() {
  return useQuery({
    queryKey: ["my-marks"],
    queryFn: () => api.get<{ data: MarksRecord[] }>("/academics/marks/me").then((r) => r.data.data),
  });
}

export function useMyGpa() {
  return useQuery({
    queryKey: ["my-gpa"],
    queryFn: () => api.get<GpaData>("/academics/gpa/me").then((r) => r.data),
  });
}

export function useMyCgpa() {
  return useQuery({
    queryKey: ["my-cgpa"],
    queryFn: () => api.get<CgpaData>("/academics/cgpa/me").then((r) => r.data),
  });
}
