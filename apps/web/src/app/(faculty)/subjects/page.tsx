"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { BookOpen, Users as UsersIcon, Loader2, GraduationCap } from "lucide-react"

interface FacultySubject {
  id: string
  name: string
  code: string
  semester: number
  department: string
  enrolled_students: number
}

function SkeletonSubject() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-4">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

export default function FacultySubjectsPage() {
  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ["faculty-subjects"],
    queryFn: () => api<FacultySubject[]>("/api/v1/faculty/subjects"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subjects you are currently teaching
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonSubject key={i} />)}
        </div>
      ) : error ? (
        <p className="text-red-500" role="alert">Failed to load subjects.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects ?? []).length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">
              You are not assigned to any subjects yet.
            </p>
          ) : (
            (subjects ?? []).map((subject) => (
              <Link
                key={subject.id}
                href={`/faculty/subjects/${subject.id}`}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label={`View ${subject.name}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold">{subject.name}</h2>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                  </div>
                  <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Sem {subject.semester}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {subject.enrolled_students} students
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
