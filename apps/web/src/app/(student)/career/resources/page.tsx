"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shared/toast"
import { Modal } from "@/components/shared/modal"
import { Loader2, Plus, Trash2, BookOpen, ExternalLink, Filter } from "lucide-react"

interface Resource {
  id: string
  title: string
  url: string
  type: string
  tags: string[]
  description?: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-2 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  )
}

export default function CareerResourcesPage() {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", url: "", type: "", tags: "", description: "" })

  const canAdd = hasRole("tpo")

  const { data: resources, isLoading, error } = useQuery({
    queryKey: ["career-resources"],
    queryFn: () => api<Resource[]>("/api/v1/career/resources"),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; url: string; type: string; tags: string[]; description?: string }) =>
      api("/api/v1/career/resources", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-resources"] })
      toast("Resource added", "success")
      setShowForm(false)
      setForm({ title: "", url: "", type: "", tags: "", description: "" })
    },
    onError: () => toast("Failed to add resource", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/career/resources/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-resources"] })
      toast("Resource deleted", "success")
    },
    onError: () => toast("Failed to delete resource", "error"),
  })

  const allTags = [...new Set((resources ?? []).flatMap((r) => r.tags ?? []))]

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const filtered = (resources ?? []).filter(
    (r) => selectedTags.length === 0 || selectedTags.some((t) => (r.tags ?? []).includes(t)),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) {
      toast("Title and URL are required", "error")
      return
    }
    createMutation.mutate({
      title: form.title,
      url: form.url,
      type: form.type,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      description: form.description || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Career Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated resources to help you prepare for your career
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Add resource"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Resource
          </button>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Resource" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="res-title" className="block text-sm font-medium mb-1">Title *</label>
            <input
              id="res-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resource title"
            />
          </div>
          <div>
            <label htmlFor="res-url" className="block text-sm font-medium mb-1">URL *</label>
            <input
              id="res-url"
              type="url"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resource URL"
            />
          </div>
          <div>
            <label htmlFor="res-type" className="block text-sm font-medium mb-1">Type</label>
            <select
              id="res-type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resource type"
            >
              <option value="">Select type</option>
              <option value="article">Article</option>
              <option value="video">Video</option>
              <option value="course">Course</option>
              <option value="book">Book</option>
              <option value="tool">Tool</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="res-tags" className="block text-sm font-medium mb-1">Tags (comma separated)</label>
            <input
              id="res-tags"
              type="text"
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="resume, interview, coding"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resource tags"
            />
          </div>
          <div>
            <label htmlFor="res-desc" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="res-desc"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resource description"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent",
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
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Add Resource
            </button>
          </div>
        </form>
      </Modal>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Filter:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-pressed={selectedTags.includes(tag)}
              aria-label={`Filter by ${tag}`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-muted-foreground hover:text-foreground underline"
              aria-label="Clear filters"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load resources.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No resources found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedTags.length > 0
              ? "Try selecting different tags."
              : "No resources available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => (
            <div key={resource.id} className="group rounded-lg border p-4 transition-colors hover:bg-accent/30">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">{resource.title}</h2>
                    {resource.type && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {resource.type}
                      </span>
                    )}
                  </div>
                  {resource.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                  )}
                </div>
                {canAdd && (
                  <button
                    onClick={() => deleteMutation.mutate(resource.id)}
                    disabled={deleteMutation.isPending}
                    className={cn(
                      "ml-2 shrink-0 rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950",
                      "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    aria-label={`Delete ${resource.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {(resource.tags ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(resource.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
                )}
                aria-label={`Open ${resource.title}`}
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Open Resource
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
