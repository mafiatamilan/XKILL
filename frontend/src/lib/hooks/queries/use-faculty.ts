import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface FacultyDashboard {
  totalStudents: number;
  totalSubjects: number;
  pendingAssignments: number;
  upcomingExams: number;
}

export function useFacultyDashboard() {
  return useQuery({
    queryKey: ["faculty-dashboard"],
    queryFn: () => api.get<FacultyDashboard>("/faculty/dashboard").then((r) => r.data),
  });
}

export function useFacultySubjects() {
  return useQuery({
    queryKey: ["faculty-subjects"],
    queryFn: () => api.get<{ data: Array<{ id: string; name: string; code: string; semester: number; studentCount: number }> }>("/faculty/subjects").then((r) => r.data.data),
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subjectId: string; records: Array<{ studentId: string; status: string }> }) =>
      api.post("/faculty/attendance", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faculty-subjects"] }),
  });
}

export function useEnterMarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examId, marks }: { examId: string; marks: Array<{ studentId: string; marksObtained: number }> }) =>
      api.post(`/faculty/exams/${examId}/marks`, { marks }),
  });
}

export function useStudentAnalytics(studentId: string) {
  return useQuery({
    queryKey: ["student-analytics", studentId],
    queryFn: () => api.get(`/faculty/students/${studentId}/analytics`).then((r) => r.data),
    enabled: !!studentId,
  });
}
