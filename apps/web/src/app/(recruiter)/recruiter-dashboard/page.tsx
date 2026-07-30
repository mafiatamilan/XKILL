"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Building2, Briefcase, Users, FileText, Plus, Loader2 } from "lucide-react"

interface CompanyProfile {
  id: string
  name: string
  industry?: string
  size?: string
  website?: string
  description?: string
  verified: boolean
}

interface RecruiterDashboardData {
  company: CompanyProfile | null
  active_jobs: number
  total_applications: number
  offers_made: number
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function RecruiterDashboardPage() {
  const { data, isLoading, error } = useQuery<RecruiterDashboardData>({
    queryKey: ["recruiter-dashboard"],
    queryFn: async () => {
      const [company, me] = await Promise.all([
        api<CompanyProfile[]>("/api/v1/companies").catch(() => []),
        api<{ company_id?: string }>("/api/v1/recruiters/me").catch(() => ({})),
      ])
      return {
        company: (company as CompanyProfile[])?.[0] ?? null,
        active_jobs: 0,
        total_applications: 0,
        offers_made: 0,
      }
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recruiter Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company profile and job postings
          </p>
        </div>
        <Link
          href="/recruiter/jobs/create"
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Job
        </Link>
      </div>

      {isLoading && <SkeletonDashboard />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load dashboard data.
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <p className="mt-1 text-2xl font-bold">{data.active_jobs}</p>
            </div>
            <div className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              </div>
              <p className="mt-1 text-2xl font-bold">{data.total_applications}</p>
            </div>
            <div className="rounded-lg border p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Offers Made</p>
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <p className="mt-1 text-2xl font-bold">{data.offers_made}</p>
            </div>
          </div>

          <section className="rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Company Profile</h2>
              {data.company && (
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  data.company.verified
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                )}>
                  {data.company.verified ? "Verified" : "Pending"}
                </span>
              )}
            </div>
            {data.company ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{data.company.name}</p>
                </div>
                {data.company.industry && (
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{data.company.industry}</p>
                  </div>
                )}
                {data.company.size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Size</p>
                    <p className="font-medium">{data.company.size}</p>
                  </div>
                )}
                {data.company.website && (
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a href={data.company.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {data.company.website}
                    </a>
                  </div>
                )}
                {data.company.description && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm text-muted-foreground">{data.company.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border-2 border-dashed p-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">No company profile yet.</p>
                <Link
                  href="/recruiter/company"
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Create Company Profile
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
