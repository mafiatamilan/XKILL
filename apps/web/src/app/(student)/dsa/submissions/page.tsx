"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"

interface Submission {
  id: string
  problem_title: string
  problem_slug: string
  language: string
  verdict: string
  time_ms: number
  memory_kb: number
  created_at: string
}

interface ListResponse {
  data: Submission[]
  next_cursor: string
}

const verdictColor = (v: string) => {
  switch (v) {
    case "accepted": return "text-green-600 dark:text-green-400"
    case "wrong_answer": return "text-red-600 dark:text-red-400"
    case "time_limit_exceeded": return "text-yellow-600 dark:text-yellow-400"
    case "compilation_error": return "text-orange-600 dark:text-orange-400"
    case "runtime_error": return "text-red-600 dark:text-red-400"
    default: return "text-muted-foreground"
  }
}

export default function SubmissionsPage() {
  const [verdict, setVerdict] = useState("")
  const [cursor, setCursor] = useState("")

  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["dsa-submissions", verdict, cursor],
    queryFn: () => {
      const params = new URLSearchParams()
      if (verdict) params.set("verdict", verdict)
      if (cursor) params.set("cursor", cursor)
      params.set("limit", "20")
      return api(`/api/v1/dsa/submissions?${params}`)
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Submissions</h1>

      <select
        aria-label="Filter by verdict"
        value={verdict}
        onChange={(e) => { setVerdict(e.target.value); setCursor("") }}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">All Verdicts</option>
        <option value="accepted">Accepted</option>
        <option value="wrong_answer">Wrong Answer</option>
        <option value="time_limit_exceeded">Time Limit Exceeded</option>
        <option value="compilation_error">Compilation Error</option>
        <option value="runtime_error">Runtime Error</option>
      </select>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No submissions yet.</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Submissions table">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 font-medium">Problem</th>
              <th className="pb-2 font-medium">Language</th>
              <th className="pb-2 font-medium">Verdict</th>
              <th className="pb-2 font-medium">Time</th>
              <th className="pb-2 font-medium">Memory</th>
              <th className="pb-2 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((s) => (
              <tr key={s.id} className="border-b hover:bg-muted/50">
                <td className="py-3">
                  <Link href={`/student/dsa/problems/${s.problem_slug}`} className="text-primary hover:underline">
                    {s.problem_title}
                  </Link>
                </td>
                <td className="py-3 capitalize">{s.language}</td>
                <td className={cn("py-3 font-medium capitalize", verdictColor(s.verdict))}>{s.verdict.replace(/_/g, " ")}</td>
                <td className="py-3 text-muted-foreground">{s.time_ms}ms</td>
                <td className="py-3 text-muted-foreground">{(s.memory_kb / 1024).toFixed(1)}MB</td>
                <td className="py-3 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.next_cursor && (
        <div className="flex justify-center">
          <button
            onClick={() => setCursor(data.next_cursor)}
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
