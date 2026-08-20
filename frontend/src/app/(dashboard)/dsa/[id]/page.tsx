"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useProblem, useRunCode, useSubmitSolution } from "@/lib/hooks/queries/use-dsa";
import { toast } from "sonner";

const LANGUAGES = [
  { id: "62", name: "Java", defaultCode: "// Write your solution here\n" },
  { id: "71", name: "Python", defaultCode: "# Write your solution here\n" },
  { id: "54", name: "C++", defaultCode: "// Write your solution here\n" },
  { id: "63", name: "JavaScript", defaultCode: "// Write your solution here\n" },
];

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;
  const { data: problem, isLoading } = useProblem(problemId);
  const runCode = useRunCode();
  const submitSolution = useSubmitSolution();

  const [languageId, setLanguageId] = React.useState("71");
  const [sourceCode, setSourceCode] = React.useState("");
  const [runResult, setRunResult] = React.useState<{ stdout: string; stderr: string; status: string } | null>(null);

  React.useEffect(() => {
    const lang = LANGUAGES.find((l) => l.id === languageId);
    if (lang) setSourceCode(lang.defaultCode);
  }, [languageId]);

  const handleRun = async () => {
    if (!sourceCode.trim()) { toast.error("Write some code first"); return; }
    try {
      const result = await runCode.mutateAsync({ id: problemId, sourceCode, languageId });
      setRunResult(result);
      toast.success("Code executed successfully");
    } catch {
      toast.error("Failed to run code");
    }
  };

  const handleSubmit = async () => {
    if (!sourceCode.trim()) { toast.error("Write some code first"); return; }
    try {
      const result = await submitSolution.mutateAsync({ id: problemId, sourceCode, languageId });
      if (result.verdict === "Accepted") {
        toast.success("All test cases passed!");
      } else {
        toast.error(`Verdict: ${result.verdict} (${result.passed}/${result.total} test cases)`);
      }
    } catch {
      toast.error("Failed to submit solution");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-[500px] w-full" /></div>;
  if (!problem) return <p className="text-center py-8">Problem not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <Breadcrumb items={[{ label: "DSA", href: "/(dashboard)/dsa" }, { label: problem.title }]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Problem Statement */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{problem.title}</CardTitle>
                <Badge variant={problem.difficulty === "easy" ? "default" : problem.difficulty === "medium" ? "secondary" : "destructive"}>
                  {problem.difficulty}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {problem.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{problem.statement}</p>
              </div>
              {problem.inputFormat && (
                <div>
                  <h4 className="font-medium mb-1">Input Format</h4>
                  <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{problem.inputFormat}</pre>
                </div>
              )}
              {problem.outputFormat && (
                <div>
                  <h4 className="font-medium mb-1">Output Format</h4>
                  <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{problem.outputFormat}</pre>
                </div>
              )}
              {problem.constraints && (
                <div>
                  <h4 className="font-medium mb-1">Constraints</h4>
                  <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{problem.constraints}</pre>
                </div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Time: {problem.timeLimitMs}ms</span>
                <span>Memory: {problem.memoryLimitMb}MB</span>
                <span>Acceptance: {problem.acceptanceRate}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Code Editor */}
        <div className="space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <Select value={languageId} onValueChange={setLanguageId}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRun} disabled={runCode.isPending}>
                  {runCode.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                  Run
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitSolution.isPending}>
                  {submitSolution.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                  Submit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-[400px] bg-muted/50 p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {runResult && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Output</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap max-h-48 overflow-auto">
                  {runResult.stdout || runResult.stderr || "No output"}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
