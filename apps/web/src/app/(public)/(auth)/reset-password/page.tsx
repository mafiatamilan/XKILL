"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { confirmPasswordReset } from "@/lib/api"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("No reset token provided.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <div role="alert" className="mt-8 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          No reset token provided. The link may be invalid or expired.
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-brand-600 hover:text-brand-500">
            Request a new reset link
          </Link>
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Password reset</h1>
        <div role="status" aria-live="polite" className="mt-8 space-y-4">
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Your password has been reset successfully.
          </div>
          <Link
            href="/login"
            className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your new password
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1 text-xs text-muted-foreground">
            At least 8 characters
          </p>
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  )
}
