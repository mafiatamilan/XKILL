"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { BookOpen, Briefcase, Swords, Award, TrendingUp, Calendar, Loader2 } from "lucide-react"

interface DashboardData {
  problems_solved: number
  current_streak: number
  placement_readiness: number
  upcoming_exams: number
  recent_activity: { id: string; description: string; timestamp: string }[]
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-7 w-16 animate-pulse rounded bg-muted" />
    </div>
  )
}

function SkeletonActivity() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" aria-hidden="true" />
      ))}
    </div>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: () => api<DashboardData>("/api/v1/student/dashboard"),
  })

  const statCards = [
    { label: "Problems Solved", value: data?.problems_solved, icon: BookOpen, color: "text-blue-600 dark:text-blue-400" },
    { label: "Current Streak", value: data?.current_streak ? `${data.current_streak} days` : undefined, icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
    { label: "Placement Readiness", value: data?.placement_readiness ? `${data.placement_readiness}%` : undefined, icon: Award, color: "text-purple-600 dark:text-purple-400" },
    { label: "Upcoming Exams", value: data?.upcoming_exams, icon: Calendar, color: "text-orange-600 dark:text-orange-400" },
  ]

  const quickLinks = [
    { href: "/student/dsa", label: "DSA Platform", icon: BookOpen, desc: "Solve problems and track progress" },
    { href: "/student/placement", label: "Placement Prep", icon: Briefcase, desc: "Roadmap and resources" },
    { href: "/student/battles", label: "Coding Battles", icon: Swords, desc: "Compete with peers" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your learning overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <Icon className={cn("h-5 w-5", stat.color)} aria-hidden="true" />
                  </div>
                  <p className="mt-1 text-2xl font-bold">{stat.value ?? "\u2014"}</p>
                </div>
              )
            })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          {isLoading ? (
            <SkeletonActivity />
          ) : error ? (
            <p className="mt-2 text-sm text-red-500" role="alert">
              Failed to load activity.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {(data?.recent_activity ?? []).length === 0 ? (
                <p className="rounded-md border p-4 text-sm text-muted-foreground">
                  No recent activity yet.
                </p>
              ) : (
                data?.recent_activity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <span className="flex-1">{activity.description}</span>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </time>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Quick Links</h2>
          <div className="mt-2 space-y-2">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Go to ${link.label}`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
