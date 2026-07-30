"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Building2, MapPin, DollarSign, Search, Clock, Briefcase } from "lucide-react"

interface Job {
  id: string
  company_name: string
  title: string
  location?: string
  location_type?: string
  salary_min?: number
  salary_max?: number
  job_type: string
  skills?: string[]
  experience_years?: number
  deadline?: string
  has_applied?: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const { data, isLoading, error } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => api("/api/v1/jobs"),
  })

  const filtered = (data ?? []).filter((j) => {
    const matchesSearch =
      !search ||
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || j.job_type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Job Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore job opportunities from partner companies
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or company..."
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search jobs"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by job type"
        >
          <option value="all">All Types</option>
          <option value="full-time">Full Time</option>
          <option value="part-time">Part Time</option>
          <option value="internship">Internship</option>
          <option value="contract">Contract</option>
        </select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load job listings.
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          {search || typeFilter !== "all"
            ? "No jobs match your search criteria."
            : "No job listings available yet."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((job) => (
          <Link
            key={job.id}
            href={`/student/jobs/${job.id}`}
            className={cn(
              "rounded-lg border p-5 transition-shadow hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={`View ${job.title} at ${job.company_name}`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary" aria-hidden="true">
                {job.company_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{job.title}</h2>
                <p className="text-sm text-muted-foreground">{job.company_name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {job.location}
                    </span>
                  )}
                  {job.salary_min != null && (
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3 w-3" aria-hidden="true" />
                      {job.salary_min / 1000}k - {job.salary_max ? job.salary_max / 1000 : "?"}k
                    </span>
                  )}
                  {job.deadline && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {job.skills && job.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {job.skills.slice(0, 4).map((skill) => (
                      <span key={skill} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{job.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {job.job_type.replace("-", " ")}
                  </span>
                  {job.experience_years != null && (
                    <span className="text-xs text-muted-foreground">
                      {job.experience_years === 0 ? "Fresher" : `${job.experience_years}+ yrs`}
                    </span>
                  )}
                  {job.has_applied && (
                    <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Applied
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
