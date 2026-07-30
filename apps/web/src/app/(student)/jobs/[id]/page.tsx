"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import {
  Building2, MapPin, DollarSign, Clock, Briefcase,
  GraduationCap, ChevronLeft, Loader2, CheckCircle, Globe,
} from "lucide-react"

interface JobDetail {
  id: string
  company_name: string
  company_description?: string
  company_website?: string
  title: string
  description: string
  requirements?: string
  location?: string
  location_type?: string
  salary_min?: number
  salary_max?: number
  job_type: string
  skills?: string[]
  experience_years?: number
  deadline?: string
  status: "active" | "closed" | "draft"
  has_applied?: boolean
  application_status?: string
}

function SkeletonSection() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: job, isLoading, error } = useQuery<JobDetail>({
    queryKey: ["job", params.id],
    queryFn: () => api(`/api/v1/jobs/${params.id}`),
    enabled: !!params.id,
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      api(`/api/v1/jobs/${params.id}/apply`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", params.id] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      toast("Application submitted successfully", "success")
    },
    onError: () => toast("Failed to submit application", "error"),
  })

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        )}
        aria-label="Go back"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back to jobs
      </button>

      {isLoading && <SkeletonSection />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load job details.
        </div>
      )}

      {job && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary" aria-hidden="true">
                {job.company_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="text-base text-muted-foreground">{job.company_name}</p>
              </div>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-medium capitalize",
              job.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              job.status === "closed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              "bg-gray-100 text-gray-700 dark:bg-gray-900/30",
            )}>
              {job.status}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {job.salary_min != null && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  Salary Range
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {job.salary_min / 1000}k - {job.salary_max ? job.salary_max / 1000 : "?"}k
                </p>
              </div>
            )}
            {job.location && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Location
                </div>
                <p className="mt-1 text-lg font-semibold">{job.location}</p>
                {job.location_type && (
                  <p className="text-xs text-muted-foreground capitalize">{job.location_type}</p>
                )}
              </div>
            )}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
                Job Type
              </div>
              <p className="mt-1 text-lg font-semibold capitalize">{job.job_type.replace("-", " ")}</p>
            </div>
            {job.experience_years != null && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Experience
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {job.experience_years === 0 ? "Fresher" : `${job.experience_years}+ years`}
                </p>
              </div>
            )}
          </div>

          <section className="rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {job.description || "No description provided."}
            </p>
          </section>

          {job.requirements && (
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">Requirements</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {job.requirements}
              </p>
            </section>
          )}

          {job.skills && job.skills.length > 0 && (
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">Skills</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span key={skill} className="rounded-md bg-muted px-3 py-1 text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {job.deadline && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Application deadline: {new Date(job.deadline).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex items-center gap-4">
            {job.has_applied ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                <span>
                  You have already applied
                  {job.application_status ? ` (${job.application_status})` : ""}
                </span>
              </div>
            ) : job.status === "closed" ? (
              <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
                This position is no longer accepting applications.
              </div>
            ) : (
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Apply for this position"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                )}
                Apply Now
              </button>
            )}
          </div>

          {job.company_description && (
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">About {job.company_name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{job.company_description}</p>
              {job.company_website && (
                <a
                  href={job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Visit website
                </a>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
