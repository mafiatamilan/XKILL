"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Loader2, Users, GraduationCap, ChevronDown } from "lucide-react"

interface LinkedStudent {
  id: string
  name: string
  enrollment_number: string
}

interface SubjectMarks {
  subject_id: string
  subject_name: string
  subject_code: string
  credits: number
  internal_marks: number
  max_internal_marks: number
  exam_marks: number
  max_exam_marks: number
  total_marks: number
  max_total_marks: number
  grade: string
}

interface GPA {
  sgpa: number
  cgpa: number
  total_credits: number
}

export default function ParentMarksPage() {
  const [selectedStudent, setSelectedStudent] = useState("")
  const [semester, setSemester] = useState("1")

  const { data: students } = useQuery({
    queryKey: ["parent-students"],
    queryFn: () => api<LinkedStudent[]>("/api/v1/parent/students"),
  })

  const studentId = selectedStudent || students?.[0]?.id || ""

  const { data: marks, isLoading: marksLoading } = useQuery({
    queryKey: ["parent-marks", studentId, semester],
    queryFn: () =>
      api<SubjectMarks[]>(`/api/v1/parent/students/${studentId}/marks?semester=${semester}`),
    enabled: !!studentId,
  })

  const { data: gpa, isLoading: gpaLoading } = useQuery({
    queryKey: ["parent-gpa", studentId, semester],
    queryFn: () =>
      api<GPA>(`/api/v1/parent/students/${studentId}/gpa?semester=${semester}`),
    enabled: !!studentId,
  })

  const semesters = Array.from({ length: 8 }, (_, i) => String(i + 1))

  const totalObtained = marks?.reduce((s, m) => s + m.total_marks, 0) ?? 0
  const totalMax = marks?.reduce((s, m) => s + m.max_total_marks, 0) ?? 0
  const totalPercent = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "\u2014"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marks &amp; Grades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subject-wise marks and GPA
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="parent-marks-student" className="block text-sm font-medium mb-1">
            Select Student
          </label>
          <select
            id="parent-marks-student"
            value={studentId}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className={cn(
              "h-9 w-full rounded-md border bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Select student to view marks"
          >
            <option value="">Choose a student</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.enrollment_number})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="parent-marks-semester" className="block text-sm font-medium mb-1">
            Semester
          </label>
          <select
            id="parent-marks-semester"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className={cn(
              "h-9 rounded-md border bg-background px-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Select semester"
          >
            {semesters.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </div>

      {!studentId ? (
        <div className="rounded-lg border p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm text-muted-foreground">
            Select a student to view marks.
          </p>
        </div>
      ) : marksLoading || gpaLoading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
          <div className="h-48 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
        </div>
      ) : (
        <>
          {gpa && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">SGPA</p>
                <p className="text-2xl font-bold">{gpa.sgpa.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">CGPA</p>
                <p className="text-2xl font-bold">{gpa.cgpa.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold">{gpa.total_credits}</p>
              </div>
            </div>
          )}

          <section>
            <h2 className="text-lg font-semibold mb-3">
              Subject-wise Marks{" "}
              {totalPercent !== "\u2014" && (
                <span className="text-sm font-normal text-muted-foreground">
                  (Overall: {totalObtained}/{totalMax} = {totalPercent}%)
                </span>
              )}
            </h2>
            <div className="overflow-x-auto rounded-lg border" role="region" aria-label="Subject marks table">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                      Subject
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                      Code
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Credits
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Internal
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Exam
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Total
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(marks ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No marks data available for this semester.
                      </td>
                    </tr>
                  ) : (
                    (marks ?? []).map((subject) => (
                      <tr key={subject.subject_id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{subject.subject_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{subject.subject_code}</td>
                        <td className="px-4 py-3 text-center">{subject.credits}</td>
                        <td className="px-4 py-3 text-center">
                          {subject.internal_marks}/{subject.max_internal_marks}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {subject.exam_marks}/{subject.max_exam_marks}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          <span
                            className={cn(
                              subject.total_marks >= subject.max_total_marks * 0.4
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {subject.total_marks}/{subject.max_total_marks}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              subject.grade === "A" || subject.grade === "A+"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : subject.grade === "B" || subject.grade === "B+"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : subject.grade === "C" || subject.grade === "C+"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                            )}
                          >
                            {subject.grade}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
