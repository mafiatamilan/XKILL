"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import {
  Briefcase, MapPin, DollarSign, Clock, Calendar,
  GraduationCap, BookOpen, Users, ChevronLeft, Loader2, CheckCircle,
} from "lucide-react"

interface DriveDetail {
  id: string
  company_name: string
  company_description?: string
  company_website?: string
  role: string
  package_min?: number
  package_max?: number
  location: string
  description: string
  deadline: string
  drive_date: string
  status: "upcoming" | "ongoing" | "completed"
  eligibility_criteria?: {
    min_cgpa?: number
    max_backlogs?: number
    allowed_branches?: string[]
    allowed_years?: number[]
  }
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
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

const statusBadge = (s: string) => {
  switch (s) {
    case "upcoming": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "ongoing": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "completed": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    default: return "bg-gray-100 text-gray-700"
  }
}

export default function DriveDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: drive, isLoading, error } = useQuery<DriveDetail>({
    queryKey: ["placement-drive", params.id],
    queryFn: () => api(`/api/v1/placement/drives/${params.id}`),
    enabled: !!params.id,
  })

  const applyMutation = useMutation({
    mutationFn: () =>
      api("/api/v1/placement/apply", {
        method: "POST",
        body: JSON.stringify({ drive_id: params.id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["placement-drive", params.id] })
      queryClient.invalidateQueries({ queryKey: ["placement-drives"] })
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
        Back
      </button>

      {isLoading && <SkeletonSection />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load drive details.
        </div>
      )}

      {drive && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary" aria-hidden="true">
                  {drive.company_name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{drive.company_name}</h1>
                  <p className="text-base text-muted-foreground">{drive.role}</p>
                </div>
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-medium", statusBadge(drive.status))}>
              {drive.status.charAt(0).toUpperCase() + drive.status.slice(1)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" aria-hidden="true" />
                Package
              </div>
              <p className="mt-1 text-lg font-semibold">
                {drive.package_min
                  ? `${(drive.package_min / 100000).toFixed(1)} - ${(drive.package_max ?? drive.package_min / 100000).toFixed(1)} LPA`
                  : "\u2014"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Location
              </div>
              <p className="mt-1 text-lg font-semibold">{drive.location ?? "\u2014"}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Drive Date
              </div>
              <p className="mt-1 text-lg font-semibold">{new Date(drive.drive_date).toLocaleDateString()}</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Deadline
              </div>
              <p className="mt-1 text-lg font-semibold">{new Date(drive.deadline).toLocaleDateString()}</p>
            </div>
          </div>

          <section className="rounded-lg border p-5">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {drive.description || "No description provided."}
            </p>
          </section>

          {drive.eligibility_criteria && (
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">Eligibility Criteria</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {drive.eligibility_criteria.min_cgpa != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Min CGPA:</span>
                    <span className="font-medium">{drive.eligibility_criteria.min_cgpa}</span>
                  </div>
                )}
                {drive.eligibility_criteria.max_backlogs != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Max Backlogs:</span>
                    <span className="font-medium">{drive.eligibility_criteria.max_backlogs}</span>
                  </div>
                )}
                {drive.eligibility_criteria.allowed_branches && drive.eligibility_criteria.allowed_branches.length > 0 && (
                  <div className="flex items-center gap-2 text-sm sm:col-span-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground shrink-0">Allowed Branches:</span>
                    <div className="flex flex-wrap gap-1">
                      {drive.eligibility_criteria.allowed_branches.map((b) => (
                        <span key={b} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{b}</span>
                      ))}
                    </div>
                  </div>
                )}
                {drive.eligibility_criteria.allowed_years && drive.eligibility_criteria.allowed_years.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Years:</span>
                    <span className="font-medium">{drive.eligibility_criteria.allowed_years.join(", ")}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {drive.company_description && (
            <section className="rounded-lg border p-5">
              <h2 className="text-lg font-semibold">About the Company</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{drive.company_description}</p>
              {drive.company_website && (
                <a
                  href={drive.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Visit website
                </a>
              )}
            </section>
          )}

          <div className="flex items-center gap-4">
            {drive.has_applied ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
                <span>
                  You have already applied
                  {drive.application_status ? ` (${drive.application_status})` : ""}
                </span>
              </div>
            ) : drive.status === "completed" ? (
              <div className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
                This drive has already been completed.
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
                aria-label="Apply to this drive"
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
        </>
      )}
    </div>
  )
}
