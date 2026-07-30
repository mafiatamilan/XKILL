"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { useToast } from "@/components/shared/toast"
import { Check, X, Loader2, Search } from "lucide-react"

interface Recruiter {
  id: string
  name: string
  email: string
  company: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

export default function RecruitersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState("pending")
  const [search, setSearch] = useState("")
  const [cursors, setCursors] = useState<string[]>([])
  const cursor = cursors[cursors.length - 1] ?? null
  const hasPrev = cursors.length > 0

  const [confirmAction, setConfirmAction] = useState<{
    user: Recruiter
    action: "approve" | "reject"
  } | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-recruiters", search, statusFilter, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ role: "recruiter", limit: "15" })
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (cursor) params.set("cursor", cursor)
      return api<PaginatedResponse<Recruiter>>(`/api/v1/admin/users?${params.toString()}`)
    },
  })

  const approveMutation = useMutation({
    mutationFn: (userId: string) =>
      api("/api/v1/admin/recruiters/approve", {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recruiters"] })
      toast("Recruiter approved successfully", "success")
      setConfirmAction(null)
    },
    onError: () => toast("Failed to approve recruiter", "error"),
  })

  const handleAction = () => {
    if (!confirmAction) return
    if (confirmAction.action === "approve") {
      approveMutation.mutate(confirmAction.user.id)
    }
  }

  const recruiters = data?.data ?? []

  const columns: Column<Recruiter>[] = [
    {
      key: "name",
      label: "Name",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "email", label: "Email" },
    { key: "company", label: "Company", render: (r) => r.company ?? "\u2014" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            r.status === "approved" &&
              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            r.status === "rejected" &&
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            r.status === "pending" &&
              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          )}
        >
          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Registered",
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmAction({ user: r, action: "approve" })
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`Approve ${r.name}`}
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmAction({ user: r, action: "reject" })
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`Reject ${r.name}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">\u2014</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recruiter Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve or reject recruiter applications
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
            placeholder="Search by name or email..."
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search recruiters by name or email"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setCursors([])
          }}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by status"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={recruiters}
          loading={isLoading}
          rowKey={(r) => r.id}
          pagination={{
            hasNext: data?.has_more ?? false,
            hasPrev,
            onNext: () => {
              if (data?.next_cursor) setCursors([...cursors, data.next_cursor])
            },
            onPrev: () => setCursors(cursors.slice(0, -1)),
            loading: isFetching && !isLoading,
          }}
          emptyMessage={
            statusFilter === "pending"
              ? "No pending recruiters to review."
              : `No ${statusFilter} recruiters found.`
          }
        />
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.action === "approve"
            ? "Approve Recruiter"
            : "Reject Recruiter"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirmAction?.action === "approve"
              ? `Are you sure you want to approve ${confirmAction?.user.name} as a recruiter?`
              : `Are you sure you want to reject ${confirmAction?.user.name}'s recruiter application?`}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={approveMutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white",
                confirmAction?.action === "approve"
                  ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500"
                  : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2",
              )}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {confirmAction?.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
