"use client";

import * as React from "react";
import { Star, Flame, Trophy, Target, Gift, Zap, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useGamificationSummary, useClaimDailyReward, useAllBadges, useMyAchievements, useMissions } from "@/lib/hooks/queries/use-gamification";
import { toast } from "sonner";

export default function GamificationPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Gamification" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gamification</h1>
        <p className="text-muted-foreground">Track your XP, streaks, badges, and missions</p>
      </div>
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
        </TabsList>
        <TabsContent value="summary"><SummaryView /></TabsContent>
        <TabsContent value="badges"><BadgesView /></TabsContent>
        <TabsContent value="missions"><MissionsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryView() {
  const { data: summary, isLoading } = useGamificationSummary();
  const claimReward = useClaimDailyReward();

  if (isLoading) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const levelProgress = summary ? ((summary.xp % 1000) / 1000) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
            <p className="text-3xl font-bold">{summary?.xp || 0}</p>
            <p className="text-sm text-muted-foreground">Total XP</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Star className="mx-auto h-8 w-8 text-purple-500 mb-2" />
            <p className="text-3xl font-bold">Level {summary?.level || 1}</p>
            <div className="mt-2"><Progress value={levelProgress} className="h-2" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Flame className="mx-auto h-8 w-8 text-orange-500 mb-2" />
            <p className="text-3xl font-bold">{summary?.streak || 0}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Trophy className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold">{summary?.badges?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Badges Earned</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Daily Reward
          </CardTitle>
          <CardDescription>Claim your daily XP reward to keep your streak alive</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => claimReward.mutate()} disabled={claimReward.isPending}>
            {claimReward.isPending ? "Claiming..." : "Claim Daily Reward"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BadgesView() {
  const { data: allBadges = [], isLoading: allLoading } = useAllBadges();
  const { data: earned = [], isLoading: earnedLoading } = useMyAchievements();

  const isLoading = allLoading || earnedLoading;
  if (isLoading) return <div className="grid gap-4 md:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const earnedIds = new Set(earned.map((b) => b.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Earned Badges ({earned.length})</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {earned.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {earned.length === 0 && <p className="text-muted-foreground col-span-3">No badges earned yet. Keep practicing!</p>}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">All Badges</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {allBadges.map((b) => (
            <Card key={b.id} className={earnedIds.has(b.id) ? "" : "opacity-50"}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.description}</p>
                  {earnedIds.has(b.id) && <Badge className="mt-1" variant="default">Earned</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function MissionsView() {
  const { data: missions = [], isLoading } = useMissions();

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {missions.length === 0 && <p className="text-center text-muted-foreground py-8">No active missions right now.</p>}
      {missions.map((m) => {
        const progress = (m.progress / m.target) * 100;
        const isExpired = new Date(m.expiresAt) < new Date();
        return (
          <Card key={m.id} className={isExpired ? "opacity-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <p className="font-medium">{m.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                </div>
                <Badge variant="secondary">+{m.xpReward} XP</Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={progress} className="h-2 flex-1" />
                <span className="text-sm text-muted-foreground">{m.progress}/{m.target}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {isExpired ? "Expired" : `Expires ${new Date(m.expiresAt).toLocaleDateString()}`}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
