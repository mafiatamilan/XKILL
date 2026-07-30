"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shared/toast"
import { Loader2, Pencil, X, Check } from "lucide-react"

interface StudentProfile {
  id: string
  name: string
  email: string
  enrollment_number: string
  department: string
  batch: string
  date_of_birth: string
  gender: string
  city: string
  state: string
}

function SkeletonField() {
  return (
    <div className="space-y-1">
      <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<StudentProfile>>({})

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => api<StudentProfile>("/api/v1/student/profile"),
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StudentProfile>) =>
      api("/api/v1/student/profile", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] })
      toast("Profile updated successfully", "success")
      setEditing(false)
    },
    onError: () => toast("Failed to update profile", "error"),
  })

  const startEditing = () => {
    if (profile) {
      setForm({
        department: profile.department || "",
        enrollment_number: profile.enrollment_number || "",
        batch: profile.batch || "",
        date_of_birth: profile.date_of_birth || "",
        gender: profile.gender || "",
        city: profile.city || "",
        state: profile.state || "",
      })
    }
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setForm({})
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  const fields: { key: string; label: string; editable: boolean; type?: string }[] = [
    { key: "department", label: "Department", editable: true },
    { key: "enrollment_number", label: "Enrollment Number", editable: true },
    { key: "batch", label: "Batch", editable: true },
    { key: "date_of_birth", label: "Date of Birth", editable: true, type: "date" },
    { key: "gender", label: "Gender", editable: true },
    { key: "city", label: "City", editable: true },
    { key: "state", label: "State", editable: true },
  ]

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Student Profile</h1>
        <p className="text-red-500" role="alert">Failed to load profile.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal and academic information
          </p>
        </div>
        {!editing && !isLoading && (
          <button
            onClick={startEditing}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Edit profile"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-lg border p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-56 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonField key={i} />)}
          </div>
        </div>
      ) : profile ? (
        <form onSubmit={handleSubmit} className="rounded-lg border p-6">
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary"
              aria-hidden="true"
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`profile-${field.key}`}
                  className="block text-sm font-medium mb-1"
                >
                  {field.label}
                </label>
                {editing && field.editable ? (
                  field.key === "gender" ? (
                    <select
                      id={`profile-${field.key}`}
                      value={(form[field.key as keyof typeof form] as string) ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={cn(
                        "h-9 w-full rounded-md border bg-background px-3 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      aria-label={field.label}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <input
                      id={`profile-${field.key}`}
                      type={field.type ?? "text"}
                      value={(form[field.key as keyof typeof form] as string) ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className={cn(
                        "h-9 w-full rounded-md border bg-background px-3 text-sm",
                        "placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                      aria-label={field.label}
                    />
                  )
                ) : (
                  <p className="h-9 rounded-md border bg-muted/30 px-3 text-sm leading-9">
                    {(profile[field.key as keyof StudentProfile] as string) || "\u2014"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {editing && (
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onClick={cancelEditing}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:pointer-events-none disabled:opacity-50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4" aria-hidden="true" />
                )}
                Save
              </button>
            </div>
          )}
        </form>
      ) : null}
    </div>
  )
}
