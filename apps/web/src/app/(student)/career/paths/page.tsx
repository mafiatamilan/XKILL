"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Modal } from "@/components/shared/modal"
import { Loader2, Compass, DollarSign, TrendingUp } from "lucide-react"

interface CareerPath {
  id: string
  title: string
  description: string
  skills: string[]
  avg_salary: string
  growth_rate: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-5" aria-hidden="true">
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}

export default function CareerPathsPage() {
  const [selected, setSelected] = useState<CareerPath | null>(null)

  const { data: paths, isLoading, error } = useQuery({
    queryKey: ["career-paths"],
    queryFn: () => api<CareerPath[]>("/api/v1/career/paths"),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Career Paths</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore different career paths and find your direction
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load career paths.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : paths && paths.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Compass className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No career paths yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Career paths will be available soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(paths ?? []).map((path) => (
            <button
              key={path.id}
              onClick={() => setSelected(path)}
              className={cn(
                "rounded-lg border p-5 text-left transition-all",
                "hover:shadow-md hover:border-primary/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`View ${path.title} details`}
            >
              <h2 className="font-semibold">{path.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {path.description}
              </p>

              {path.skills && path.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {path.skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {path.skills.length > 4 && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      +{path.skills.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                {path.avg_salary && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" aria-hidden="true" />
                    {path.avg_salary}
                  </span>
                )}
                {path.growth_rate && (
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    {path.growth_rate}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ""} className="max-w-xl">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selected.description}</p>

            {selected.skills && selected.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selected.avg_salary && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Average Salary</p>
                  <p className="mt-1 text-lg font-bold">{selected.avg_salary}</p>
                </div>
              )}
              {selected.growth_rate && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Growth Rate</p>
                  <p className="mt-1 text-lg font-bold">{selected.growth_rate}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
