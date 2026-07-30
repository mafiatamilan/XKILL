"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useToast } from "@/components/shared/toast"
import { Loader2 } from "lucide-react"

interface Company {
  id: string
  name: string
  verified: boolean
}

const branchOptions = [
  "Computer Science", "Information Technology", "Electronics",
  "Electrical", "Mechanical", "Civil", "Chemical", "Biotechnology",
]

const yearOptions = [1, 2, 3, 4]

export default function CreateDrivePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [form, setForm] = useState({
    company_id: "",
    company_name: "",
    role: "",
    package_min: "",
    package_max: "",
    location: "",
    description: "",
    drive_date: "",
    deadline: "",
    min_cgpa: "",
    max_backlogs: "",
    allowed_branches: [] as string[],
    allowed_years: [] as number[],
  })

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["tpo-companies-list"],
    queryFn: () => api("/api/v1/companies"),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api("/api/v1/placement/drives", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast("Drive created successfully", "success")
      router.push("/tpo/drives")
    },
    onError: () => toast("Failed to create drive", "error"),
  })

  const toggleBranch = (branch: string) => {
    setForm((prev) => ({
      ...prev,
      allowed_branches: prev.allowed_branches.includes(branch)
        ? prev.allowed_branches.filter((b) => b !== branch)
        : [...prev.allowed_branches, branch],
    }))
  }

  const toggleYear = (year: number) => {
    setForm((prev) => ({
      ...prev,
      allowed_years: prev.allowed_years.includes(year)
        ? prev.allowed_years.filter((y) => y !== year)
        : [...prev.allowed_years, year],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      role: form.role,
      location: form.location,
      description: form.description,
      drive_date: form.drive_date,
      deadline: form.deadline,
    }
    if (form.company_id) payload.company_id = form.company_id
    if (form.company_name) payload.company_name = form.company_name
    if (form.package_min) payload.package_min = Number(form.package_min)
    if (form.package_max) payload.package_max = Number(form.package_max)
    if (form.min_cgpa) payload.min_cgpa = Number(form.min_cgpa)
    if (form.max_backlogs) payload.max_backlogs = Number(form.max_backlogs)
    if (form.allowed_branches.length > 0) payload.allowed_branches = form.allowed_branches
    if (form.allowed_years.length > 0) payload.allowed_years = form.allowed_years
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
        <h1 className="text-2xl font-bold">Create Placement Drive</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule a new placement drive
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border p-6">
        <div>
          <label htmlFor="company_id" className={labelClass}>Company *</label>
          <select
            id="company_id"
            required
            value={form.company_id}
            onChange={(e) => {
              const company = (companies ?? []).find((c) => c.id === e.target.value)
              setForm((p) => ({
                ...p,
                company_id: e.target.value,
                company_name: company?.name ?? "",
              }))
            }}
            className={fieldClass}
            aria-label="Select company"
          >
            <option value="">Select a verified company</option>
            {(companies ?? []).filter((c) => c.verified).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="role" className={labelClass}>Role *</label>
            <input
              id="role"
              required
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. Software Engineer"
              aria-label="Role title"
            />
          </div>
          <div>
            <label htmlFor="location" className={labelClass}>Location</label>
            <input
              id="location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. Bangalore"
              aria-label="Drive location"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="package_min" className={labelClass}>Package Min (LPA)</label>
            <input
              id="package_min"
              type="number"
              min="0"
              step="0.1"
              value={form.package_min}
              onChange={(e) => setForm((p) => ({ ...p, package_min: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 8"
              aria-label="Minimum package in LPA"
            />
          </div>
          <div>
            <label htmlFor="package_max" className={labelClass}>Package Max (LPA)</label>
            <input
              id="package_max"
              type="number"
              min="0"
              step="0.1"
              value={form.package_max}
              onChange={(e) => setForm((p) => ({ ...p, package_max: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 15"
              aria-label="Maximum package in LPA"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>Description</label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className={cn(fieldClass, "h-auto min-h-[100px] resize-y py-2")}
            placeholder="Describe the drive details..."
            aria-label="Drive description"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="drive_date" className={labelClass}>Drive Date *</label>
            <input
              id="drive_date"
              type="date"
              required
              value={form.drive_date}
              onChange={(e) => setForm((p) => ({ ...p, drive_date: e.target.value }))}
              className={fieldClass}
              aria-label="Drive date"
            />
          </div>
          <div>
            <label htmlFor="deadline" className={labelClass}>Application Deadline *</label>
            <input
              id="deadline"
              type="date"
              required
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className={fieldClass}
              aria-label="Application deadline"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="min_cgpa" className={labelClass}>Minimum CGPA</label>
            <input
              id="min_cgpa"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={form.min_cgpa}
              onChange={(e) => setForm((p) => ({ ...p, min_cgpa: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 7.0"
              aria-label="Minimum CGPA required"
            />
          </div>
          <div>
            <label htmlFor="max_backlogs" className={labelClass}>Max Backlogs</label>
            <input
              id="max_backlogs"
              type="number"
              min="0"
              value={form.max_backlogs}
              onChange={(e) => setForm((p) => ({ ...p, max_backlogs: e.target.value }))}
              className={fieldClass}
              placeholder="e.g. 2"
              aria-label="Maximum backlogs allowed"
            />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Allowed Branches</legend>
          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Select allowed branches">
            {branchOptions.map((branch) => {
              const selected = form.allowed_branches.includes(branch)
              return (
                <button
                  key={branch}
                  type="button"
                  onClick={() => toggleBranch(branch)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Remove" : "Add"} ${branch}`}
                >
                  {branch}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Allowed Years</legend>
          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Select allowed years">
            {yearOptions.map((year) => {
              const selected = form.allowed_years.includes(year)
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Remove" : "Add"} Year ${year}`}
                >
                  Year {year}
                </button>
              )
            })}
          </div>
        </fieldset>

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
            disabled={createMutation.isPending || !form.role || !form.drive_date || !form.deadline}
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
            Create Drive
          </button>
        </div>
      </form>
    </div>
  )
}
