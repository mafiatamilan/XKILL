"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Target, Calendar, BookOpen, Flame, TrendingUp, CheckCircle2, ArrowRight, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { usePlacementRoadmap, useCompleteTask, useReadinessPrediction, useDailyChallenge, usePlacementProgress } from "@/lib/hooks/queries/use-placement";
import { toast } from "sonner";

export default function PlacementPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Placement Prep" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Placement Preparation</h1>
        <p className="text-muted-foreground">Your personalized roadmap to crack placement season</p>
      </div>
      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="challenge">Daily Challenge</TabsTrigger>
        </TabsList>
        <TabsContent value="roadmap"><RoadmapView /></TabsContent>
        <TabsContent value="progress"><ProgressView /></TabsContent>
        <TabsContent value="challenge"><DailyChallengeView /></TabsContent>
      </Tabs>
    </div>
  );
}

function RoadmapView() {
  const { data: roadmap, isLoading } = usePlacementRoadmap();
  const completeTask = useCompleteTask();
  const [selectedWeek, setSelectedWeek] = React.useState(1);

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      {roadmap && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">{roadmap.progress}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={roadmap.progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: roadmap?.weeks?.length || 12 }, (_, i) => i + 1).map((w) => (
          <Button
            key={w}
            variant={selectedWeek === w ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWeek(w)}
            className="shrink-0"
          >
            Week {w}
          </Button>
        ))}
      </div>

      <WeekTasks weekNumber={selectedWeek} onComplete={(taskId) => completeTask.mutate(taskId)} />
    </div>
  );
}

function WeekTasks({ weekNumber, onComplete }: { weekNumber: number; onComplete: (taskId: string) => void }) {
  const [tasks, setTasks] = React.useState<Array<{ id: string; title: string; type: string; completed: boolean; day: number }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    import("@/lib/api").then(({ api }) =>
      api.get(`/placement/roadmap/${weekNumber}/tasks`).then((r) => {
        setTasks(r.data.tasks || []);
        setLoading(false);
      }).catch(() => setLoading(false))
    );
  }, [weekNumber]);

  if (loading) return <Skeleton className="h-[200px] w-full" />;
  if (tasks.length === 0) return <p className="text-center text-muted-foreground py-8">No tasks for this week.</p>;

  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <Card key={t.id} className={t.completed ? "opacity-60" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            {t.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Button variant="outline" size="sm" onClick={() => onComplete(t.id)} className="shrink-0">Done</Button>
            )}
            <div className="flex-1">
              <p className="font-medium">{t.title}</p>
              <p className="text-sm text-muted-foreground">Day {t.day} · {t.type}</p>
            </div>
            <Badge variant="secondary">Day {t.day}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProgressView() {
  const { data: progress, isLoading } = usePlacementProgress();
  const { data: prediction } = useReadinessPrediction();

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Readiness Prediction</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-center">{prediction?.score || 0}%</p>
            <p className="text-center text-muted-foreground mt-2">Predicted placement readiness</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recommendations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {prediction?.recommendations?.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <p className="text-sm">{r}</p>
              </div>
            )) || <p className="text-sm text-muted-foreground">Complete more tasks to get recommendations.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DailyChallengeView() {
  const { data: challenge, isLoading } = useDailyChallenge();

  if (isLoading) return <Skeleton className="h-[200px] w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle>Today&apos;s Challenge</CardTitle>
        </div>
        <CardDescription>Complete today&apos;s challenge to maintain your streak!</CardDescription>
      </CardHeader>
      <CardContent>
        {challenge ? (
          <div className="space-y-4">
            <p className="font-medium">{(challenge as { title?: string }).title || "Daily Challenge"}</p>
            <p className="text-sm text-muted-foreground">{(challenge as { description?: string }).description || "Solve today's problem to earn bonus XP."}</p>
            <Button>Start Challenge</Button>
          </div>
        ) : (
          <p className="text-muted-foreground">No challenge available today. Check back tomorrow!</p>
        )}
      </CardContent>
    </Card>
  );
}
