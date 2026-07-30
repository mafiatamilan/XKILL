"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"

interface TestCaseResult {
  index: number
  verdict: string
  time_ms: number
  memory_kb: number
  input: string
  expected_output: string
  actual_output: string
}

interface SubmissionDetail {
  id: string
  problem_title: string
  problem_slug: string
  language: string
  code: string
  verdict: string
  error_message: string
  time_ms: number
  memory_kb: number
  test_cases: TestCaseResult[]
  created_at: string
}

const verdictBadge = (v: string) => {
  const map: Record<string, string> = {
    accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    wrong_answer: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    time_limit_exceeded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    compilation_error: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    runtime_error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }
  return map[v] || "bg-gray-100 text-gray-800"
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: sub, isLoading } = useQuery<SubmissionDetail>({
    queryKey: ["dsa-submission", id],
    queryFn: () => api(`/api/v1/dsa/submissions/${id}`),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!sub) return <div className="py-12 text-center text-muted-foreground">Submission not found.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submission Detail</h1>
          <p className="text-sm text-muted-foreground">
            Problem: {sub.problem_title} &middot; {new Date(sub.created_at).toLocaleString()}
          </p>
        </div>
        <span className={cn("rounded px-3 py-1 text-sm font-medium capitalize", verdictBadge(sub.verdict))}>
          {sub.verdict.replace(/_/g, " ")}
        </span>
      </div>

      {sub.error_message && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {sub.error_message}
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Code ({sub.language})</h2>
        <pre className="overflow-x-auto rounded-md bg-[#1e1e1e] p-4 font-mono text-sm text-white">
          <code>{sub.code}</code>
        </pre>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Test Cases</h2>
        <div className="space-y-2">
          {sub.test_cases?.map((tc) => (
            <details key={tc.index} className="rounded-md border">
              <summary className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm">
                <span>#{tc.index + 1}</span>
                <span className={cn("rounded px-2 py-0.5 text-xs capitalize", verdictBadge(tc.verdict))}>
                  {tc.verdict.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground">{tc.time_ms}ms / {(tc.memory_kb / 1024).toFixed(1)}MB</span>
              </summary>
              <div className="grid gap-4 border-t p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="font-medium">Input</p>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs">{tc.input}</pre>
                </div>
                <div>
                  <p className="font-medium">Expected Output</p>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs">{tc.expected_output}</pre>
                </div>
                <div>
                  <p className="font-medium">Actual Output</p>
                  <pre className="mt-1 rounded bg-muted p-2 text-xs">{tc.actual_output}</pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
