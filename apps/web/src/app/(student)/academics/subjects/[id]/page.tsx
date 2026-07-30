"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import {
  BookOpen, Calendar, ClipboardList, Users, Calculator,
  Loader2, FileText, CheckCircle2, XCircle
} from "lucide-react"

interface SubjectDetail {
  id: string
  name: string
  code: string
  faculty: string
  credits: number
  semester: number
  department: string
}

interface StudyMaterial {
  id: string
  title: string
  type: string
  url: string
  uploaded_at: string
}

interface SubjectExam {
  id: string
  type: string
  date: string
  time: string
  duration: string
  max_marks: number
}

interface SubjectAssignment {
  id: string
  title: string
  description: string
  deadline: string
  status: string
  max_marks: number
}

interface AttendanceRecord {
  date: string
  status: "present" | "absent" | "leave"
}

interface MarksBreakdown {
  exam_type: string
  marks_obtained: number
  max_marks: number
}

function SkeletonBlock() {
  return <div className="h-24 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
}

export default function SubjectDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [activeTab, setActiveTab] = useState("materials")

  const { data: subject, isLoading: subjectLoading } = useQuery({
    queryKey: ["subject-detail", id],
    queryFn: () => api<SubjectDetail>(`/api/v1/student/subjects/${id}`),
    enabled: !!id,
  })

  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["subject-materials", id],
    queryFn: () => api<StudyMaterial[]>(`/api/v1/student/subjects/${id}/materials`),
    enabled: activeTab === "materials" && !!id,
  })

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["subject-exams", id],
    queryFn: () => api<SubjectExam[]>(`/api/v1/student/subjects/${id}/exams`),
    enabled: activeTab === "exams" && !!id,
  })

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["subject-assignments", id],
    queryFn: () => api<SubjectAssignment[]>(`/api/v1/student/subjects/${id}/assignments`),
    enabled: activeTab === "assignments" && !!id,
  })

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["subject-attendance", id],
    queryFn: () => api<AttendanceRecord[]>(`/api/v1/student/subjects/${id}/attendance`),
    enabled: activeTab === "attendance" && !!id,
  })

  const { data: marks, isLoading: marksLoading } = useQuery({
    queryKey: ["subject-marks", id],
    queryFn: () => api<MarksBreakdown[]>(`/api/v1/student/subjects/${id}/marks`),
    enabled: activeTab === "marks" && !!id,
  })

  const tabs = [
    { id: "materials", label: "Materials", icon: BookOpen },
    { id: "exams", label: "Exams", icon: Calendar },
    { id: "assignments", label: "Assignments", icon: ClipboardList },
    { id: "attendance", label: "Attendance", icon: Users },
    { id: "marks", label: "Marks", icon: Calculator },
  ]

  const presentCount = attendance?.filter((a) => a.status === "present").length ?? 0
  const attendancePercent = attendance?.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0

  if (subjectLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-lg border bg-muted" />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Subject not found</h1>
        <p className="text-muted-foreground">The requested subject could not be loaded.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <h1 className="text-2xl font-bold">{subject.name}</h1>
        <p className="text-sm text-muted-foreground">{subject.code}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Faculty</p>
            <p className="text-sm font-medium">{subject.faculty}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credits</p>
            <p className="text-sm font-medium">{subject.credits}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Semester</p>
            <p className="text-sm font-medium">{subject.semester}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{subject.department}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2" role="tablist" aria-label="Subject sections">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`subject-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`subject-panel-${activeTab}`} className="space-y-4">
        {activeTab === "materials" && (
          <section aria-label="Study materials">
            <h2 className="text-lg font-semibold mb-3">Study Materials</h2>
            {materialsLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(materials ?? []).map((material) => (
                  <a
                    key={material.id}
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                      "hover:bg-accent",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`Open ${material.title}`}
                  >
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{material.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {material.type} \u2022 {new Date(material.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                ))}
                {(materials ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">No materials available.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "exams" && (
          <section aria-label="Scheduled exams">
            <h2 className="text-lg font-semibold mb-3">Scheduled Exams</h2>
            {examsLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(exams ?? []).map((exam) => (
                  <div key={exam.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{exam.type}</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {new Date(exam.date).toLocaleDateString()} at {exam.time}
                      </p>
                      <p>Duration: {exam.duration}</p>
                      <p>Max Marks: {exam.max_marks}</p>
                    </div>
                  </div>
                ))}
                {(exams ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">No exams scheduled.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "assignments" && (
          <section aria-label="Assignments">
            <h2 className="text-lg font-semibold mb-3">Assignments</h2>
            {assignmentsLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(assignments ?? []).map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        <p className="text-xs text-muted-foreground">Max marks: {assignment.max_marks}</p>
                      </div>
                      {assignment.status === "submitted" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Submitted" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" aria-label="Pending" />
                      )}
                    </div>
                    {assignment.description && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
                    )}
                    <p className="mt-2 text-sm">
                      Deadline: <time className="text-muted-foreground">{new Date(assignment.deadline).toLocaleDateString()}</time>
                    </p>
                  </div>
                ))}
                {(assignments ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">No assignments yet.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "attendance" && (
          <section aria-label="Attendance records">
            <h2 className="text-lg font-semibold mb-3">Attendance Record</h2>
            {attendanceLoading ? (
              <SkeletonBlock />
            ) : (
              <>
                <div className="mb-4 flex items-center gap-4 text-sm">
                  <span>
                    Present: <strong className="text-green-600 dark:text-green-400">{presentCount}</strong>
                  </span>
                  <span>
                    Absent: <strong className="text-red-600 dark:text-red-400">
                      {(attendance ?? []).length - presentCount}
                    </strong>
                  </span>
                  <span>
                    Percentage: <strong>{attendancePercent}%</strong>
                  </span>
                </div>
                <div className="overflow-x-auto" role="region" aria-label="Attendance dates">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(attendance ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="border px-3 py-8 text-center text-muted-foreground">
                            No attendance records found.
                          </td>
                        </tr>
                      ) : (
                        (attendance ?? []).map((record, i) => (
                          <tr key={i}>
                            <td className="border px-3 py-2">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="border px-3 py-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                  record.status === "present"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : record.status === "leave"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                )}
                              >
                                {record.status === "present" ? (
                                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                  <XCircle className="h-3 w-3" aria-hidden="true" />
                                )}
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === "marks" && (
          <section aria-label="Marks breakdown">
            <h2 className="text-lg font-semibold mb-3">Internal Marks Breakdown</h2>
            {marksLoading ? (
              <SkeletonBlock />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(marks ?? []).map((entry, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <h3 className="font-medium">{entry.exam_type}</h3>
                    <p className="mt-2 text-lg font-bold">
                      {entry.marks_obtained}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{entry.max_marks}
                      </span>
                    </p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((entry.marks_obtained / entry.max_marks) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`Score for ${entry.exam_type}`}>
                      <div
                        className={cn(
                          "h-full rounded-full bg-primary transition-all",
                        )}
                        style={{ width: `${(entry.marks_obtained / entry.max_marks) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(marks ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">No marks available.</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
