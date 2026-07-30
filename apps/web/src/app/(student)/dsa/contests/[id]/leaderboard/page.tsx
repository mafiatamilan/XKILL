"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useEffect } from "react"

interface LeaderboardEntry {
  rank: number
  user_name: string
  score: number
  penalty: number
  solved_count: number
}

export default function ContestLeaderboardPage() {
  const { id } = useParams<{ id: string }>()

  const { data, refetch } = useQuery<{ data: LeaderboardEntry[] }>({
    queryKey: ["dsa-leaderboard", id],
    queryFn: () => api(`/api/v1/dsa/contests/${id}/leaderboard`),
  })

  useEffect(() => {
    const id = setInterval(refetch, 30000)
    return () => clearInterval(id)
  }, [refetch])

  if (!data) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Contest leaderboard">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Rank</th>
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Score</th>
              <th className="pb-2 font-medium">Penalty</th>
              <th className="pb-2 font-medium">Solved</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((e) => (
              <tr key={e.rank} className="border-b hover:bg-muted/50">
                <td className={cn("py-3 font-medium", e.rank <= 3 ? "text-primary" : "")}>
                  {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`}
                </td>
                <td className="py-3">{e.user_name}</td>
                <td className="py-3 font-medium">{e.score}</td>
                <td className="py-3 text-muted-foreground">{e.penalty}</td>
                <td className="py-3 text-muted-foreground">{e.solved_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
