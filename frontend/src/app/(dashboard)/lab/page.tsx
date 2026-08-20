"use client";

import * as React from "react";
import { FlaskConical, Code2, FileText, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useLabSubjects, useLabExperiments, useSubmitLabCode, useLabSubmissions } from "@/lib/hooks/queries/use-lab";
import { toast } from "sonner";

export default function LabPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "College Lab" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">College Programming Lab</h1>
        <p className="text-muted-foreground">Complete lab experiments and submit code</p>
      </div>
      <Tabs defaultValue="subjects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="subjects"><LabSubjectsView /></TabsContent>
        <TabsContent value="submissions"><LabSubmissionsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function LabSubjectsView() {
  const { data: subjects = [], isLoading } = useLabSubjects();
  const [selectedSubject, setSelectedSubject] = React.useState<string>("");
  const { data: experiments = [], isLoading: expLoading } = useLabExperiments(selectedSubject);
  const submitCode = useSubmitLabCode();
  const [selectedExp, setSelectedExp] = React.useState<string>("");
  const [code, setCode] = React.useState("");

  const handleSubmit = async () => {
    if (!selectedExp || !code.trim()) { toast.error("Select experiment and write code"); return; }
    try {
      await submitCode.mutateAsync({ experimentId: selectedExp, sourceCode: code });
      toast.success("Code submitted!");
      setCode("");
    } catch {
      toast.error("Failed to submit code");
    }
  };

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {subjects.map((s) => (
          <Card
            key={s.id}
            className={`hover:shadow-md transition-shadow cursor-pointer ${selectedSubject === s.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedSubject(s.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FlaskConical className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.code} · {s.language}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSubject && (
        <Card>
          <CardHeader>
            <CardTitle>Experiments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {expLoading && <Skeleton className="h-[100px] w-full" />}
            {!expLoading && experiments.length === 0 && <p className="text-muted-foreground">No experiments for this subject.</p>}
            {experiments.map((e) => (
              <div
                key={e.id}
                className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 ${selectedExp === e.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedExp(e.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Week {e.weekNumber}: {e.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{e.objective}</p>
                  </div>
                  {e.deadline && <Badge variant="secondary">Due {new Date(e.deadline).toLocaleDateString()}</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {selectedExp && (
        <Card>
          <CardHeader><CardTitle>Submit Code</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              placeholder="Write your code here..."
              className="font-mono text-sm"
            />
            <Button onClick={handleSubmit} disabled={submitCode.isPending}>
              {submitCode.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LabSubmissionsView() {
  const { data: submissions = [], isLoading } = useLabSubmissions();

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {submissions.length === 0 && <p className="text-center text-muted-foreground py-8">No submissions yet.</p>}
      {submissions.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Experiment {s.experimentId.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">Submitted {new Date(s.submittedAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <Badge variant={s.status === "evaluated" ? "default" : s.status === "plagiarism_detected" ? "destructive" : "secondary"}>
                {s.status.replace("_", " ")}
              </Badge>
              {s.marks != null && <p className="text-lg font-bold mt-1">{s.marks} marks</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
