"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2, X, Plus } from "lucide-react"

interface Company {
  id: string
  name: string
  verified: boolean
}

export default function CreateJobPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [skillInput, setSkillInput] = useState("")

  const [form, setForm] = useState({
    company_id: "",
    title: "",
    description: "",
    location: "",
    job_type: "full-time",
    salary_min: "",
    salary_max: "",
    skills: [] as string[],
    experience_years: "",
    deadline: "",
  })

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["my-companies"],
    queryFn: () => api("/api/v1/companies"),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api("/api/v1/jobs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast("Job created successfully", "success")
      router.push("/recruiter/jobs")
    },
    onError: () => toast("Failed to create job", "error"),
  })

  const handleAddSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }))
      setSkillInput("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      location: form.location,
      job_type: form.job_type,
      skills: form.skills,
    }
    if (form.company_id) payload.company_id = form.company_id
    if (form.salary_min) payload.salary_min = Number(form.salary_min)
    if (form.salary_max) payload.salary_max = Number(form.salary_max)
    if (form.experience_years) payload.experience_years = Number(form.experience_years)
    if (form.deadline) payload.deadline = form.deadline
    createMutation.mutate(payload)
  }

  const fieldClass = cn(
    "h-10 w-full rounded-md border bg-background px-3 py-2 text-sm",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  )

  const labelClass = "block text-sm font-medium mb-1"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Job Posting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details to post a new job opening
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border p-6">
        <div>
          <label htmlFor="company_id" className={labelClass}>Company</label>
          <select
            id="company_id"
            value={form.company_id}
            onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}
            className={fieldClass}
            aria-label="Select company"
          >
            <option value="">Select a company</option>
            {(companies ?? []).filter((c) => c.verified).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className={labelClass}>Job Title *</label>
          <input
            id="title"
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Senior Software Engineer"
            aria-label="Job title"
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Description *</label>
          <textarea
            id="description"
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className={cn(fieldClass, "h-auto min-h-[100px] resize-y py-2")}
            placeholder="Describe the role, responsibilities, and expectations..."
            aria-label="Job description"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="location" className={labelClass}>Location</label>
            <input
              id="location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. Bangalore, India"
              aria-label="Job location"
            />
          </div>
          <div>
            <label htmlFor="job_type" className={labelClass}>Job Type *</label>
            <select
              id="job_type"
              required
              value={form.job_type}
              onChange={(e) => setForm((p) => ({ ...p, job_type: e.target.value }))}
              className={fieldClass}
              aria-label="Job type"
            >
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="salary_min" className={labelClass}>Salary Min (in INR)</label>
            <input
              id="salary_min"
              type="number"
              min="0"
              value={form.salary_min}
              onChange={(e) => setForm((p) => ({ ...p, salary_min: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 600000"
              aria-label="Minimum salary"
            />
          </div>
          <div>
            <label htmlFor="salary_max" className={labelClass}>Salary Max (in INR)</label>
            <input
              id="salary_max"
              type="number"
              min="0"
              value={form.salary_max}
              onChange={(e) => setForm((p) => ({ ...p, salary_max: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 1200000"
              aria-label="Maximum salary"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Skills</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill() } }}
              className={cn(fieldClass, "flex-1")}
              placeholder="Type a skill and press Enter"
              aria-label="Add skill"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-md border",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Add skill"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {form.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {form.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-sm">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-muted-foreground/20"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="experience_years" className={labelClass}>Experience Required (years)</label>
            <input
              id="experience_years"
              type="number"
              min="0"
              value={form.experience_years}
              onChange={(e) => setForm((p) => ({ ...p, experience_years: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 2"
              aria-label="Years of experience required"
            />
          </div>
          <div>
            <label htmlFor="deadline" className={labelClass}>Application Deadline</label>
            <input
              id="deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className={fieldClass}
              aria-label="Application deadline date"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => router.back()}
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
            disabled={createMutation.isPending || !form.title || !form.description}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:pointer-events-none disabled:opacity-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Post Job
          </button>
        </div>
      </form>
    </div>
  )
}
