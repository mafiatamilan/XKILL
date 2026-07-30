"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { BookOpen, CheckCircle2, XCircle, Loader2, Users } from "lucide-react"

interface LinkedStudent {
  id: string
  name: string
  enrollment_number: string
}

interface SubjectProgress {
  id: string
  name: string
  code: string
  attendance_percentage: number
  attended: number
  total_classes: number
  internal_marks: number
  max_internal_marks: number
  assignment_completed: number
  total_assignments: number
}

function SkeletonSection() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
        ))}
      </div>
    </div>
  )
}

export default function ParentProgressPage() {
  const [selectedStudent, setSelectedStudent] = useState("")

  const { data: students } = useQuery({
    queryKey: ["parent-students"],
    queryFn: () => api<LinkedStudent[]>("/api/v1/parent/students"),
  })

  const { data: progress, isLoading } = useQuery({
    queryKey: ["parent-progress", selectedStudent],
    queryFn: () =>
      api<SubjectProgress[]>(`/api/v1/parent/students/${selectedStudent}/progress`),
    enabled: !!selectedStudent,
  })

  const studentId = selectedStudent || students?.[0]?.id || ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Child Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subject-wise academic progress
        </p>
      </div>

      <div>
        <label htmlFor="parent-student-select" className="block text-sm font-medium mb-1">
          Select Student
        </label>
        <select
          id="parent-student-select"
          value={studentId}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Select student to view progress"
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
            Select a student to view their progress.
          </p>
        </div>
      ) : isLoading ? (
        <SkeletonSection />
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Subject-wise Progress</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(progress ?? []).length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground">
                  No subject data available.
                </p>
              ) : (
                (progress ?? []).map((subject) => (
                  <div key={subject.id} className="rounded-lg border p-4">
                    <h3 className="font-semibold">{subject.name}</h3>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>

                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Attendance</span>
                          <span>{subject.attendance_percentage}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {subject.attended}/{subject.total_classes} classes
                        </p>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={subject.attendance_percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Attendance for ${subject.name}`}>
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              subject.attendance_percentage >= 75
                                ? "bg-green-500"
                                : subject.attendance_percentage >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${subject.attendance_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Internal Marks</span>
                        <span className="font-medium">
                          {subject.internal_marks}/{subject.max_internal_marks}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Assignments</span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className={cn("h-4 w-4", subject.assignment_completed === subject.total_assignments ? "text-green-500" : "text-yellow-500")} aria-hidden="true" />
                          {subject.assignment_completed}/{subject.total_assignments}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Overall Summary</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Average Attendance</p>
                <p className="text-2xl font-bold">
                  {progress && progress.length > 0
                    ? `${Math.round(
                        progress.reduce((s, p) => s + p.attendance_percentage, 0) / progress.length
                      )}%`
                    : "\u2014"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Average Internal Marks</p>
                <p className="text-2xl font-bold">
                  {progress && progress.length > 0
                    ? `${(
                        progress.reduce((s, p) => s + p.internal_marks, 0) /
                        progress.reduce((s, p) => s + p.max_internal_marks, 0) *
                        100
                      ).toFixed(0)}%`
                    : "\u2014"}
                </p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Assignment Completion</p>
                <p className="text-2xl font-bold">
                  {progress && progress.length > 0
                    ? `${progress.reduce((s, p) => s + p.assignment_completed, 0)}/${progress.reduce((s, p) => s + p.total_assignments, 0)}`
                    : "\u2014"}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
