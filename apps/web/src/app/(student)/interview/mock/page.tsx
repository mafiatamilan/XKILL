"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Modal } from "@/components/shared/modal"
import { Loader2, Plus, Calendar, Clock, Video, User, Bot, Star } from "lucide-react"

interface MockInterview {
  id: string
  scheduled_at: string
  duration_min: number
  mode: "peer" | "self" | "ai"
  status: "scheduled" | "completed" | "cancelled"
  feedback?: string
  rating?: number
}

const modeIcons: Record<string, React.ReactNode> = {
  peer: <User className="h-4 w-4" aria-hidden="true" />,
  self: <Video className="h-4 w-4" aria-hidden="true" />,
  ai: <Bot className="h-4 w-4" aria-hidden="true" />,
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
}

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={cn("h-4 animate-pulse rounded bg-muted", i < 2 ? "w-1/2" : "w-3/4")} />
        </td>
      ))}
    </tr>
  )
}

export default function MockInterviewPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    scheduled_at: "",
    duration_min: 30,
    mode: "ai" as "peer" | "self" | "ai",
  })

  const { data: mocks, isLoading, error } = useQuery({
    queryKey: ["mock-interviews"],
    queryFn: () => api<MockInterview[]>("/api/v1/interview/mock"),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api("/api/v1/interview/mock", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mock-interviews"] })
      toast("Mock interview scheduled", "success")
      setShowForm(false)
      setForm({ scheduled_at: "", duration_min: 30, mode: "ai" })
    },
    onError: () => toast("Failed to schedule mock interview", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.scheduled_at) {
      toast("Date and time are required", "error")
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mock Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and manage your mock interview sessions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Schedule mock interview"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Schedule New
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Schedule Mock Interview">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="mock-datetime" className="block text-sm font-medium mb-1">Date & Time *</label>
            <input
              id="mock-datetime"
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Schedule date and time"
            />
          </div>
          <div>
            <label htmlFor="mock-duration" className="block text-sm font-medium mb-1">Duration (minutes)</label>
            <input
              id="mock-duration"
              type="number"
              min={15}
              max={180}
              step={5}
              value={form.duration_min}
              onChange={(e) => setForm((prev) => ({ ...prev, duration_min: parseInt(e.target.value) || 30 }))}
              className={cn(
                "h-9 w-24 rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Duration in minutes"
            />
          </div>
          <div>
            <label htmlFor="mock-mode" className="block text-sm font-medium mb-1">Mode</label>
            <select
              id="mock-mode"
              value={form.mode}
              onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value as "peer" | "self" | "ai" }))}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Interview mode"
            >
              <option value="ai">AI Interview</option>
              <option value="peer">Peer Interview</option>
              <option value="self">Self Practice</option>
            </select>
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
              ) : (
                <Calendar className="h-4 w-4" aria-hidden="true" />
              )}
              Schedule
            </button>
          </div>
        </form>
      </Modal>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load mock interviews.
        </div>
      )}

      <div className="overflow-x-auto" role="region" aria-label="Mock interviews table">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr role="row">
              {["Date & Time", "Duration", "Mode", "Status", "Feedback / Rating"].map((label) => (
                <th key={label} scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : mocks && mocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground" role="status">
                  <Calendar className="mx-auto h-8 w-8 mb-2" aria-hidden="true" />
                  No mock interviews scheduled.
                </td>
              </tr>
            ) : (
              (mocks ?? []).map((mock) => (
                <tr key={mock.id} className="border-b transition-colors hover:bg-muted/50" role="row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{new Date(mock.scheduled_at).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{mock.duration_min} min</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                      {modeIcons[mock.mode]}
                      {mock.mode.charAt(0).toUpperCase() + mock.mode.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusColors[mock.status])}>
                      {mock.status.charAt(0).toUpperCase() + mock.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {mock.feedback ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground line-clamp-2">{mock.feedback}</p>
                        {mock.rating != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600">
                            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                            {mock.rating}/5
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">\u2014</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
