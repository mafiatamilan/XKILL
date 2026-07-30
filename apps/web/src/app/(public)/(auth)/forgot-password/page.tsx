"use client"

import { useState } from "react"
import Link from "next/link"
import { requestPasswordReset } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <div role="status" aria-live="polite" className="mt-8 rounded-md bg-green-50 p-3 text-sm text-green-800">
          If that email is registered, you&apos;ll receive a reset link.
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-brand-600 hover:text-brand-500">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link
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
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send reset link"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-brand-600 hover:text-brand-500">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
