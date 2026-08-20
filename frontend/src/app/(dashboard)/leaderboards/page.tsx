"use client";

import * as React from "react";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useLeaderboard, type LeaderboardScope } from "@/lib/hooks/queries/use-leaderboards";

export default function LeaderboardsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Leaderboards" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboards</h1>
        <p className="text-muted-foreground">See how you rank against others</p>
      </div>
      <Tabs defaultValue="global" className="space-y-6">
        <TabsList>
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        <TabsContent value="global"><LeaderboardTable scope="global" /></TabsContent>
        <TabsContent value="weekly"><LeaderboardTable scope="weekly" /></TabsContent>
        <TabsContent value="monthly"><LeaderboardTable scope="monthly" /></TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ scope }: { scope: LeaderboardScope }) {
  const { data, isLoading } = useLeaderboard(scope);

  if (isLoading) return <div className="space-y-3">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  const entries = data?.data || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {entries.length === 0 && (
            <p className="p-6 text-center text-muted-foreground">No leaderboard data available.</p>
          )}
          {entries.map((e) => (
            <div key={e.userId} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
              <div className="w-8 flex justify-center">{getRankIcon(e.rank)}</div>
              <Avatar className="h-9 w-9">
                <AvatarImage src={e.avatarUrl} />
                <AvatarFallback>{e.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.name}</p>
                {e.tier && <p className="text-xs text-muted-foreground">{e.tier}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">{e.score}</p>
                <p className="text-xs text-muted-foreground">Rating: {e.rating}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
