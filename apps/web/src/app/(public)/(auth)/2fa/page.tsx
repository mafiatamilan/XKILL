"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"

export default function TwoFactorChallengePage() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [useBackup, setUseBackup] = useState(false)
  const { tempToken, verify2FAChallenge } = useAuth()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (code.length !== 6) {
      setError("Please enter a 6-digit code.")
      return
    }

    if (!tempToken) {
      setError("Session expired. Please sign in again.")
      return
    }

    setIsSubmitting(true)
    try {
      await verify2FAChallenge(code)
      router.push("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code")
      setCode("")
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Two-factor authentication</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the code from your authenticator app
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
          <label htmlFor="2fa-code" className="block text-sm font-medium">
            {useBackup ? "Backup code" : "Authentication code"}
          </label>
          <input
            ref={inputRef}
            id="2fa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={useBackup ? 16 : 6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-describedby="code-hint"
          />
          <p id="code-hint" className="mt-1 text-xs text-muted-foreground">
            {useBackup ? "Enter one of your backup codes" : "6-digit code"}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? "Verifying…" : "Verify"}
        </button>

        <button
          type="button"
          onClick={() => {
            setUseBackup(!useBackup)
            setCode("")
            setError("")
            inputRef.current?.focus()
          }}
          className="w-full text-center text-sm text-brand-600 hover:text-brand-500"
        >
          {useBackup ? "Use authenticator code instead" : "Use a backup code instead"}
        </button>
      </form>
    </div>
  )
}
