"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"

export default function TwoFactorSetupPage() {
  const [secret, setSecret] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "done">("loading")
  const [showSecret, setShowSecret] = useState(false)
  const { setup2FA, verify2FA } = useAuth()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setup2FA()
      .then((data) => {
        setSecret(data.secret)
        setQrCodeUrl(data.qr_code_url)
        setStep("setup")
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load setup")
        setStep("setup")
      })
  }, [setup2FA])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (code.length !== 6) {
      setError("Please enter a 6-digit code.")
      return
    }

    try {
      await verify2FA(code)
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
      setCode("")
      inputRef.current?.focus()
    }
  }

  if (step === "loading") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Set up two-factor authentication</h1>
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (step === "done") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-2xl font-bold">Two-factor enabled</h1>
        <div role="status" aria-live="polite" className="mt-8 space-y-4">
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
            Two-factor authentication has been enabled for your account.
          </div>
          <button
            onClick={() => router.push("/")}
            className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Set up two-factor authentication</h1>

      {step === "setup" && (
        <div className="mt-8 space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR code for authenticator app"
              className="h-48 w-48"
            />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Scan this QR code with your authenticator app, or enter the secret manually.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="text-sm text-brand-600 hover:text-brand-500"
            >
              {showSecret ? "Hide secret" : "Enter secret manually"}
            </button>
          </div>

          {showSecret && (
            <div
              role="region"
              aria-label="Manual secret entry"
              className="rounded-md bg-muted p-3 text-center"
            >
              <p className="text-xs text-muted-foreground">Secret key</p>
              <p className="mt-1 font-mono text-sm tracking-wider" aria-label={`Secret: ${secret}`}>
                {secret}
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setStep("verify")
              setError("")
            }}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            I&apos;ve scanned the code
          </button>
        </div>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerify} className="mt-8 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="setup-code" className="block text-sm font-medium">
              Verify with a 6-digit code
            </label>
            <input
              ref={inputRef}
              id="setup-code"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
          >
            Verify and enable
          </button>
        </form>
      )}
    </div>
  )
}
