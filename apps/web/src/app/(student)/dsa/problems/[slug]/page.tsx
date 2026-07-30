"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"

interface ProblemDetail {
  id: string
  title: string
  slug: string
  difficulty: string
  description: string
  input_format: string
  output_format: string
  constraints: string
  sample_input: string
  sample_output: string
  time_limit_ms: number
  memory_limit_mb: number
  topics: string[]
}

const defaultCodes: Record<string, string> = {
  python: "def solution():\n    pass\n\nif __name__ == '__main__':\n    print(solution())",
  javascript: "function solution() {\n    // your code\n}\n\nconsole.log(solution());",
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello" << endl;\n    return 0;\n}',
  java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello\");\n    }\n}",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}',
  rust: 'fn main() {\n    println!("Hello");\n}',
}

type Tab = "description" | "editorial" | "discussion" | "submissions" | "hints"

export default function ProblemDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [activeTab, setActiveTab] = useState<Tab>("description")
  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState(defaultCodes.python)
  const [output, setOutput] = useState("")

  const { data: problem, isLoading } = useQuery<ProblemDetail>({
    queryKey: ["dsa-problem", slug],
    queryFn: () => api(`/api/v1/dsa/problems/${slug}`),
  })

  useEffect(() => {
    if (problem) document.title = `${problem.title} - xkill DSA`
  }, [problem])

  const submitMutation = useMutation({
    mutationFn: (isRun: boolean) =>
      api("/api/v1/dsa/submit", {
        method: "POST",
        body: JSON.stringify({
          problem_id: problem?.id,
          language,
          code,
          is_run: isRun,
        }),
      }),
    onSuccess: (data) => setOutput(JSON.stringify(data, null, 2)),
    onError: (err: Error) => setOutput(err.message),
  })

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        submitMutation.mutate(false)
      }
    },
    [submitMutation],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    setCode(defaultCodes[language] || defaultCodes.python)
  }, [language])

  const tabs: { key: Tab; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "editorial", label: "Editorial" },
    { key: "discussion", label: "Discussion" },
    { key: "submissions", label: "Submissions" },
    { key: "hints", label: "Hints" },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (!problem) {
    return <div className="py-12 text-center text-muted-foreground">Problem not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{problem.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium",
                problem.difficulty === "easy" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                problem.difficulty === "medium" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                problem.difficulty === "hard" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
              )}
            >
              {problem.difficulty}
            </span>
            {problem.topics?.map((t) => (
              <span key={t} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
            ))}
            <span className="text-xs text-muted-foreground">
              Time: {problem.time_limit_ms}ms | Memory: {problem.memory_limit_mb}MB
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div role="tablist" aria-label="Problem sections" className="flex gap-2 border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-medium",
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "description" && (
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <div dangerouslySetInnerHTML={{ __html: problem.description }} />
              <div>
                <h4 className="font-semibold">Input Format</h4>
                <div dangerouslySetInnerHTML={{ __html: problem.input_format }} />
              </div>
              <div>
                <h4 className="font-semibold">Output Format</h4>
                <div dangerouslySetInnerHTML={{ __html: problem.output_format }} />
              </div>
              <div>
                <h4 className="font-semibold">Constraints</h4>
                <div dangerouslySetInnerHTML={{ __html: problem.constraints }} />
              </div>
              <div className="rounded bg-muted p-4">
                <h5 className="font-semibold">Sample Input</h5>
                <pre className="mt-1 text-sm">{problem.sample_input}</pre>
                <h5 className="mt-3 font-semibold">Sample Output</h5>
                <pre className="mt-1 text-sm">{problem.sample_output}</pre>
              </div>
            </div>
          )}

          {activeTab === "editorial" && (
            <div className="text-muted-foreground">Editorial content coming soon.</div>
          )}

          {activeTab === "discussion" && (
            <div className="text-muted-foreground">Discussion threads coming soon.</div>
          )}

          {activeTab === "submissions" && (
            <div className="text-muted-foreground">Your submissions for this problem will appear here.</div>
          )}

          {activeTab === "hints" && (
            <div className="text-muted-foreground">Hints coming soon.</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <select
              aria-label="Select language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {Object.keys(defaultCodes).map((lang) => (
                <option key={lang} value={lang}>
                  {lang === "cpp" ? "C++" : lang === "javascript" ? "JavaScript" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => submitMutation.mutate(true)}
                disabled={submitMutation.isPending}
                className="rounded-md border px-4 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
                aria-label="Run code"
              >
                Run
              </button>
              <button
                onClick={() => submitMutation.mutate(false)}
                disabled={submitMutation.isPending}
                className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                aria-label="Submit solution"
              >
                Submit
              </button>
            </div>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md border bg-[#1e1e1e] p-4 font-mono text-sm text-white"
            rows={20}
            spellCheck={false}
            aria-label="Code editor"
          />

          <div className="rounded-md border bg-card p-3">
            <h3 className="mb-2 text-sm font-medium">Output</h3>
            <pre className="text-sm text-muted-foreground">
              {output || "Click Run or Submit to see results (Ctrl+Enter)"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
