"use client";

import * as React from "react";
import { Bot, Send, Loader2, Code2, FileText, HelpCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useAiTutor, useAiDoubtSolver, useAiCodeReview, useAiQuestionGenerator, useAiStudyPlanner } from "@/lib/hooks/queries/use-ai";
import { toast } from "sonner";

export default function AiServicesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "AI Services" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Services</h1>
        <p className="text-muted-foreground">AI-powered tools to boost your learning</p>
      </div>
      <Tabs defaultValue="tutor" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tutor">AI Tutor</TabsTrigger>
          <TabsTrigger value="doubt">Doubt Solver</TabsTrigger>
          <TabsTrigger value="review">Code Review</TabsTrigger>
          <TabsTrigger value="questions">Question Gen</TabsTrigger>
          <TabsTrigger value="planner">Study Planner</TabsTrigger>
        </TabsList>
        <TabsContent value="tutor"><AiTutor /></TabsContent>
        <TabsContent value="doubt"><AiDoubtSolver /></TabsContent>
        <TabsContent value="review"><AiCodeReview /></TabsContent>
        <TabsContent value="questions"><AiQuestionGenerator /></TabsContent>
        <TabsContent value="planner"><AiStudyPlanner /></TabsContent>
      </Tabs>
    </div>
  );
}

function AiTutor() {
  const tutor = useAiTutor();
  const [question, setQuestion] = React.useState("");
  const [result, setResult] = React.useState<string>("");

  const handleAsk = async () => {
    if (!question.trim()) return;
    try {
      const res = await tutor.mutateAsync({ question });
      setResult(res.answer);
    } catch {
      toast.error("Failed to get answer");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Tutor</CardTitle>
        <CardDescription>Ask any academic question and get explained answers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Ask a question..." value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAsk()} />
          <Button onClick={handleAsk} disabled={tutor.isPending || !question.trim()}>
            {tutor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-muted whitespace-pre-wrap text-sm">{result}</div>
        )}
      </CardContent>
    </Card>
  );
}

function AiDoubtSolver() {
  const solver = useAiDoubtSolver();
  const [question, setQuestion] = React.useState("");
  const [result, setResult] = React.useState<{ answer: string; steps: string[] } | null>(null);

  const handleSolve = async () => {
    if (!question.trim()) return;
    try {
      const res = await solver.mutateAsync({ question });
      setResult(res);
    } catch {
      toast.error("Failed to solve doubt");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Doubt Solver</CardTitle>
        <CardDescription>Get step-by-step solutions to your doubts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Describe your doubt..." value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSolve()} />
          <Button onClick={handleSolve} disabled={solver.isPending || !question.trim()}>
            {solver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {result && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-muted whitespace-pre-wrap text-sm">{result.answer}</div>
            {result.steps.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Steps:</p>
                {result.steps.map((s, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="font-medium">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiCodeReview() {
  const review = useAiCodeReview();
  const [code, setCode] = React.useState("");
  const [lang, setLang] = React.useState("javascript");
  const [result, setResult] = React.useState<{ score: number; issues: Array<{ line: number; message: string; severity: string }>; suggestions: string[] } | null>(null);

  const handleReview = async () => {
    if (!code.trim()) return;
    try {
      const res = await review.mutateAsync({ sourceCode: code, language: lang });
      setResult(res);
    } catch {
      toast.error("Failed to review code");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5" /> Code Review</CardTitle>
        <CardDescription>Get AI-powered code review with suggestions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} rows={8} placeholder="Paste your code here..." className="font-mono text-sm" />
        <Button onClick={handleReview} disabled={review.isPending || !code.trim()}>
          {review.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Review Code
        </Button>
        {result && (
          <div className="space-y-3">
            <p className="text-lg font-bold">Score: {result.score}/100</p>
            {result.issues.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Issues:</p>
                {result.issues.map((issue, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-mono">Line {issue.line}:</span> {issue.message}
                    <Badge variant={issue.severity === "error" ? "destructive" : "secondary"} className="ml-2 text-xs">{issue.severity}</Badge>
                  </div>
                ))}
              </div>
            )}
            {result.suggestions.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-sm">Suggestions:</p>
                {result.suggestions.map((s, i) => <p key={i} className="text-sm text-muted-foreground">• {s}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiQuestionGenerator() {
  const gen = useAiQuestionGenerator();
  const [topic, setTopic] = React.useState("");
  const [difficulty, setDifficulty] = React.useState("medium");
  const [count, setCount] = React.useState(5);
  const [result, setResult] = React.useState<Array<{ question: string; answer: string }>>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    try {
      const res = await gen.mutateAsync({ topic, difficulty, count });
      setResult(res.questions || []);
    } catch {
      toast.error("Failed to generate questions");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Question Generator</CardTitle>
        <CardDescription>Generate practice questions on any topic</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Topic (e.g. Binary Trees)" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <Button onClick={handleGenerate} disabled={gen.isPending || !topic.trim()}>
            {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </div>
        {result.length > 0 && (
          <div className="space-y-3">
            {result.map((q, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <p className="font-medium text-sm">Q{i + 1}: {q.question}</p>
                <p className="text-sm text-muted-foreground mt-1">A: {q.answer}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AiStudyPlanner() {
  const planner = useAiStudyPlanner();
  const [subjects, setSubjects] = React.useState("");
  const [hours, setHours] = React.useState(4);
  const [deadline, setDeadline] = React.useState("");
  const [result, setResult] = React.useState<Array<{ day: string; tasks: string[] }>>([]);

  const handleGenerate = async () => {
    if (!subjects.trim() || !deadline) return;
    try {
      const res = await planner.mutateAsync({ subjects: subjects.split(",").map((s) => s.trim()), hoursPerDay: hours, deadline });
      setResult(res.plan || []);
    } catch {
      toast.error("Failed to generate plan");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Study Planner</CardTitle>
        <CardDescription>Get a personalized study plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Subjects (comma-separated)" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
          <Input type="number" placeholder="Hours/day" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <Button onClick={handleGenerate} disabled={planner.isPending}>
          {planner.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate Plan
        </Button>
        {result.length > 0 && (
          <div className="space-y-3">
            {result.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border">
                <p className="font-medium text-sm">{d.day}</p>
                <ul className="mt-1 space-y-1">
                  {d.tasks.map((t, j) => <li key={j} className="text-sm text-muted-foreground">• {t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
