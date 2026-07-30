"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import { cn } from "@xkill/design-system"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-blue-500" aria-hidden="true" />,
}

const styles: Record<ToastVariant, string> = {
  success: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
  error: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
  info: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950",
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-sm",
        "animate-in slide-in-from-top-2",
        styles[t.variant],
      )}
    >
      {icons[t.variant]}
      <span className="flex-1">{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded",
          "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      setToasts((prev) => [...prev, { id, message, variant }])
      const timer = setTimeout(() => dismiss(id), 3000)
      timersRef.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
