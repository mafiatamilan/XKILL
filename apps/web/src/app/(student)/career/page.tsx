"use client"

import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useQuery } from "@tanstack/react-query"
import { Compass, BookOpen, TrendingUp, Target, ArrowRight, Loader2 } from "lucide-react"

interface CareerStats {
  total_paths: number
  total_resources: number
}

export default function CareerHubPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["career-stats"],
    queryFn: () => api<CareerStats>("/api/v1/career/paths"),
    select: (data) => {
      const paths = Array.isArray(data) ? data : []
      return { total_paths: paths.length, total_resources: 0 }
    },
  })

  const quickLinks = [
    {
      href: "/career/paths",
      label: "Career Paths",
      icon: Compass,
      desc: "Explore different career paths, required skills, and growth opportunities",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      href: "/career/resources",
      label: "Career Resources",
      icon: BookOpen,
      desc: "Access curated resources to boost your career readiness",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Career Hub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan your career path and access resources to succeed
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Compass className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Career Paths
            </div>
            <p className="mt-1 text-2xl font-bold">{stats?.total_paths ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4 text-purple-500" aria-hidden="true" />
              Resources
            </div>
            <p className="mt-1 text-2xl font-bold">{stats?.total_resources ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4 text-green-500" aria-hidden="true" />
              Get Started
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore paths to find your direction
            </p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group rounded-lg border p-6 transition-all",
                  "hover:shadow-md hover:border-primary/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label={`Go to ${link.label}`}
              >
                <div className="flex items-start gap-4">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", link.bg)}>
                    <Icon className={cn("h-6 w-6", link.color)} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{link.label}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-6">
        <h2 className="text-lg font-semibold">Why Career Planning Matters</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          A well-planned career path helps you identify the skills you need, 
          understand industry expectations, and stay motivated throughout your 
          placement preparation journey. Explore different paths, learn from 
          resources, and track your progress toward your dream role.
        </p>
      </section>
    </div>
  )
}
