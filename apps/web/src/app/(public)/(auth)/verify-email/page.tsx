"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { verifyEmail } from "@/lib/api"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token provided.")
      return
    }
    setStatus("loading")
    verifyEmail(token)
      .then(() => {
        setStatus("success")
        setMessage("Email verified successfully!")
      })
      .catch((err) => {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Verification failed")
      })
  }, [token])

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Verify Email</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirming your email address
      </p>

      <div aria-live="polite" className="mt-8">
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Verifying your email…</p>
        )}

        {status === "success" && (
          <div role="status" className="space-y-4">
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
            <Link
              href="/login"
              className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Sign in
            </Link>
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {message}
            </div>
            <Link
              href="/login"
              className="text-sm text-brand-600 hover:text-brand-500"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
