"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import {
  Briefcase, Users, Award, Clock, Building2, Megaphone,
  Plus, ChevronRight, Loader2,
} from "lucide-react"

interface TPODashboardData {
  total_drives: number
  active_drives: number
  total_applications: number
  total_offers: number
  pending_approvals: number
}

interface Announcement {
  id: string
  title: string
  content: string
  target: string
  created_at: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function TPODashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<TPODashboardData>({
    queryKey: ["tpo-dashboard-stats"],
    queryFn: () => api("/api/v1/tpo/dashboard"),
  })

  const { data: announcements, isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["tpo-announcements-list"],
    queryFn: () => api("/api/v1/tpo/announcements"),
  })

  const statCards = [
    { key: "total_drives", label: "Total Drives", icon: Briefcase, color: "text-blue-600 dark:text-blue-400" },
    { key: "active_drives", label: "Active Drives", icon: Clock, color: "text-green-600 dark:text-green-400" },
    { key: "total_applications", label: "Applications", icon: Users, color: "text-purple-600 dark:text-purple-400" },
    { key: "total_offers", label: "Offers Made", icon: Award, color: "text-teal-600 dark:text-teal-400" },
    { key: "pending_approvals", label: "Pending Approvals", icon: Building2, color: "text-orange-600 dark:text-orange-400" },
  ]

  const quickLinks = [
    { href: "/tpo/drives/create", label: "Create Drive", icon: Plus, desc: "Schedule a new placement drive" },
    { href: "/tpo/companies", label: "Manage Companies", icon: Building2, desc: "Approve and manage company profiles" },
    { href: "/tpo/announcements", label: "Post Announcement", icon: Megaphone, desc: "Send notifications to students" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">TPO Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of placement activities
        </p>
      </div>

      {statsLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {statsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load dashboard statistics.
        </div>
      )}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statCards.map((stat) => {
            const Icon = stat.icon
            const value = stats[stat.key as keyof TPODashboardData]
            return (
              <div key={stat.key} className="rounded-lg border p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <Icon className={cn("h-5 w-5", stat.color)} aria-hidden="true" />
                </div>
                <p className="mt-1 text-2xl font-bold">{value ?? "\u2014"}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="mt-3 space-y-2">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Announcements</h2>
            <Link
              href="/tpo/announcements"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {announcementsLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
              ))}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {(announcements ?? []).length === 0 ? (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">No announcements yet.</p>
              ) : (
                (announcements ?? []).slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">{a.title}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                        {a.target}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                    <time className="mt-2 block text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </time>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
