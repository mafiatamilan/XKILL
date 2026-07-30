"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { ChevronDown, ChevronRight, Search } from "lucide-react"

interface AuditEntry {
  id: string
  timestamp: string
  actor: { id: string; name: string; email: string }
  action: string
  resource_type: string
  resource_id: string
  details: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

function JsonView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-muted-foreground">\u2014</span>
  return (
    <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter] = useState("")
  const [resourceFilter, setResourceFilter] = useState("")
  const [search, setSearch] = useState("")
  const [cursors, setCursors] = useState<string[]>([])
  const cursor = cursors[cursors.length - 1] ?? null
  const hasPrev = cursors.length > 0
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit-log", actionFilter, resourceFilter, search, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "15" })
      if (actionFilter) params.set("action", actionFilter)
      if (resourceFilter) params.set("resource_type", resourceFilter)
      if (search) params.set("search", search)
      if (cursor) params.set("cursor", cursor)
      return api<PaginatedResponse<AuditEntry>>(`/api/v1/sysadmin/audit-log?${params.toString()}`)
    },
  })

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const entries = data?.data ?? []

  const columns: Column<AuditEntry>[] = [
    {
      key: "expand",
      label: "",
      render: (e) => (
        <button
          onClick={(ev) => {
            ev.stopPropagation()
            toggleRow(e.id)
          }}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded",
            "hover:bg-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label={expandedId === e.id ? "Collapse details" : "Expand details"}
          aria-expanded={expandedId === e.id}
        >
          {expandedId === e.id ? (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      ),
      className: "w-10",
    },
    {
      key: "timestamp",
      label: "Timestamp",
      render: (e) => new Date(e.timestamp).toLocaleString(),
    },
    {
      key: "actor",
      label: "Actor",
      render: (e) => (
        <span>
          {e.actor.name}
          <span className="block text-xs text-muted-foreground">{e.actor.email}</span>
        </span>
      ),
    },
    { key: "action", label: "Action" },
    { key: "resource_type", label: "Resource Type" },
    {
      key: "resource_id",
      label: "Resource ID",
      render: (e) => (
        <code className="rounded bg-muted px-1 py-0.5 text-xs">{e.resource_id}</code>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (e) => (
        <span className="max-w-[200px] truncate block">
          {e.details ?? "\u2014"}
        </span>
      ),
    },
  ]

  const actions = [
    "create",
    "update",
    "delete",
    "suspend",
    "reactivate",
    "approve",
    "reject",
    "login",
    "logout",
  ]
  const resourceTypes = ["user", "college", "recruiter", "feature_flag", "job", "application"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all administrative actions across the platform
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCursors([])
            }}
            placeholder="Search audit log..."
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search audit log"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value)
            setCursors([])
          }}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => {
            setResourceFilter(e.target.value)
            setCursors([])
          }}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by resource type"
        >
          <option value="">All resources</option>
          {resourceTypes.map((r) => (
            <option key={r} value={r}>
              {r
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={entries}
          loading={isLoading}
          rowKey={(e) => e.id}
          pagination={{
            hasNext: data?.has_more ?? false,
            hasPrev,
            onNext: () => {
              if (data?.next_cursor) setCursors([...cursors, data.next_cursor])
            },
            onPrev: () => setCursors(cursors.slice(0, -1)),
            loading: isFetching && !isLoading,
          }}
          emptyMessage="No audit log entries found."
        />
      </div>

      {expandedId && entries.find((e) => e.id === expandedId) && (
        <div className="rounded-lg border p-4" role="region" aria-label="Audit entry details">
          {(() => {
            const entry = entries.find((e) => e.id === expandedId)!
            return (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium">Before State</h3>
                  <JsonView data={entry.before} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">After State</h3>
                  <JsonView data={entry.after} />
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
