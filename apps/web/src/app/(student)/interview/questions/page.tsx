"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@xkill/design-system"
import { api } from "@/lib/api"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shared/toast"
import { Loader2, Search, ChevronDown, ChevronUp, Plus, Brain } from "lucide-react"

interface Question {
  id: string
  question: string
  answer: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  tags: string[]
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const categories = [
  "All",
  "Technical",
  "Behavioral",
  "HR",
  "Aptitude",
  "System Design",
  "DSA",
  "Database",
  "OS",
  "Networking",
]

function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4" aria-hidden="true">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 flex gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-12 animate-pulse rounded bg-muted" />
    </div>
  )
}

export default function InterviewQuestionsPage() {
  const { user, hasRole } = useAuth()
  const { toast } = useToast()
  const [category, setCategory] = useState("All")
  const [difficulty, setDifficulty] = useState("")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ question: "", answer: "", category: "", difficulty: "", tags: "" })

  const canAdd = hasRole("faculty", "tpo")

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ["interview-questions", category, difficulty, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category && category !== "All") params.set("category", category)
      if (difficulty) params.set("difficulty", difficulty)
      if (search) params.set("search", search)
      return api<Question[]>(`/api/v1/interview/questions?${params.toString()}`)
    },
  })

  const addMutation = undefined

  const filtered = (questions ?? []).filter((q) => {
    if (category !== "All" && q.category !== category) return false
    if (difficulty && q.difficulty !== difficulty) return false
    if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interview Questions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Practice with curated interview questions
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAddForm(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Add question"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Question
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className={cn(
              "h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Search interview questions"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Filter by difficulty"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400" role="alert">
          Failed to load questions.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Brain className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">No questions found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || category !== "All" || difficulty
              ? "Try adjusting your filters."
              : "No questions available yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((q) => (
            <div key={q.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{q.question}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", difficultyColors[q.difficulty])}>
                      {q.difficulty}
                    </span>
                    {q.category && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {q.category}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  className={cn(
                    "shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                  aria-label={expandedId === q.id ? "Collapse answer" : "Expand answer"}
                  aria-expanded={expandedId === q.id}
                >
                  {expandedId === q.id ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {expandedId === q.id && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
                  {q.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.tags.map((tag) => (
                        <span key={tag} className="rounded-md bg-primary/5 px-2 py-0.5 text-xs text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
