"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import {
  BookOpen, Users, ClipboardCheck, Calculator, Calendar,
  FilePlus, Loader2, GraduationCap, Mail
} from "lucide-react"

interface SubjectDetail {
  id: string
  name: string
  code: string
  semester: number
  department: string
  faculty: string
  credits: number
}

interface EnrolledStudent {
  id: string
  name: string
  email: string
  enrollment_number: string
}

function SkeletonBlock() {
  return <div className="h-24 animate-pulse rounded-lg border bg-muted" aria-hidden="true" />
}

export default function FacultySubjectDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const { data: subject, isLoading } = useQuery({
    queryKey: ["faculty-subject-detail", id],
    queryFn: () => api<SubjectDetail>(`/api/v1/faculty/subjects/${id}`),
    enabled: !!id,
  })

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["faculty-subject-students", id],
    queryFn: () => api<EnrolledStudent[]>(`/api/v1/faculty/subjects/${id}/students`),
    enabled: !!id,
  })

  const quickActions = [
    { href: `/faculty/attendance?subject=${id}`, label: "Mark Attendance", icon: ClipboardCheck, desc: "Record today's attendance" },
    { href: `/faculty/gradebook?subject=${id}`, label: "Enter Marks", icon: Calculator, desc: "Update student marks" },
    { href: `/faculty/exams?subject=${id}`, label: "Create Exam", icon: Calendar, desc: "Schedule a new exam" },
    { href: `/faculty/assignments?subject=${id}`, label: "Create Assignment", icon: FilePlus, desc: "Add a new assignment" },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-lg border bg-muted" />
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{subject.name}</h1>
            <p className="text-sm text-muted-foreground">{subject.code}</p>
          </div>
          <GraduationCap className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Semester</p>
            <p className="text-sm font-medium">{subject.semester}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{subject.department}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Credits</p>
            <p className="text-sm font-medium">{subject.credits}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Faculty</p>
            <p className="text-sm font-medium">{subject.faculty}</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label={action.label}
              >
                <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="font-medium text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          Enrolled Students ({(students ?? []).length})
        </h2>
        {studentsLoading ? (
          <SkeletonBlock />
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="Enrolled students">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                  <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Enrollment No.</th>
                  <th scope="col" className="border px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                </tr>
              </thead>
              <tbody>
                {(students ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border px-3 py-8 text-center text-muted-foreground">
                      No students enrolled.
                    </td>
                  </tr>
                ) : (
                  (students ?? []).map((student, i) => (
                    <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{student.name}</td>
                      <td className="px-3 py-2">{student.enrollment_number}</td>
                      <td className="px-3 py-2">
                        <a
                          href={`mailto:${student.email}`}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          aria-label={`Email ${student.name}`}
                        >
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {student.email}
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
