"use client"

import { useQuery, useMutation } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useState, useEffect } from "react"

interface ContestDetail {
  id: string
  title: string
  type: string
  status: string
  start_time: string
  end_time: string
  is_registered: boolean
  problems: { id: string; title: string; slug: string; points: number }[]
}

function Timer({ target }: { target: string }) {
  const [remaining, setRemaining] = useState("")
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setRemaining("Ended"); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return <span className="font-mono text-lg">{remaining}</span>
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<"problems" | "leaderboard">("problems")

  const { data: contest, isLoading } = useQuery<ContestDetail>({
    queryKey: ["dsa-contest", id],
    queryFn: () => api(`/api/v1/dsa/contests/${id}`),
  })

  const registerMutation = useMutation({
    mutationFn: () => api(`/api/v1/dsa/contests/${id}/register`, { method: "POST" }),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!contest) return <div className="py-12 text-center text-muted-foreground">Contest not found.</div>

  const isOngoing = contest.status === "ongoing" || (new Date(contest.start_time) <= new Date() && new Date(contest.end_time) >= new Date())

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contest.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="capitalize">{contest.type}</span>
            <span>{new Date(contest.start_time).toLocaleDateString()} - {new Date(contest.end_time).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOngoing && <Timer target={contest.end_time} />}
          {!contest.is_registered && contest.status === "upcoming" && (
            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Register
            </button>
          )}
          {contest.is_registered && (
            <span className="rounded bg-muted px-3 py-1 text-sm text-muted-foreground">Registered</span>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Contest sections" className="flex gap-2 border-b">
        <button
          role="tab"
          aria-selected={tab === "problems"}
          onClick={() => setTab("problems")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium",
            tab === "problems" ? "border-primary text-primary" : "border-transparent text-muted-foreground",
          )}
        >
          Problems
        </button>
        <button
          role="tab"
          aria-selected={tab === "leaderboard"}
          onClick={() => setTab("leaderboard")}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium",
            tab === "leaderboard" ? "border-primary text-primary" : "border-transparent text-muted-foreground",
          )}
        >
          Leaderboard
        </button>
      </div>

      {tab === "problems" && (
        <div className="space-y-2">
          {contest.problems?.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-medium">{i + 1}</span>
                <Link href={`/student/dsa/problems/${p.slug}`} className="text-primary hover:underline">
                  {p.title}
                </Link>
              </div>
              <span className="text-sm text-muted-foreground">{p.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {tab === "leaderboard" && (
        <iframe
          src={`/student/dsa/contests/${id}/leaderboard`}
          className="h-[600px] w-full rounded-md border"
          title="Leaderboard"
        />
      )}
    </div>
  )
}
