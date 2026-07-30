"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import {
  Loader2, ChevronLeft, Star, BarChart3, Pencil, Trash2, Plus, FileText, X, Check, Save,
} from "lucide-react"

interface ResumeSection {
  id: string
  section_type: string
  title: string
  content: string
  order: number
}

interface ResumeDetail {
  id: string
  title: string
  template_id: string
  template_name?: string
  file_url?: string
  ats_score?: number
  is_primary: boolean
  sections: ResumeSection[]
  created_at: string
  updated_at: string
}

const sectionTypes = [
  { value: "education", label: "Education" },
  { value: "experience", label: "Experience" },
  { value: "skills", label: "Skills" },
  { value: "projects", label: "Projects" },
  { value: "certifications", label: "Certifications" },
]

function SkeletonSection() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

export default function ResumeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ section_type: "", title: "", content: "" })
  const [showAddSection, setShowAddSection] = useState(false)
  const [newSection, setNewSection] = useState({ section_type: "education", title: "", content: "" })

  const { data: resume, isLoading, error } = useQuery({
    queryKey: ["resume", params.id],
    queryFn: () => api<ResumeDetail>(`/api/v1/resumes/${params.id}`),
    enabled: !!params.id,
  })

  const primaryMutation = useMutation({
    mutationFn: () => api(`/api/v1/resumes/${params.id}/primary`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", params.id] })
      queryClient.invalidateQueries({ queryKey: ["resumes"] })
      toast("Resume set as primary", "success")
    },
    onError: () => toast("Failed to set as primary", "error"),
  })

  const analyzeMutation = useMutation({
    mutationFn: () => api<{ ats_score: number }>(`/api/v1/resumes/${params.id}/analyze`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resume", params.id] })
      toast(`ATS Score: ${data.ats_score}%`, "success")
    },
    onError: () => toast("Failed to analyze resume", "error"),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) =>
      api(`/api/v1/resumes/sections/${sectionId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", params.id] })
      toast("Section deleted", "success")
    },
    onError: () => toast("Failed to delete section", "error"),
  })

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ResumeSection> }) =>
      api(`/api/v1/resumes/sections/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", params.id] })
      toast("Section updated", "success")
      setEditingSection(null)
    },
    onError: () => toast("Failed to update section", "error"),
  })

  const addSectionMutation = useMutation({
    mutationFn: (data: { section_type: string; title: string; content: string }) =>
      api(`/api/v1/resumes/${params.id}/sections`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", params.id] })
      toast("Section added", "success")
      setShowAddSection(false)
      setNewSection({ section_type: "education", title: "", content: "" })
    },
    onError: () => toast("Failed to add section", "error"),
  })

  const startEdit = (section: ResumeSection) => {
    setEditingSection(section.id)
    setEditForm({
      section_type: section.section_type,
      title: section.title,
      content: section.content,
    })
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/resume")}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        )}
        aria-label="Go back to resumes"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back to Resumes
      </button>

      {isLoading && <SkeletonSection />}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load resume.
        </div>
      )}

      {resume && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{resume.title}</h1>
                {resume.is_primary && (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Primary
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {resume.template_name ?? "No template"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!resume.is_primary && (
                <button
                  onClick={() => primaryMutation.mutate()}
                  disabled={primaryMutation.isPending}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  aria-label="Set as primary resume"
                >
                  {primaryMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Star className="h-4 w-4" aria-hidden="true" />
                  )}
                  Set as Primary
                </button>
              )}
              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                aria-label="Analyze resume"
              >
                {analyzeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                )}
                Analyze
              </button>
            </div>
          </div>

          {resume.ats_score != null && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-4">
              <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">ATS Score:</span>
              <span className="text-lg font-bold">{resume.ats_score}%</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sections</h2>
            <button
              onClick={() => setShowAddSection(true)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Add section"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Section
            </button>
          </div>

          {showAddSection && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">New Section</h3>
                <button
                  onClick={() => setShowAddSection(false)}
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="Cancel adding section"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div>
                <label htmlFor="new-section-type" className="block text-sm font-medium mb-1">Type</label>
                <select
                  id="new-section-type"
                  value={newSection.section_type}
                  onChange={(e) => setNewSection((prev) => ({ ...prev, section_type: e.target.value }))}
                  className={cn(
                    "h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {sectionTypes.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-section-title" className="block text-sm font-medium mb-1">Title</label>
                <input
                  id="new-section-title"
                  type="text"
                  value={newSection.title}
                  onChange={(e) => setNewSection((prev) => ({ ...prev, title: e.target.value }))}
                  className={cn(
                    "h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="New section title"
                />
              </div>
              <div>
                <label htmlFor="new-section-content" className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  id="new-section-content"
                  value={newSection.content}
                  onChange={(e) => setNewSection((prev) => ({ ...prev, content: e.target.value }))}
                  rows={3}
                  className={cn(
                    "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label="New section content"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => addSectionMutation.mutate(newSection)}
                  disabled={addSectionMutation.isPending}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
                    "hover:bg-primary/90",
                    "disabled:pointer-events-none disabled:opacity-50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  {addSectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                  Add
                </button>
              </div>
            </div>
          )}

          {resume.sections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted-foreground">No sections yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resume.sections.map((section) => (
                <div key={section.id} className="rounded-lg border p-4">
                  {editingSection === section.id ? (
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={`edit-type-${section.id}`} className="block text-sm font-medium mb-1">Type</label>
                        <select
                          id={`edit-type-${section.id}`}
                          value={editForm.section_type}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, section_type: e.target.value }))}
                          className={cn(
                            "h-9 w-full rounded-md border bg-background px-3 text-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        >
                          {sectionTypes.map((st) => (
                            <option key={st.value} value={st.value}>{st.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`edit-title-${section.id}`} className="block text-sm font-medium mb-1">Title</label>
                        <input
                          id={`edit-title-${section.id}`}
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          className={cn(
                            "h-9 w-full rounded-md border bg-background px-3 text-sm",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-content-${section.id}`} className="block text-sm font-medium mb-1">Content</label>
                        <textarea
                          id={`edit-content-${section.id}`}
                          value={editForm.content}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                          rows={3}
                          className={cn(
                            "w-full rounded-md border bg-background px-3 py-2 text-sm resize-y",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium",
                            "hover:bg-accent",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                          aria-label="Cancel edit"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updateSectionMutation.mutate({ id: section.id, data: editForm })}
                          disabled={updateSectionMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
                            "hover:bg-primary/90",
                            "disabled:pointer-events-none disabled:opacity-50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          )}
                        >
                          {updateSectionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Save className="h-4 w-4" aria-hidden="true" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-xs font-medium",
                            "bg-primary/10 text-primary",
                          )}>
                            {section.section_type.charAt(0).toUpperCase() + section.section_type.slice(1)}
                          </span>
                          <h3 className="mt-1 font-medium">{section.title || "Untitled"}</h3>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(section)}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                            aria-label="Edit section"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => deleteSectionMutation.mutate(section.id)}
                            disabled={deleteSectionMutation.isPending}
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              "disabled:opacity-50",
                            )}
                            aria-label="Delete section"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      {section.content && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {section.content}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
