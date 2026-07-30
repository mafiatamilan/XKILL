"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2, Check, X, CalendarDays } from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string
}

interface Student {
  id: string
  name: string
  enrollment_number: string
}

interface AttendanceStatus {
  student_id: string
  status: "present" | "absent"
}

export default function FacultyAttendancePage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({})

  const { data: subjects } = useQuery({
    queryKey: ["faculty-subjects"],
    queryFn: () => api<Subject[]>("/api/v1/faculty/subjects"),
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["faculty-attendance-students", selectedSubject],
    queryFn: () => api<Student[]>(`/api/v1/faculty/subjects/${selectedSubject}/students`),
    enabled: !!selectedSubject,
  })

  const { data: existingAttendance, isLoading: existingLoading } = useQuery({
    queryKey: ["faculty-attendance-existing", selectedSubject, selectedDate],
    queryFn: () =>
      api<AttendanceStatus[]>(
        `/api/v1/faculty/attendance?subject_id=${selectedSubject}&date=${selectedDate}`
      ),
    enabled: !!selectedSubject && !!selectedDate,
  })

  const markAll = (status: "present" | "absent") => {
    if (!students) return
    const newAttendance: Record<string, "present" | "absent"> = {}
    for (const s of students) {
      newAttendance[s.id] = status
    }
    setAttendance(newAttendance)
  }

  const toggleStudent = (id: string) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === "present" ? "absent" : "present",
    }))
  }

  const submitMutation = useMutation({
    mutationFn: (data: AttendanceStatus[]) =>
      api("/api/v1/faculty/attendance", {
        method: "POST",
        body: JSON.stringify({
          subject_id: selectedSubject,
          date: selectedDate,
          records: data,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-attendance-existing"] })
      toast("Attendance recorded successfully", "success")
    },
    onError: () => toast("Failed to record attendance", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const records = Object.entries(attendance).map(([student_id, status]) => ({
      student_id,
      status,
    }))
    submitMutation.mutate(records)
  }

  const hasExisting =
    existingAttendance && existingAttendance.length > 0 && !existingLoading

  const presentCount = Object.values(attendance).filter((s) => s === "present").length
  const totalCount = students?.length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mark Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record student attendance for a subject
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="subject-select" className="block text-sm font-medium mb-1">
              Subject
            </label>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value)
                setAttendance({})
              }}
              required
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Select subject"
            >
              <option value="">Select a subject</option>
              {(subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="attendance-date" className="block text-sm font-medium mb-1">
              Date
            </label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setAttendance({})
              }}
              required
              className={cn(
                "h-9 rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Select date"
            />
          </div>
        </div>

        {hasExisting && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400" role="alert">
            Attendance has already been recorded for this date. You can update it below.
          </div>
        )}

        {selectedSubject && studentsLoading ? (
          <div className="flex items-center justify-center py-12" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : selectedSubject && students ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {totalCount} students \u2022 {presentCount} present \u2022 {totalCount - presentCount} absent
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => markAll("present")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium",
                    "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="Mark all present"
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => markAll("absent")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium",
                    "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="Mark all absent"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  All Absent
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border" role="region" aria-label="Student attendance list">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                      #
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                      Enrollment No.
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Present
                    </th>
                    <th scope="col" className="border-b px-4 py-3 text-center font-medium text-muted-foreground">
                      Absent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, i) => {
                    const existing = existingAttendance?.find(
                      (e) => e.student_id === student.id
                    )
                    const status =
                      attendance[student.id] ?? existing?.status ?? "absent"
                    return (
                      <tr
                        key={student.id}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50",
                          status === "present"
                            ? "bg-green-50/30 dark:bg-green-950/10"
                            : ""
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {student.enrollment_number}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={status === "present"}
                            onChange={() => toggleStudent(student.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            aria-label={`Mark ${student.name} present`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={status === "absent"}
                            onChange={() => toggleStudent(student.id)}
                            className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                            aria-label={`Mark ${student.name} absent`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitMutation.isPending || totalCount === 0}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                )}
                {hasExisting ? "Update Attendance" : "Submit Attendance"}
              </button>
            </div>
          </>
        ) : selectedSubject ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No students found for this subject.
          </p>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Select a subject and date to mark attendance.
          </p>
        )}
      </form>
    </div>
  )
}
