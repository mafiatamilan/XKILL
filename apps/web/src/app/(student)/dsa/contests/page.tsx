"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"

interface Contest {
  id: string
  title: string
  type: string
  status: string
  start_time: string
  end_time: string
  is_registered: boolean
}

function Countdown({ target }: { target: string }) {
  const [remaining, setRemaining] = useState("")

  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setRemaining("Started"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])

  return <span className="font-mono text-sm">{remaining}</span>
}

export default function ContestListPage() {
  const { data, isLoading } = useQuery<{ data: Contest[] }>({
    queryKey: ["dsa-contests"],
    queryFn: () => api("/api/v1/dsa/contests"),
  })

  const registerMutation = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/dsa/contests/${id}/register`, { method: "POST" }),
  })

  const statusBadge = (s: string) => {
    switch (s) {
      case "upcoming": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "ongoing": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "past": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      default: return ""
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contests</h1>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No contests yet.</div>
      )}

      <div className="space-y-4">
        {data?.data.map((c) => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/student/dsa/contests/${c.id}`} className="text-lg font-medium text-primary hover:underline">
                  {c.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-medium capitalize", statusBadge(c.status))}>
                    {c.status}
                  </span>
                  <span className="capitalize">{c.type}</span>
                  <span>{new Date(c.start_time).toLocaleDateString()} - {new Date(c.end_time).toLocaleDateString()}</span>
                  {c.status === "upcoming" && <Countdown target={c.start_time} />}
                </div>
              </div>
              {c.status === "upcoming" && !c.is_registered && (
                <button
                  onClick={() => registerMutation.mutate(c.id)}
                  disabled={registerMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  Register
                </button>
              )}
              {c.is_registered && (
                <span className="rounded bg-muted px-3 py-1 text-sm text-muted-foreground">Registered</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
