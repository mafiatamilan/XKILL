"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trophy, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useInterviewReport } from "@/lib/hooks/queries/use-interviews";

export default function InterviewReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data: report, isLoading } = useInterviewReport(sessionId);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!report) return <p className="text-center py-8">Report not available yet.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <Breadcrumb items={[{ label: "Interviews", href: "/(dashboard)/interviews" }, { label: "Report" }]} />
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interview Report</h1>
        <p className="text-muted-foreground">Detailed feedback on your performance</p>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="p-8 text-center">
          <Trophy className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-5xl font-bold">{report.overallScore}</p>
          <p className="text-muted-foreground mt-2">Overall Score</p>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(report.breakdown).map(([key, value]) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-32 text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
              <div className="flex-1"><Progress value={value as number} className="h-2" /></div>
              <span className="w-10 text-sm text-right">{value as number}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No specific strengths identified yet.</p>
            ) : (
              report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <p className="text-sm">{s}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Improvements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Areas for Improvement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.improvements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Great job! No major improvements needed.</p>
            ) : (
              report.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                  <p className="text-sm">{s}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={() => router.push("/(dashboard)/interviews")}>Back to Interviews</Button>
      </div>
    </div>
  );
}
