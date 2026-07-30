"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { FileText } from "lucide-react"

interface Application {
  id: string
  drive_id: string
  company_name: string
  role: string
  status: string
  created_at: string
}

const statusColor = (s: string) => {
  switch (s) {
    case "pending": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "shortlisted": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "selected": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "rejected": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    default: return "bg-gray-100 text-gray-700"
  }
}

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading, error } = useQuery<Application[]>({
    queryKey: ["placement-applications"],
    queryFn: () => api("/api/v1/placement/applications"),
  })

  const filtered = (data ?? []).filter((a) => statusFilter === "all" || a.status === statusFilter)

  const columns: Column<Application>[] = [
    {
      key: "company_name",
      label: "Company",
      render: (a) => (
        <Link
          href={`/student/placement/drives/${a.drive_id}`}
          className="font-medium text-primary hover:underline"
          aria-label={`View drive for ${a.company_name}`}
        >
          {a.company_name}
        </Link>
      ),
    },
    { key: "role", label: "Role" },
    {
      key: "status",
      label: "Status",
      render: (a) => (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(a.status))}>
          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Applied Date",
      render: (a) => new Date(a.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your placement application status
        </p>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by application status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="selected">Selected</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <DataTable columns={columns} data={[]} loading rowKey={(a) => a.id} />
        ) : error ? (
          <div className="p-4 text-sm text-red-500" role="alert">Failed to load applications.</div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(a) => a.id}
            emptyMessage={
              statusFilter !== "all"
                ? `No ${statusFilter} applications found.`
                : "You haven't applied to any drives yet."
            }
          />
        )}
      </div>
    </div>
  )
}
