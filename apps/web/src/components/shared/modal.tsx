"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@xkill/design-system"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"

      requestAnimationFrame(() => {
        const dialog = dialogRef.current
        if (dialog) {
          const firstFocusable = dialog.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          )
          firstFocusable?.focus()
        }
      })

      return () => {
        document.removeEventListener("keydown", handleKeyDown)
        document.body.style.overflow = ""
        previousActiveElement.current?.focus()
      }
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg",
          "max-h-[85vh] overflow-y-auto",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
