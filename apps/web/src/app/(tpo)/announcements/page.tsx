"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2, Megaphone } from "lucide-react"

interface Announcement {
  id: string
  title: string
  content: string
  target: string
  created_at: string
}

export default function AnnouncementsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "all",
  })

  const { data, isLoading, error } = useQuery<Announcement[]>({
    queryKey: ["tpo-announcements"],
    queryFn: () => api("/api/v1/tpo/announcements"),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api("/api/v1/tpo/announcements", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tpo-announcements"] })
      queryClient.invalidateQueries({ queryKey: ["tpo-dashboard-stats"] })
      toast("Announcement posted successfully", "success")
      setForm({ title: "", content: "", target: "all" })
    },
    onError: () => toast("Failed to create announcement", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    createMutation.mutate({
      title: form.title,
      content: form.content,
      target: form.target,
    })
  }

  const fieldClass = cn(
    "w-full rounded-md border bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  )

  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage announcements for students and faculty
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border p-5 space-y-4">
        <h2 className="text-lg font-semibold">Create Announcement</h2>

        <div>
          <label htmlFor="announcement-title" className={labelClass}>Title *</label>
          <input
            id="announcement-title"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className={fieldClass}
            placeholder="Announcement title"
            aria-label="Announcement title"
          />
        </div>

        <div>
          <label htmlFor="announcement-content" className={labelClass}>Content *</label>
          <textarea
            id="announcement-content"
            required
            rows={4}
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            className={cn(fieldClass, "resize-y")}
            placeholder="Write your announcement..."
            aria-label="Announcement content"
          />
        </div>

        <div>
          <label htmlFor="announcement-target" className={labelClass}>Target Audience</label>
          <select
            id="announcement-target"
            value={form.target}
            onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
            className={fieldClass}
            aria-label="Target audience"
          >
            <option value="all">All</option>
            <option value="students">Students Only</option>
            <option value="faculty">Faculty Only</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending || !form.title.trim() || !form.content.trim()}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Megaphone className="h-4 w-4" aria-hidden="true" />
            )}
            Post Announcement
          </button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-semibold mb-3">Previous Announcements</h2>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
            Failed to load announcements.
          </div>
        )}

        {data && data.length === 0 && (
          <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            No announcements posted yet.
          </p>
        )}

        <div className="space-y-3">
          {(data ?? []).map((announcement) => (
            <article key={announcement.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{announcement.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{announcement.content}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                  {announcement.target}
                </span>
              </div>
              <time className="mt-2 block text-xs text-muted-foreground">
                {new Date(announcement.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
