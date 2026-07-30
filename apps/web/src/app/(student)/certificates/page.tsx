"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shared/toast"
import { Modal } from "@/components/shared/modal"
import { Loader2, Plus, Trash2, CheckCircle, XCircle, Upload, Award } from "lucide-react"

interface Certificate {
  id: string
  title: string
  issuer: string
  category: string
  issue_date: string
  expiry_date?: string
  credential_id?: string
  credential_url?: string
  file_url?: string
  is_verified: boolean
  user_id: string
}

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={cn("h-4 animate-pulse rounded bg-muted", i === 0 ? "w-1/2" : "w-3/4")} />
        </td>
      ))}
    </tr>
  )
}

export default function CertificatesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "",
    issuer: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    file_url: "",
    category: "",
  })

  const { data: certificates, isLoading, error } = useQuery({
    queryKey: ["certificates"],
    queryFn: () => api<Certificate[]>("/api/v1/certificates"),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api("/api/v1/certificates", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] })
      toast("Certificate added", "success")
      setShowForm(false)
      setForm({ title: "", issuer: "", issue_date: "", expiry_date: "", credential_id: "", credential_url: "", file_url: "", category: "" })
    },
    onError: () => toast("Failed to add certificate", "error"),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/v1/certificates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] })
      toast("Certificate deleted", "success")
    },
    onError: () => toast("Failed to delete certificate", "error"),
  })

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.issuer.trim() || !form.issue_date) {
      toast("Title, issuer, and issue date are required", "error")
      return
    }
    createMutation.mutate(form)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your certificates and achievements
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Add certificate"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Certificate
        </button>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Certificate">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cert-title" className="block text-sm font-medium mb-1">Title *</label>
            <input
              id="cert-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Certificate title"
            />
          </div>
          <div>
            <label htmlFor="cert-issuer" className="block text-sm font-medium mb-1">Issuer *</label>
            <input
              id="cert-issuer"
              type="text"
              value={form.issuer}
              onChange={(e) => handleChange("issuer", e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Certificate issuer"
            />
          </div>
          <div>
            <label htmlFor="cert-category" className="block text-sm font-medium mb-1">Category</label>
            <select
              id="cert-category"
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Certificate category"
            >
              <option value="">Select category</option>
              <option value="technical">Technical</option>
              <option value="soft-skills">Soft Skills</option>
              <option value="internship">Internship</option>
              <option value="project">Project</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cert-issue-date" className="block text-sm font-medium mb-1">Issue Date *</label>
              <input
                id="cert-issue-date"
                type="date"
                value={form.issue_date}
                onChange={(e) => handleChange("issue_date", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
            <div>
              <label htmlFor="cert-expiry-date" className="block text-sm font-medium mb-1">Expiry Date</label>
              <input
                id="cert-expiry-date"
                type="date"
                value={form.expiry_date}
                onChange={(e) => handleChange("expiry_date", e.target.value)}
                className={cn(
                  "h-9 w-full rounded-md border bg-background px-3 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
          </div>
          <div>
            <label htmlFor="cert-credential-id" className="block text-sm font-medium mb-1">Credential ID</label>
            <input
              id="cert-credential-id"
              type="text"
              value={form.credential_id}
              onChange={(e) => handleChange("credential_id", e.target.value)}
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </div>
          <div>
            <label htmlFor="cert-credential-url" className="block text-sm font-medium mb-1">Credential URL</label>
            <input
              id="cert-credential-url"
              type="url"
              value={form.credential_url}
              onChange={(e) => handleChange("credential_url", e.target.value)}
              placeholder="https://"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            />
          </div>
          <div>
            <label htmlFor="cert-file-url" className="block text-sm font-medium mb-1">File URL</label>
            <input
              id="cert-file-url"
              type="url"
              value={form.file_url}
              onChange={(e) => handleChange("file_url", e.target.value)}
              placeholder="https://"
              className={cn(
                "h-9 w-full rounded-md border bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
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
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              Add Certificate
            </button>
          </div>
        </form>
      </Modal>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load certificates.
        </div>
      )}

      <div className="overflow-x-auto" role="region" aria-label="Certificates table">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr role="row">
              {["Title", "Issuer", "Category", "Status", "Issue Date", ""].map((label) => (
                <th key={label} scope="col" className="border-b px-4 py-3 text-left font-medium text-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : certificates && certificates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground" role="status">
                  <Award className="mx-auto h-8 w-8 mb-2" aria-hidden="true" />
                  No certificates yet. Add one to showcase your achievements.
                </td>
              </tr>
            ) : (
              (certificates ?? []).map((cert) => (
                <tr key={cert.id} className="border-b transition-colors hover:bg-muted/50" role="row">
                  <td className="px-4 py-3 font-medium">{cert.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cert.issuer}</td>
                  <td className="px-4 py-3">
                    {cert.category && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {cert.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {cert.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(cert.issue_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {cert.user_id === user?.id && (
                      <button
                        onClick={() => deleteMutation.mutate(cert.id)}
                        disabled={deleteMutation.isPending}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:opacity-50",
                        )}
                        aria-label={`Delete ${cert.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
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
