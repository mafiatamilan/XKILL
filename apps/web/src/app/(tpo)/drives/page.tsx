"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Plus } from "lucide-react"

interface Drive {
  id: string
  company_name: string
  role: string
  status: "upcoming" | "ongoing" | "completed"
  deadline: string
  applications_count?: number
}

const statusColor = (s: string) => {
  switch (s) {
    case "upcoming": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    case "ongoing": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    case "completed": return "bg-gray-100 text-gray-700 dark:bg-gray-900/30"
    default: return "bg-gray-100 text-gray-700"
  }
}

export default function TPODrivesPage() {
  const { data, isLoading, error } = useQuery<Drive[]>({
    queryKey: ["tpo-drives"],
    queryFn: () => api("/api/v1/placement/drives"),
  })

  const columns: Column<Drive>[] = [
    { key: "company_name", label: "Company", render: (d) => <span className="font-medium">{d.company_name}</span> },
    { key: "role", label: "Role" },
    {
      key: "status",
      label: "Status",
      render: (d) => (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusColor(d.status))}>
          {d.status}
        </span>
      ),
    },
    {
      key: "deadline",
      label: "Deadline",
      render: (d) => new Date(d.deadline).toLocaleDateString(),
    },
    { key: "applications_count", label: "Applications" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Placement Drives</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all placement drives
          </p>
        </div>
        <Link
          href="/tpo/drives/create"
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Drive
        </Link>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <DataTable columns={columns} data={[]} loading rowKey={(d) => d.id} />
        ) : error ? (
          <div className="p-4 text-sm text-red-500" role="alert">Failed to load drives.</div>
        ) : (
          <DataTable
            columns={columns}
            data={data ?? []}
            rowKey={(d) => d.id}
            onRowClick={(d) => window.location.href = `/tpo/drives/${d.id}`}
            emptyMessage="No placement drives created yet."
          />
        )}
      </div>
    </div>
  )
}
