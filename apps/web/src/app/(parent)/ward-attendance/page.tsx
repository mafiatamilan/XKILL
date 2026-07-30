"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Loader2, Users, CheckCircle2, XCircle } from "lucide-react"

interface LinkedStudent {
  id: string
  name: string
  enrollment_number: string
}

interface SubjectAttendance {
  subject_id: string
  subject_name: string
  subject_code: string
  attendance_percentage: number
  attended: number
  total_classes: number
}

interface MonthlyAttendance {
  month: string
  present: number
  absent: number
  total: number
}

function SkeletonBlock() {
  return <div className="h-24 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
}

export default function ParentAttendancePage() {
  const [selectedStudent, setSelectedStudent] = useState("")

  const { data: students } = useQuery({
    queryKey: ["parent-students"],
    queryFn: () => api<LinkedStudent[]>("/api/v1/parent/students"),
  })

  const studentId = selectedStudent || students?.[0]?.id || ""

  const { data: subjectAttendance, isLoading: subjLoading } = useQuery({
    queryKey: ["parent-attendance-subjects", studentId],
    queryFn: () =>
      api<SubjectAttendance[]>(`/api/v1/parent/students/${studentId}/attendance/subjects`),
    enabled: !!studentId,
  })

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ["parent-attendance-monthly", studentId],
    queryFn: () =>
      api<MonthlyAttendance[]>(`/api/v1/parent/students/${studentId}/attendance/monthly`),
    enabled: !!studentId,
  })

  const maxMonthly = monthlyData
    ? Math.max(...monthlyData.map((m) => m.total), 1)
    : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-subject and monthly attendance view
        </p>
      </div>

      <div>
        <label htmlFor="parent-att-student" className="block text-sm font-medium mb-1">
          Select Student
        </label>
        <select
          id="parent-att-student"
          value={studentId}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Select student to view attendance"
        >
          <option value="">Choose a student</option>
          {(students ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.enrollment_number})
            </option>
          ))}
        </select>
      </div>

      {!studentId ? (
        <div className="rounded-lg border p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            Select a student to view attendance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Per-Subject Attendance</h2>
            {subjLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(subjectAttendance ?? []).length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No attendance data available.
                  </p>
                ) : (
                  (subjectAttendance ?? []).map((subj) => (
                    <div key={subj.subject_id} className="rounded-lg border p-4">
                      <h3 className="font-medium">{subj.subject_name}</h3>
                      <p className="text-xs text-muted-foreground">{subj.subject_code}</p>
                      <p className="mt-2 text-lg font-bold">
                        {subj.attendance_percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {subj.attended}/{subj.total_classes} classes
                      </p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={subj.attendance_percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Attendance for ${subj.subject_name}`}>
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            subj.attendance_percentage >= 75
                              ? "bg-green-500"
                              : subj.attendance_percentage >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${subj.attendance_percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Monthly Attendance</h2>
            {monthlyLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="rounded-lg border p-4">
                {(monthlyData ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No monthly data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(monthlyData ?? []).map((month) => (
                      <div key={month.month} className="flex items-center gap-4">
                        <span className="w-24 shrink-0 text-sm font-medium">
                          {month.month}
                        </span>
                        <div className="flex-1">
                          <div className="flex h-8 w-full overflow-hidden rounded-md" role="group" aria-label={`${month.month}: ${month.present} present, ${month.absent} absent`}>
                            <div
                              className="flex items-center justify-center bg-green-500 text-xs font-medium text-white transition-all"
                              style={{ width: `${(month.present / Math.max(month.total, 1)) * 100}%` }}
                            >
                              {month.present > 0 && month.present}
                            </div>
                            <div
                              className="flex items-center justify-center bg-red-500 text-xs font-medium text-white transition-all"
                              style={{ width: `${(month.absent / Math.max(month.total, 1)) * 100}%` }}
                            >
                              {month.absent > 0 && month.absent}
                            </div>
                          </div>
                        </div>
                        <span className="w-16 text-right text-sm text-muted-foreground">
                          {Math.round((month.present / Math.max(month.total, 1)) * 100)}%
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" aria-hidden="true" />
                        Present
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" aria-hidden="true" />
                        Absent
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
