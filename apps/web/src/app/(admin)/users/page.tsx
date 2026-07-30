"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { useToast } from "@/components/shared/toast"
import { Search, Loader2, ShieldAlert, ShieldCheck } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: string
  college: { id: string; name: string } | null
  status: "active" | "suspended"
  verified: boolean
  created_at: string
}

interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

function useDebounce(delay: number) {
  const [value, setValue] = useState("")
  const [debounced, setDebounced] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const update = useCallback(
    (v: string) => {
      setValue(v)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setDebounced(v), delay)
    },
    [delay],
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return [value, debounced, update] as const
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [searchInput, search, setSearch] = useDebounce(300)
  const [roleFilter, setRoleFilter] = useState("")
  const [cursors, setCursors] = useState<string[]>([])
  const cursor = cursors[cursors.length - 1] ?? null
  const hasPrev = cursors.length > 0

  const [suspendTarget, setSuspendTarget] = useState<User | null>(null)
  const [suspendReason, setSuspendReason] = useState("")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-users", search, roleFilter, cursor],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (roleFilter) params.set("role", roleFilter)
      params.set("limit", "15")
      if (cursor) params.set("cursor", cursor)
      return api<PaginatedResponse<User>>(`/api/v1/admin/users?${params.toString()}`)
    },
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api(`/api/v1/admin/users/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast("User suspended successfully", "success")
      setSuspendTarget(null)
      setSuspendReason("")
    },
    onError: () => toast("Failed to suspend user", "error"),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/admin/users/${id}/reactivate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      toast("User reactivated successfully", "success")
    },
    onError: () => toast("Failed to reactivate user", "error"),
  })

  const handleSearch = (value: string) => {
    setSearchInput(value)
    setSearch(value)
    setCursors([])
  }

  const nextPage = () => {
    if (data?.next_cursor) {
      setCursors([...cursors, data.next_cursor])
    }
  }

  const prevPage = () => {
    setCursors(cursors.slice(0, -1))
  }

  const users = data?.data ?? []

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      render: (u) => <span className="font-medium">{u.name}</span>,
    },
    { key: "email", label: "Email" },
    {
      key: "role",
      label: "Role",
      render: (u) => (
        <span className="capitalize">{u.role.replace("_", " ")}</span>
      ),
    },
    {
      key: "college",
      label: "College",
      render: (u) => u.college?.name ?? "\u2014",
    },
    {
      key: "status",
      label: "Status",
      render: (u) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            u.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}
        >
          {u.status === "active" ? "Active" : "Suspended"}
        </span>
      ),
    },
    {
      key: "verified",
      label: "Verified",
      render: (u) => (u.verified ? "Yes" : "No"),
    },
    {
      key: "created_at",
      label: "Created",
      render: (u) => new Date(u.created_at).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (u) => (
        <div className="flex gap-2">
          {u.status === "active" ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSuspendTarget(u)
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`Suspend ${u.name}`}
            >
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Suspend
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation()
                reactivateMutation.mutate(u.id)
              }}
              disabled={reactivateMutation.isPending}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label={`Reactivate ${u.name}`}
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Reactivate
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and manage user accounts
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            className={cn(
              "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search users by name or email"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setCursors([])
          }}
          className={cn(
            "h-10 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={users}
          loading={isLoading}
          rowKey={(u) => u.id}
          pagination={{
            hasNext: data?.has_more ?? false,
            hasPrev,
            onNext: nextPage,
            onPrev: prevPage,
            loading: isFetching && !isLoading,
          }}
          emptyMessage="No users found matching your search."
        />
      </div>

      <Modal
        open={suspendTarget !== null}
        onClose={() => {
          setSuspendTarget(null)
          setSuspendReason("")
        }}
        title={`Suspend ${suspendTarget?.name ?? ""}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (suspendTarget) {
              suspendMutation.mutate({ id: suspendTarget.id, reason: suspendReason })
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="suspend-reason" className="block text-sm font-medium mb-1">
              Reason for suspension
            </label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              required
              placeholder="Enter a reason..."
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Suspension reason"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setSuspendTarget(null)
                setSuspendReason("")
              }}
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={suspendMutation.isPending || !suspendReason.trim()}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-red-700",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-red-500",
              )}
            >
              {suspendMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirm Suspension
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
