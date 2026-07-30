"use client"

import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Briefcase, Users, Award, TrendingUp, DollarSign, Building2 } from "lucide-react"

interface PlacementStats {
  total_drives: number
  total_applications: number
  total_offers: number
  placed_students: number
  average_package?: number
  max_package?: number
  company_count: number
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
    </div>
  )
}

const statCards = [
  { key: "total_drives", label: "Total Drives", icon: Briefcase, color: "text-blue-600 dark:text-blue-400", suffix: "" },
  { key: "total_applications", label: "Applications", icon: FileText, color: "text-purple-600 dark:text-purple-400", suffix: "" },
  { key: "total_offers", label: "Total Offers", icon: Award, color: "text-green-600 dark:text-green-400", suffix: "" },
  { key: "placed_students", label: "Placed Students", icon: Users, color: "text-teal-600 dark:text-teal-400", suffix: "" },
  { key: "average_package", label: "Avg Package", icon: TrendingUp, color: "text-orange-600 dark:text-orange-400", suffix: " LPA" },
  { key: "max_package", label: "Max Package", icon: DollarSign, color: "text-yellow-600 dark:text-yellow-400", suffix: " LPA" },
  { key: "company_count", label: "Companies", icon: Building2, color: "text-indigo-600 dark:text-indigo-400", suffix: "" },
]

function FileText({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function PlacementStatsPage() {
  const { data, isLoading, error } = useQuery<PlacementStats>({
    queryKey: ["placement-stats"],
    queryFn: () => api("/api/v1/placement/stats"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Placement Statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of placement performance
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load placement statistics.
        </div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const value = data[stat.key as keyof PlacementStats]
            return (
              <div key={stat.key} className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className={cn("h-5 w-5", stat.color)} aria-hidden="true" />
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {value != null ? `${value}${stat.suffix}` : "\u2014"}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {data && Object.values(data).every((v) => v == null || v === 0) && (
        <div className="py-12 text-center text-muted-foreground">
          No placement statistics available yet.
        </div>
      )}
    </div>
  )
}
