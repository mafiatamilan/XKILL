"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Modal } from "@/components/shared/modal"
import { Loader2, Plus, Building2, ChevronDown, ChevronUp, Eye, MessageSquare } from "lucide-react"

interface Experience {
  id: string
  company: string
  role: string
  rounds: number
  content: string
  tips?: string
  is_anonymous: boolean
  user_name?: string
  created_at: string
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="h-5 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-16 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function InterviewExperiencesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [companyFilter, setCompanyFilter] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    company: "",
    role: "",
    rounds: 1,
    content: "",
    tips: "",
    is_anonymous: false,
  })

  const { data: experiences, isLoading, error } = useQuery({
    queryKey: ["interview-experiences", companyFilter],
    queryFn: () => {
      const params = companyFilter ? `?company=${encodeURIComponent(companyFilter)}` : ""
      return api<Experience[]>(`/api/v1/interview/experiences${params}`)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api("/api/v1/interview/experiences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-experiences"] })
      toast("Experience shared successfully", "success")
      setShowForm(false)
      setForm({ company: "", role: "", rounds: 1, content: "", tips: "", is_anonymous: false })
    },
    onError: () => toast("Failed to share experience", "error"),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company.trim() || !form.role.trim() || !form.content.trim()) {
      toast("Company, role, and content are required", "error")
      return
    }
    createMutation.mutate(form)
  }

  const companies = [...new Set((experiences ?? []).map((e) => e.company))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Experiences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn from peers who have been through the process
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Share your experience"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Share Experience
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Share Interview Experience" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-company" className="block text-sm font-medium mb-1">Company *</label>
              <input
                id="exp-company"
                type="text"
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Company name"
              />
            </div>
            <div>
              <label htmlFor="exp-role" className="block text-sm font-medium mb-1">Role *</label>
              <input
                id="exp-role"
                type="text"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Role"
              />
            </div>
          </div>
          <div>
            <label htmlFor="exp-rounds" className="block text-sm font-medium mb-1">Number of Rounds</label>
            <input
              id="exp-rounds"
              type="number"
              min={1}
              value={form.rounds}
              onChange={(e) => setForm((prev) => ({ ...prev, rounds: parseInt(e.target.value) || 1 }))}
              className={cn(
                "h-9 w-24 rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Number of interview rounds"
            />
          </div>
          <div>
            <label htmlFor="exp-content" className="block text-sm font-medium mb-1">Experience *</label>
            <textarea
              id="exp-content"
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={5}
              placeholder="Describe your interview experience in detail..."
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Interview experience details"
            />
          </div>
          <div>
            <label htmlFor="exp-tips" className="block text-sm font-medium mb-1">Tips for Others</label>
            <textarea
              id="exp-tips"
              value={form.tips}
              onChange={(e) => setForm((prev) => ({ ...prev, tips: e.target.value }))}
              rows={3}
              placeholder="Any tips or advice..."
              className={cn(
                "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Tips for others"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_anonymous}
              onChange={(e) => setForm((prev) => ({ ...prev, is_anonymous: e.target.checked }))}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Post anonymously
          </label>
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
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              )}
              Share
            </button>
          </div>
        </form>
      </Modal>

      <div>
        <label htmlFor="company-filter" className="sr-only">Filter by company</label>
        <select
          id="company-filter"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by company"
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load experiences.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : experiences && experiences.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Eye className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No experiences yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to share your interview experience!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(experiences ?? []).map((exp) => (
            <div key={exp.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {exp.company.charAt(0)}
                  </div>
                  <div>
                    <h2 className="font-semibold">{exp.company}</h2>
                    <p className="text-sm text-muted-foreground">{exp.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                  className={cn(
                    "shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={expandedId === exp.id ? "Collapse" : "Expand"}
                  aria-expanded={expandedId === exp.id}
                >
                  {expandedId === exp.id ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div className="mt-3 flex gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {exp.rounds} round{exp.rounds > 1 ? "s" : ""}
                </span>
              </div>

              {expandedId === exp.id && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div>
                    <h3 className="text-sm font-medium">Experience</h3>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{exp.content}</p>
                  </div>
                  {exp.tips && (
                    <div>
                      <h3 className="text-sm font-medium">Tips</h3>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{exp.tips}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Shared by {exp.is_anonymous ? "Anonymous" : (exp.user_name ?? "Unknown")} on{" "}
                    {new Date(exp.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
