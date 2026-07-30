"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2, Save } from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string
}

interface Exam {
  id: string
  type: string
  max_marks: number
}

interface GradebookStudent {
  id: string
  name: string
  enrollment_number: string
  marks: Record<string, number | null>
}

export default function FacultyGradebookPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedExam, setSelectedExam] = useState("")
  const [marksInput, setMarksInput] = useState<Record<string, string>>({})

  const { data: subjects } = useQuery({
    queryKey: ["faculty-subjects"],
    queryFn: () => api<Subject[]>("/api/v1/faculty/subjects"),
  })

  const { data: exams } = useQuery({
    queryKey: ["faculty-exams", selectedSubject],
    queryFn: () => api<Exam[]>(`/api/v1/faculty/subjects/${selectedSubject}/exams`),
    enabled: !!selectedSubject,
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["faculty-gradebook", selectedSubject, selectedExam],
    queryFn: () =>
      api<GradebookStudent[]>(
        `/api/v1/faculty/gradebook?subject_id=${selectedSubject}&exam_id=${selectedExam}`
      ),
    enabled: !!selectedSubject && !!selectedExam,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { student_id: string; marks: number }[]) =>
      api("/api/v1/faculty/gradebook", {
        method: "PUT",
        body: JSON.stringify({
          subject_id: selectedSubject,
          exam_id: selectedExam,
          records: data,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty-gradebook"] })
      toast("Marks updated successfully", "success")
      setMarksInput({})
    },
    onError: () => toast("Failed to update marks", "error"),
  })

  const handleMarksChange = (studentId: string, value: string) => {
    setMarksInput((prev) => ({ ...prev, [studentId]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const records = Object.entries(marksInput)
      .filter(([, value]) => value.trim() !== "")
      .map(([student_id, marks]) => ({
        student_id,
        marks: parseFloat(marks),
      }))
    if (records.length === 0) {
      toast("No marks to update", "error")
      return
    }
    updateMutation.mutate(records)
  }

  const selectedExamData = exams?.find((e) => e.id === selectedExam)
  const totalMarks = students?.reduce(
    (sum, s) => sum + (s.marks[selectedExam] ?? 0),
    0
  ) ?? 0
  const averageMarks = students?.length ? (totalMarks / students.length).toFixed(1) : "\u2014"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gradebook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter and manage student marks
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="gradebook-subject" className="block text-sm font-medium mb-1">
              Subject
            </label>
            <select
              id="gradebook-subject"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value)
                setSelectedExam("")
                setMarksInput({})
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
          <div className="flex-1">
            <label htmlFor="gradebook-exam" className="block text-sm font-medium mb-1">
              Exam
            </label>
            <select
              id="gradebook-exam"
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value)
                setMarksInput({})
              }}
              required
              disabled={!selectedSubject}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Select exam"
            >
              <option value="">Select an exam</option>
              {(exams ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.type} (Max: {e.max_marks})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedSubject && selectedExam && (
          <>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {selectedExamData && (
                <span>
                  Max marks: <strong>{selectedExamData.max_marks}</strong>
                </span>
              )}
              <span>
                Average: <strong>{averageMarks}</strong>
              </span>
              <span>
                Total students: <strong>{students?.length ?? 0}</strong>
              </span>
            </div>

            {studentsLoading ? (
              <div className="flex items-center justify-center py-12" aria-busy="true">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : students && students.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border" role="region" aria-label="Student marks">
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
                      <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                        Current Marks
                      </th>
                      <th scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                        New Marks
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, i) => {
                      const currentMarks = student.marks[selectedExam]
                      return (
                        <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-medium">{student.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {student.enrollment_number}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "font-medium",
                                currentMarks != null
                                  ? currentMarks >= (selectedExamData?.max_marks ?? 100) * 0.4
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {currentMarks != null ? currentMarks : "\u2014"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              max={selectedExamData?.max_marks ?? 100}
                              step={0.5}
                              value={marksInput[student.id] ?? ""}
                              onChange={(e) => handleMarksChange(student.id, e.target.value)}
                              placeholder="Enter marks"
                              className={cn(
                                "h-8 w-24 rounded-md border bg-background px-2 text-sm",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              )}
                              aria-label={`Enter marks for ${student.name}`}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No students or exam data found.
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateMutation.isPending || Object.keys(marksInput).length === 0}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                Update Marks
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
