"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { Modal } from "@/components/shared/modal"
import { useToast } from "@/components/shared/toast"
import { Plus, Loader2 } from "lucide-react"

interface College {
  id: string
  name: string
  code: string
  domain: string | null
  city: string | null
  state: string | null
  status: string
  created_at: string
}

interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

interface CollegeForm {
  name: string
  code: string
  domain: string
  city: string
  state: string
}

const emptyForm: CollegeForm = { name: "", code: "", domain: "", city: "", state: "" }

export default function CollegesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<CollegeForm>(emptyForm)
  const [cursors, setCursors] = useState<string[]>([])
  const cursor = cursors[cursors.length - 1] ?? null
  const hasPrev = cursors.length > 0

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-colleges", cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "15" })
      if (cursor) params.set("cursor", cursor)
      return api<PaginatedResponse<College>>(`/api/v1/admin/colleges?${params.toString()}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: CollegeForm) =>
      api("/api/v1/admin/colleges", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colleges"] })
      toast("College created successfully", "success")
      setModalOpen(false)
      setForm(emptyForm)
    },
    onError: () => toast("Failed to create college", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handleField = (field: keyof CollegeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const colleges = data?.data ?? []

  const columns: Column<College>[] = [
    {
      key: "name",
      label: "Name",
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    { key: "code", label: "Code" },
    { key: "domain", label: "Domain", render: (c) => c.domain ?? "\u2014" },
    { key: "city", label: "City", render: (c) => c.city ?? "\u2014" },
    { key: "state", label: "State", render: (c) => c.state ?? "\u2014" },
    {
      key: "status",
      label: "Status",
      render: (c) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            c.status === "active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          )}
        >
          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (c) => new Date(c.created_at).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colleges</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered colleges and institutions
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Add new college"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add College
        </button>
      </div>

      <div className="rounded-lg border">
        <DataTable
          columns={columns}
          data={colleges}
          loading={isLoading}
          rowKey={(c) => c.id}
          pagination={{
            hasNext: data?.has_more ?? false,
            hasPrev,
            onNext: () => {
              if (data?.next_cursor) setCursors([...cursors, data.next_cursor])
            },
            onPrev: () => setCursors(cursors.slice(0, -1)),
            loading: isFetching && !isLoading,
          }}
          emptyMessage="No colleges found."
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setForm(emptyForm)
        }}
        title="Add College"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="college-name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="college-name"
              value={form.name}
              onChange={(e) => handleField("name", e.target.value)}
              required
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="College name"
            />
          </div>
          <div>
            <label htmlFor="college-code" className="block text-sm font-medium mb-1">
              Code <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="college-code"
              value={form.code}
              onChange={(e) => handleField("code", e.target.value.toUpperCase())}
              required
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="College code"
            />
          </div>
          <div>
            <label htmlFor="college-domain" className="block text-sm font-medium mb-1">
              Domain
            </label>
            <input
              id="college-domain"
              value={form.domain}
              onChange={(e) => handleField("domain", e.target.value)}
              placeholder="example.edu"
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="College domain"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="college-city" className="block text-sm font-medium mb-1">
                City
              </label>
              <input
                id="college-city"
                value={form.city}
                onChange={(e) => handleField("city", e.target.value)}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="College city"
              />
            </div>
            <div>
              <label htmlFor="college-state" className="block text-sm font-medium mb-1">
                State
              </label>
              <input
                id="college-state"
                value={form.state}
                onChange={(e) => handleField("state", e.target.value)}
                className={cn(
                  "w-full rounded-md border bg-background px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="College state"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false)
                setForm(emptyForm)
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
              disabled={createMutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Create College
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
