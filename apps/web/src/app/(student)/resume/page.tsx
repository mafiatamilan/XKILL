"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shared/toast"
import { Loader2, Plus, FileText, Star, Pencil, Trash2, BarChart3, ExternalLink } from "lucide-react"

interface Resume {
  id: string
  title: string
  template_id: string
  template_name?: string
  file_url?: string
  ats_score?: number
  is_primary: boolean
  created_at: string
  updated_at: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}

export default function ResumesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: resumes, isLoading, error } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => api<Resume[]>("/api/v1/resumes"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/resumes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] })
      toast("Resume deleted", "success")
      setDeletingId(null)
    },
    onError: () => {
      toast("Failed to delete resume", "error")
      setDeletingId(null)
    },
  })

  const primaryMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/resumes/${id}/primary`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumes"] })
      toast("Primary resume updated", "success")
    },
    onError: () => toast("Failed to set primary resume", "error"),
  })

  const handleDelete = (id: string) => {
    setDeletingId(id)
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage your resumes
          </p>
        </div>
        <Link
          href="/resume/create"
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Create new resume"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Resume
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load resumes.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : resumes && resumes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold">No resumes yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first resume to get started.
          </p>
          <Link
            href="/resume/create"
            className={cn(
              "mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Resume
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(resumes ?? []).map((resume) => (
            <div
              key={resume.id}
              className="rounded-lg border p-5 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{resume.title}</h2>
                    {resume.is_primary && (
                      <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {resume.template_name ?? "No template"}
                  </p>
                </div>
              </div>

              {resume.ats_score != null && (
                <div className="mt-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    ATS Score: {resume.ats_score}%
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => router.push(`/resume/${resume.id}`)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`View resume ${resume.title}`}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  View
                </button>
                <button
                  onClick={() => router.push(`/resume/${resume.id}`)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Edit resume ${resume.title}`}
                >
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Edit
                </button>
                {!resume.is_primary && (
                  <button
                    onClick={() => primaryMutation.mutate(resume.id)}
                    disabled={primaryMutation.isPending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "disabled:pointer-events-none disabled:opacity-50",
                    )}
                    aria-label={`Set ${resume.title} as primary`}
                  >
                    <Star className="h-3 w-3" aria-hidden="true" />
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(resume.id)}
                  disabled={deletingId === resume.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600",
                    "hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  aria-label={`Delete resume ${resume.title}`}
                >
                  {deletingId === resume.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  )}
                  Delete
                </button>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Updated {new Date(resume.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
