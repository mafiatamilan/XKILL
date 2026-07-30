"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { Modal } from "@/components/shared/modal"
import { useToast } from "@/components/shared/toast"
import { Plus, Loader2, ToggleLeft, ToggleRight } from "lucide-react"

interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  rollout_percentage: number
  created_at: string
  updated_at: string
}

interface FlagForm {
  key: string
  name: string
  description: string
  enabled: boolean
  rollout_percentage: number
}

const emptyForm: FlagForm = {
  key: "",
  name: "",
  description: "",
  enabled: false,
  rollout_percentage: 100,
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FlagForm>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: () => api<FeatureFlag[]>("/api/v1/sysadmin/feature-flags"),
  })

  const createMutation = useMutation({
    mutationFn: (body: FlagForm) =>
      api("/api/v1/sysadmin/feature-flags", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] })
      toast("Feature flag created", "success")
      setModalOpen(false)
      setForm(emptyForm)
    },
    onError: () => toast("Failed to create feature flag", "error"),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api(`/api/v1/sysadmin/feature-flags/${id}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-feature-flags"] })
      const previous = queryClient.getQueryData<FeatureFlag[]>(["admin-feature-flags"])
      queryClient.setQueryData<FeatureFlag[]>(["admin-feature-flags"], (old) =>
        old?.map((f) => (f.id === id ? { ...f, enabled } : f)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["admin-feature-flags"], context?.previous)
      toast("Failed to update flag", "error")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<FlagForm> }) =>
      api(`/api/v1/sysadmin/feature-flags/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] })
      toast("Feature flag updated", "success")
    },
    onError: () => toast("Failed to update feature flag", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const handleField = (field: keyof FlagForm, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const flags = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage feature toggles across the platform
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Create new feature flag"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Flag
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground" role="status">
          No feature flags configured.
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Feature flags">
          {flags.map((flag) => (
            <div
              key={flag.id}
              role="listitem"
              className={cn(
                "rounded-lg border p-4 transition-colors",
                "hover:bg-muted/30",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{flag.name}</h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {flag.key}
                    </code>
                  </div>
                  {flag.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {flag.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Rollout: <strong>{flag.rollout_percentage}%</strong>
                    </span>
                    <span>
                      Updated: {new Date(flag.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        flag.enabled
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          flag.enabled ? "bg-green-500" : "bg-gray-400",
                        )}
                        aria-hidden="true"
                      />
                      {flag.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })
                    }
                    disabled={toggleMutation.isPending}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
                      "hover:bg-accent hover:text-accent-foreground",
                      "disabled:pointer-events-none disabled:opacity-50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.name}`}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="h-5 w-5 text-green-500" aria-hidden="true" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setForm(emptyForm)
        }}
        title="Create Feature Flag"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="flag-key" className="block text-sm font-medium mb-1">
              Key <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="flag-key"
              value={form.key}
              onChange={(e) => handleField("key", slugify(e.target.value))}
              required
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              placeholder="my-feature-flag"
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm font-mono",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Flag key (slug format)"
            />
          </div>
          <div>
            <label htmlFor="flag-name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="flag-name"
              value={form.name}
              onChange={(e) => handleField("name", e.target.value)}
              required
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Flag display name"
            />
          </div>
          <div>
            <label htmlFor="flag-description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="flag-description"
              value={form.description}
              onChange={(e) => handleField("description", e.target.value)}
              rows={2}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Flag description"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => handleField("enabled", e.target.checked)}
                className="rounded border-gray-300"
              />
              Enabled
            </label>
          </div>
          <div>
            <label htmlFor="flag-rollout" className="block text-sm font-medium mb-1">
              Rollout Percentage: {form.rollout_percentage}%
            </label>
            <input
              id="flag-rollout"
              type="range"
              min={0}
              max={100}
              value={form.rollout_percentage}
              onChange={(e) => handleField("rollout_percentage", Number(e.target.value))}
              className="w-full"
              aria-label="Rollout percentage"
            />
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
              Create Flag
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
