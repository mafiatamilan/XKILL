"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"

interface Problem {
  id: string
  title: string
  slug: string
  difficulty: string
  topics: string[]
  total_submissions: number
  accepted_submissions: number
}

interface ListResponse {
  data: Problem[]
  next_cursor: string
}

const difficulties = ["all", "easy", "medium", "hard"]
const topicsList = [
  "arrays", "strings", "linked-lists", "trees", "graphs",
  "dynamic-programming", "sorting", "searching", "recursion",
]

export default function DSAProblemList() {
  const [difficulty, setDifficulty] = useState("all")
  const [topic, setTopic] = useState("")
  const [search, setSearch] = useState("")
  const [cursor, setCursor] = useState("")

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["dsa-problems", difficulty, topic, search, cursor],
    queryFn: () => {
      const params = new URLSearchParams()
      if (difficulty !== "all") params.set("difficulty", difficulty)
      if (topic) params.set("topic", topic)
      if (search) params.set("search", search)
      if (cursor) params.set("cursor", cursor)
      params.set("limit", "20")
      return api(`/api/v1/dsa/problems?${params}`)
    },
  })

  const difficultyColor = (d: string) => {
    switch (d) {
      case "easy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "hard": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">DSA Problems</h1>

      <div className="flex flex-wrap gap-4">
        <input
          type="search"
          placeholder="Search problems..."
          aria-label="Search problems"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCursor("") }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2" role="group" aria-label="Difficulty filter">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); setCursor("") }}
              className={cn(
                "rounded-md px-3 py-1 text-sm capitalize",
                difficulty === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
              aria-pressed={difficulty === d}
            >
              {d}
            </button>
          ))}
        </div>
        <select
          aria-label="Filter by topic"
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setCursor("") }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Topics</option>
          {topicsList.map((t) => (
            <option key={t} value={t}>{t.replace("-", " ")}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No problems found. Try adjusting your filters.
        </div>
      )}

      <div className="space-y-3">
        {data?.data.map((p) => {
          const rate = p.total_submissions > 0
            ? Math.round((p.accepted_submissions / p.total_submissions) * 100)
            : 0
          return (
            <Link
              key={p.id}
              href={`/student/dsa/problems/${p.slug}`}
              className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">{p.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className={cn("rounded px-2 py-0.5 text-xs font-medium", difficultyColor(p.difficulty))}>
                      {p.difficulty}
                    </span>
                    {p.topics?.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{rate}% acceptance</div>
                  <div>{p.total_submissions} submissions</div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {data?.next_cursor && (
        <div className="flex justify-center gap-4">
          {cursor && (
            <button
              onClick={() => setCursor("")}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              First page
            </button>
          )}
          <button
            onClick={() => setCursor(data.next_cursor)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Next page
          </button>
        </div>
      )}
    </div>
  )
}
