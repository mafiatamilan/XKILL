"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { DataTable, type Column } from "@/components/shared/data-table"
import { useToast } from "@/components/shared/toast"
import { Check, Loader2 } from "lucide-react"
import { useState } from "react"
import { Modal } from "@/components/shared/modal"

interface Company {
  id: string
  name: string
  industry?: string
  size?: string
  website?: string
  description?: string
  verified: boolean
  recruiters_count?: number
}

export default function TPOCompaniesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [verifyTarget, setVerifyTarget] = useState<Company | null>(null)

  const { data, isLoading, error } = useQuery<Company[]>({
    queryKey: ["tpo-companies"],
    queryFn: () => api("/api/v1/companies"),
  })

  const verifyMutation = useMutation({
    mutationFn: (companyId: string) =>
      api(`/api/v1/companies/${companyId}/verify`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpo-companies"] })
      toast("Company verified successfully", "success")
      setVerifyTarget(null)
    },
    onError: () => toast("Failed to verify company", "error"),
  })

  const columns: Column<Company>[] = [
    { key: "name", label: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "industry", label: "Industry", render: (c) => c.industry ?? "\u2014" },
    { key: "size", label: "Size", render: (c) => c.size ?? "\u2014" },
    {
      key: "verified",
      label: "Status",
      render: (c) => (
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          c.verified
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        )}>
          {c.verified ? "Verified" : "Pending"}
        </span>
      ),
    },
    { key: "recruiters_count", label: "Recruiters" },
    {
      key: "actions",
      label: "Actions",
      render: (c) =>
        !c.verified ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setVerifyTarget(c)
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
              "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label={`Verify ${c.name}`}
          >
            <Check className="h-3 w-3" aria-hidden="true" />
            Verify
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">\u2014</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage and verify company profiles
        </p>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <DataTable columns={columns} data={[]} loading rowKey={(c) => c.id} />
        ) : error ? (
          <div className="p-4 text-sm text-red-500" role="alert">Failed to load companies.</div>
        ) : (
          <DataTable
            columns={columns}
            data={data ?? []}
            rowKey={(c) => c.id}
            emptyMessage="No companies registered yet."
          />
        )}
      </div>

      <Modal
        open={verifyTarget !== null}
        onClose={() => setVerifyTarget(null)}
        title="Verify Company"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to verify <strong>{verifyTarget?.name}</strong>?
            This will allow them to post jobs and participate in placement drives.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setVerifyTarget(null)}
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Cancel
            </button>
            <button
              onClick={() => verifyTarget && verifyMutation.mutate(verifyTarget.id)}
              disabled={verifyMutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-green-700",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
              )}
            >
              {verifyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirm Verification
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
