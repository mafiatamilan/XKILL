"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Briefcase, MapPin, Clock, DollarSign, Search, Loader2 } from "lucide-react"

interface Drive {
  id: string
  company_name: string
  company_logo?: string
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
}

const statusColor = (s: string) => {
  switch (s) {
    case "upcoming": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "ongoing": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "completed": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    default: return "bg-gray-100 text-gray-700"
  }
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlacementDrivesPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading, error } = useQuery<Drive[]>({
    queryKey: ["placement-drives"],
    queryFn: () => api("/api/v1/placement/drives"),
  })

  const filtered = (data ?? []).filter((d) => {
    const matchesSearch =
      !search ||
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      d.role.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || d.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placement Drives</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and apply to upcoming placement drives
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role..."
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search placement drives"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load placement drives. Please try again.
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          {search || statusFilter !== "all"
            ? "No drives match your search criteria."
            : "No placement drives available yet."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((drive) => (
          <Link
            key={drive.id}
            href={`/student/placement/drives/${drive.id}`}
            className={cn(
              "rounded-lg border p-5 transition-shadow hover:shadow-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={`View ${drive.company_name} ${drive.role} drive`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary" aria-hidden="true">
                {drive.company_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{drive.company_name}</h2>
                    <p className="text-sm text-muted-foreground">{drive.role}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(drive.status))}>
                    {drive.status.charAt(0).toUpperCase() + drive.status.slice(1)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" aria-hidden="true" />
                    {drive.package_min ? `${(drive.package_min / 100000).toFixed(1)} - ${(drive.package_max ?? 0 / 100000).toFixed(1)} LPA` : "\u2014"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    {drive.location ?? "\u2014"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    Deadline: {new Date(drive.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {drive.has_applied ? (
                    <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Applied
                    </span>
                  ) : drive.status === "completed" ? (
                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-900/30">
                      Closed
                    </span>
                  ) : (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                      "bg-primary text-primary-foreground",
                    )}>
                      <Briefcase className="h-3 w-3" aria-hidden="true" />
                      Apply Now
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
