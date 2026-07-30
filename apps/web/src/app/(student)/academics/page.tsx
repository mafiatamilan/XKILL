"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import {
  BookOpen, Calendar, ClipboardList, Users, Clock, Calculator,
  GraduationCap, Loader2, ChevronDown, CheckCircle2, XCircle
} from "lucide-react"

interface Subject {
  id: string
  name: string
  code: string
  faculty: string
  credits: number
  attendance_percentage: number
  attended: number
  total_classes: number
  internal_marks: number
  max_internal_marks: number
}

interface Exam {
  id: string
  subject_name: string
  type: string
  date: string
  time: string
}

interface Assignment {
  id: string
  title: string
  subject_name: string
  deadline: string
  status: string
}

interface TimetableSlot {
  day: string
  time: string
  subject_name: string
  room: string
}

function SkeletonSection() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
        ))}
      </div>
    </div>
  )
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState("subjects")
  const [semester, setSemester] = useState("1")

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["student-subjects"],
    queryFn: () => api<Subject[]>("/api/v1/student/subjects"),
  })

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ["student-exams"],
    queryFn: () => api<Exam[]>("/api/v1/student/exams"),
  })

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["student-assignments"],
    queryFn: () => api<Assignment[]>("/api/v1/student/assignments"),
  })

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ["student-timetable"],
    queryFn: () => api<TimetableSlot[]>("/api/v1/student/timetable"),
  })

  const tabs = [
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "exams", label: "Exams", icon: Calendar },
    { id: "assignments", label: "Assignments", icon: ClipboardList },
    { id: "attendance", label: "Attendance", icon: Users },
    { id: "timetable", label: "Timetable", icon: Clock },
    { id: "marks", label: "Internal Marks", icon: Calculator },
    { id: "gpa", label: "GPA Calculator", icon: GraduationCap },
  ]

  const gpaSemesters = ["1", "2", "3", "4", "5", "6", "7", "8"]

  const { data: gpaData } = useQuery({
    queryKey: ["student-gpa", semester],
    queryFn: () => api<{ sgpa: number; cgpa: number; credits: number }>(
      `/api/v1/student/gpa?semester=${semester}`
    ),
    enabled: activeTab === "gpa",
  })

  const timetableByDay: Record<string, TimetableSlot[]> = {}
  if (timetable) {
    for (const slot of timetable) {
      if (!timetableByDay[slot.day]) timetableByDay[slot.day] = []
      timetableByDay[slot.day].push(slot)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Academics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subjects, exams, assignments, and more
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2" role="tablist" aria-label="Academic sections">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
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

      <div role="tabpanel" id={`panel-${activeTab}`} className="space-y-6">
        {activeTab === "subjects" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Enrolled Subjects</h2>
            {subjectsLoading ? (
              <SkeletonSection />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(subjects ?? []).map((subject) => (
                  <Link
                    key={subject.id}
                    href={`/student/academics/subjects/${subject.id}`}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`View ${subject.name}`}
                  >
                    <h3 className="font-semibold">{subject.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{subject.code}</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p>Faculty: {subject.faculty}</p>
                      <p>Credits: {subject.credits}</p>
                    </div>
                  </Link>
                ))}
                {(subjects ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No subjects enrolled yet.
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "exams" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Exam Schedule</h2>
            {examsLoading ? (
              <SkeletonSection />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(exams ?? []).map((exam) => (
                  <div key={exam.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{exam.subject_name}</h3>
                    <p className="text-xs text-muted-foreground">{exam.type}</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{new Date(exam.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">{exam.time}</span>
                    </div>
                  </div>
                ))}
                {(exams ?? []).length === 0 && (
                  <p className="col-span-full text-sm text-muted-foreground">No upcoming exams.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === "assignments" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Assignments</h2>
            {assignmentsLoading ? (
              <SkeletonSection />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(assignments ?? []).map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        <p className="text-xs text-muted-foreground">{assignment.subject_name}</p>
                      </div>
                      {assignment.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Completed" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" aria-label="Pending" />
                      )}
                    </div>
                    <p className="mt-2 text-sm">
                      Deadline:{" "}
                      <time className="text-muted-foreground">
                        {new Date(assignment.deadline).toLocaleDateString()}
                      </time>
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
          <section>
            <h2 className="text-lg font-semibold mb-3">Attendance Summary</h2>
            {subjectsLoading ? (
              <SkeletonSection />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(subjects ?? []).map((subject) => (
                  <div key={subject.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold">{subject.attendance_percentage}%</span>
                        <span className="text-muted-foreground">
                          {subject.attended}/{subject.total_classes} classes
                        </span>
                      </div>
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
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "timetable" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Timetable</h2>
            {timetableLoading ? (
              <SkeletonSection />
            ) : (
              <div className="overflow-x-auto" role="region" aria-label="Weekly timetable">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
                      {days.map((day) => (
                        <th key={day} scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Set(timetable?.map((s) => s.time) ?? [])).sort().map((time) => (
                      <tr key={time}>
                        <td className="border px-3 py-2 font-medium">{time}</td>
                        {days.map((day) => {
                          const slot = timetableByDay[day]?.find((s) => s.time === time)
                          return (
                            <td key={day} className="border px-3 py-2">
                              {slot ? (
                                <div>
                                  <p className="font-medium">{slot.subject_name}</p>
                                  <p className="text-xs text-muted-foreground">{slot.room}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">\u2014</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === "marks" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Internal Marks</h2>
            {subjectsLoading ? (
              <SkeletonSection />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(subjects ?? []).map((subject) => (
                  <div key={subject.id} className="rounded-lg border p-4">
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                    <p className="mt-3 text-lg font-bold">
                      {subject.internal_marks ?? "\u2014"}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{subject.max_internal_marks ?? "\u2014"}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "gpa" && (
          <section>
            <h2 className="text-lg font-semibold mb-3">GPA Calculator</h2>
            <div className="mb-4">
              <label htmlFor="semester-select" className="block text-sm font-medium mb-1">
                Select Semester
              </label>
              <select
                id="semester-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={cn(
                  "h-9 rounded-md border bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Select semester for GPA calculation"
              >
                {gpaSemesters.map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            {gpaData ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">SGPA</p>
                  <p className="text-2xl font-bold">{gpaData.sgpa.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">CGPA</p>
                  <p className="text-2xl font-bold">{gpaData.cgpa.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-sm text-muted-foreground">Credits</p>
                  <p className="text-2xl font-bold">{gpaData.credits}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a semester to view GPA.</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
