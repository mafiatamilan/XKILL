"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, StopCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useInterviewSession, useSubmitInterviewTurn, useEndInterviewSession } from "@/lib/hooks/queries/use-interviews";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data, isLoading, refetch } = useInterviewSession(sessionId);
  const submitTurn = useSubmitInterviewTurn();
  const endSession = useEndInterviewSession();
  const [answer, setAnswer] = React.useState("");

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    try {
      await submitTurn.mutateAsync({ sessionId, answer });
      setAnswer("");
      refetch();
    } catch {
      toast.error("Failed to submit answer");
    }
  };

  const handleEnd = async () => {
    try {
      await endSession.mutateAsync(sessionId);
      toast.success("Interview ended");
      router.push(`/(dashboard)/interviews/${sessionId}/report`);
    } catch {
      toast.error("Failed to end session");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[500px] w-full" /></div>;

  const session = data?.session;
  const transcript = data?.transcript || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <Breadcrumb items={[{ label: "Interviews", href: "/(dashboard)/interviews" }, { label: session?.title || "Session" }]} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session?.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{session?.type}</Badge>
            <span className="text-sm text-muted-foreground">{session?.role}</span>
          </div>
        </div>
        {session?.status === "active" && (
          <Button variant="destructive" onClick={handleEnd} disabled={endSession.isPending}>
            {endSession.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-4 w-4" />}
            End Interview
          </Button>
        )}
      </div>

      {/* Transcript */}
      <Card className="min-h-[400px]">
        <CardContent className="p-6 space-y-4">
          {transcript.length === 0 && (
            <p className="text-center text-muted-foreground py-8">The interviewer will ask you questions. Type your answers below.</p>
          )}
          {transcript.map((turn) => (
            <div key={turn.id} className={`flex gap-3 ${turn.role === "candidate" ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={turn.role === "interviewer" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                  {turn.role === "interviewer" ? "AI" : "U"}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] rounded-lg p-3 ${turn.role === "candidate" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-sm whitespace-pre-wrap">{turn.message}</p>
                {turn.feedback && (
                  <p className="text-xs mt-2 opacity-70 italic">Feedback: {turn.feedback}</p>
                )}
                <p className="text-xs mt-1 opacity-50">{new Date(turn.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Input */}
      {session?.status === "active" && (
        <div className="flex gap-2">
          <Input
            placeholder="Type your answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            disabled={submitTurn.isPending}
          />
          <Button onClick={handleSubmit} disabled={submitTurn.isPending || !answer.trim()}>
            {submitTurn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {session?.status === "completed" && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-lg font-medium">Interview Completed</p>
            <p className="text-muted-foreground">View your detailed report for feedback.</p>
            <Button className="mt-4" onClick={() => router.push(`/(dashboard)/interviews/${sessionId}/report`)}>
              View Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
