"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2, Plus, Trash2, ChevronLeft } from "lucide-react"

interface Template {
  id: string
  name: string
}

interface Section {
  section_type: string
  title: string
  content: string
}

const sectionTypes = [
  { value: "education", label: "Education" },
  { value: "experience", label: "Experience" },
  { value: "skills", label: "Skills" },
  { value: "projects", label: "Projects" },
  { value: "certifications", label: "Certifications" },
]

export default function CreateResumePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [fileUrl, setFileUrl] = useState("")
  const [sections, setSections] = useState<Section[]>([])

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["resume-templates"],
    queryFn: () => api<Template[]>("/api/v1/resumes/templates"),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; template_id: string; file_url: string; sections: Section[] }) =>
      api("/api/v1/resumes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast("Resume created successfully", "success")
      router.push("/resume")
    },
    onError: () => toast("Failed to create resume", "error"),
  })

  const addSection = () => {
    setSections((prev) => [...prev, { section_type: "education", title: "", content: "" }])
  }

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSection = (index: number, field: keyof Section, value: string) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast("Title is required", "error")
      return
    }
    createMutation.mutate({ title, template_id: templateId, file_url: fileUrl, sections })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => router.back()}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        )}
        aria-label="Go back"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">Create Resume</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build a new resume with sections
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border p-5 space-y-4">
          <h2 className="text-lg font-semibold">Basic Information</h2>

          <div>
            <label htmlFor="resume-title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <input
              id="resume-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineer Resume"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Resume title"
            />
          </div>

          <div>
            <label htmlFor="resume-template" className="block text-sm font-medium mb-1">
              Template
            </label>
            <select
              id="resume-template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Select template"
            >
              <option value="">Select a template</option>
              {templatesLoading ? (
                <option disabled>Loading templates...</option>
              ) : (
                (templates ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="resume-file-url" className="block text-sm font-medium mb-1">
              File URL (optional)
            </label>
            <input
              id="resume-file-url"
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://example.com/resume.pdf"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="File URL"
            />
          </div>
        </div>

        <div className="rounded-lg border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sections</h2>
            <button
              type="button"
              onClick={addSection}
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

          {sections.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sections added yet. Click &quot;Add Section&quot; to get started.
            </p>
          )}

          {sections.map((section, index) => (
            <div key={index} className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Section {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600",
                    "hover:bg-red-50 dark:hover:bg-red-950",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Remove section ${index + 1}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>

              <div>
                <label htmlFor={`section-type-${index}`} className="block text-sm font-medium mb-1">
                  Type
                </label>
                <select
                  id={`section-type-${index}`}
                  value={section.section_type}
                  onChange={(e) => updateSection(index, "section_type", e.target.value)}
                  className={cn(
                    "h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Section ${index + 1} type`}
                >
                  {sectionTypes.map((st) => (
                    <option key={st.value} value={st.value}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`section-title-${index}`} className="block text-sm font-medium mb-1">
                  Title
                </label>
                <input
                  id={`section-title-${index}`}
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(index, "title", e.target.value)}
                  placeholder="Section title"
                  className={cn(
                    "h-9 w-full rounded-md border bg-background px-3 text-sm",
                    "placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Section ${index + 1} title`}
                />
              </div>

              <div>
                <label htmlFor={`section-content-${index}`} className="block text-sm font-medium mb-1">
                  Content
                </label>
                <textarea
                  id={`section-content-${index}`}
                  value={section.content}
                  onChange={(e) => updateSection(index, "content", e.target.value)}
                  placeholder="Describe your experience, skills, etc."
                  rows={4}
                  className={cn(
                    "w-full rounded-md border bg-background px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground resize-y",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={`Section ${index + 1} content`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
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
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Create Resume
          </button>
        </div>
      </form>
    </div>
  )
}
