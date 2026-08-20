"use client";

import * as React from "react";
import { Target, TrendingUp, DollarSign, BarChart3, MessageSquare, ArrowRight, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useCareerRoadmap, useCareerRecommendations, useSalaryPrediction, useSkillGap, useCareerChatHistory, useSendCareerMessage } from "@/lib/hooks/queries/use-career";
import { toast } from "sonner";

export default function CareerCoachPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Career Coach" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Career Coach</h1>
        <p className="text-muted-foreground">AI-powered guidance for your career journey</p>
      </div>
      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="recommendations">Learn</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="skills">Skill Gap</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="roadmap"><RoadmapView /></TabsContent>
        <TabsContent value="recommendations"><RecommendationsView /></TabsContent>
        <TabsContent value="salary"><SalaryView /></TabsContent>
        <TabsContent value="skills"><SkillGapView /></TabsContent>
        <TabsContent value="chat"><ChatView /></TabsContent>
      </Tabs>
    </div>
  );
}

function RoadmapView() {
  const { data: roadmap, isLoading } = useCareerRoadmap();
  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Career Roadmap</CardTitle>
          <CardDescription>Target: {roadmap?.targetRole || "Not set"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="font-medium">{roadmap?.progress || 0}%</p>
          </div>
          <Progress value={roadmap?.progress || 0} className="h-2" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {roadmap?.milestones?.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4 flex items-center gap-4">
              {m.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : m.status === "in_progress" ? (
                <Target className="h-5 w-5 text-blue-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted shrink-0" />
              )}
              <div className="flex-1">
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-muted-foreground">{m.description}</p>
              </div>
              <Badge variant={m.status === "completed" ? "default" : m.status === "in_progress" ? "secondary" : "outline"}>
                {m.status.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        ))}
        {(!roadmap?.milestones || roadmap.milestones.length === 0) && (
          <p className="text-center text-muted-foreground py-8">No roadmap milestones yet. Set your career goals first.</p>
        )}
      </div>
    </div>
  );
}

function RecommendationsView() {
  const { data: recs = [], isLoading } = useCareerRecommendations();
  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  const iconMap = { course: BookOpen, project: Target, article: Target, video: Target };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Learning Recommendations</h2>
      {recs.length === 0 && <p className="text-center text-muted-foreground py-8">No recommendations yet. Complete your profile for personalized suggestions.</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {recs.map((r) => {
          const Icon = iconMap[r.type] || BookOpen;
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5 text-primary shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "default" : "secondary"}>
                        {r.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">~{r.estimatedHours} hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SalaryView() {
  const { data: prediction, isLoading } = useSalaryPrediction();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold">₹{prediction?.predictedCtc || 0} LPA</p>
            <p className="text-sm text-muted-foreground">Predicted CTC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="mx-auto h-8 w-8 text-blue-500 mb-2" />
            <p className="text-3xl font-bold">{prediction?.percentile || 0}th</p>
            <p className="text-sm text-muted-foreground">Market Percentile</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-purple-500 mb-2" />
            <p className="text-3xl font-bold">₹{prediction?.marketAverage || 0} LPA</p>
            <p className="text-sm text-muted-foreground">Market Average</p>
          </CardContent>
        </Card>
      </div>

      {prediction?.factors && prediction.factors.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Salary Factors</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {prediction.factors.map((f) => (
              <div key={f.name} className="flex items-center gap-4">
                <span className="w-32 text-sm font-medium">{f.name}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(f.impact, 100)}%` }} />
                </div>
                <span className="w-10 text-sm text-right">{f.impact}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SkillGapView() {
  const { data: gap, isLoading } = useSkillGap();
  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Required Skills</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {gap?.required?.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <span className="w-32 text-sm font-medium">{s.name}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${s.currentLevel}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Current: {s.currentLevel}%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${s.requiredLevel}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">Required: {s.requiredLevel}%</span>
                </div>
              </div>
            </div>
          ))}
          {(!gap?.required || gap.required.length === 0) && (
            <p className="text-muted-foreground">No skill gap data available.</p>
          )}
        </CardContent>
      </Card>

      {gap?.recommended && gap.recommended.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recommended Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {gap.recommended.map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-sm text-muted-foreground">{r.reason}</p>
                  {r.resources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.resources.map((res, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{res}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChatView() {
  const { data: messages = [], isLoading } = useCareerChatHistory();
  const sendMessage = useSendCareerMessage();
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    setInput("");
    try {
      await sendMessage.mutateAsync(msg);
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Career Coach Chat
        </CardTitle>
      </CardHeader>
      <CardContent ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4">
        {isLoading && <Skeleton className="h-[200px] w-full" />}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Ask me anything about your career!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                {m.role === "assistant" ? "AI" : "U"}
              </AvatarFallback>
            </Avatar>
            <div className={`max-w-[70%] rounded-lg p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <p className="text-sm whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {sendMessage.isPending && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t flex gap-2">
        <Input
          placeholder="Ask about career paths, skills, interviews..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={sendMessage.isPending}
        />
        <Button onClick={handleSend} disabled={sendMessage.isPending || !input.trim()}>Send</Button>
      </div>
    </Card>
  );
}
