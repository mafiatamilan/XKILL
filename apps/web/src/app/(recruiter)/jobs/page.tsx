"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Plus } from "lucide-react"

interface RecruiterJob {
  id: string
  title: string
  status: "active" | "closed" | "draft"
  applications_count?: number
  created_at: string
}

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "closed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    case "draft": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30"
    default: return "bg-gray-100 text-gray-700"
  }
}

export default function RecruiterJobsPage() {
  const { data, isLoading, error } = useQuery<RecruiterJob[]>({
    queryKey: ["recruiter-jobs"],
    queryFn: () => api("/api/v1/jobs"),
  })

  const columns: Column<RecruiterJob>[] = [
    {
      key: "title",
      label: "Title",
      render: (j) => <span className="font-medium">{j.title}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (j) => (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusColor(j.status))}>
          {j.status}
        </span>
      ),
    },
    { key: "applications_count", label: "Applications" },
    {
      key: "created_at",
      label: "Posted",
      render: (j) => new Date(j.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your posted job listings
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

      <div className="rounded-lg border">
        {isLoading ? (
          <DataTable columns={columns} data={[]} loading rowKey={(j) => j.id} />
        ) : error ? (
          <div className="p-4 text-sm text-red-500" role="alert">Failed to load jobs.</div>
        ) : (
          <DataTable
            columns={columns}
            data={data ?? []}
            rowKey={(j) => j.id}
            onRowClick={(j) => window.location.href = `/recruiter/jobs/${j.id}`}
            emptyMessage="No jobs posted yet. Create your first job posting."
          />
        )}
      </div>
    </div>
  )
}
