"use client";

import * as React from "react";
import { Swords, Loader2, Play, Users, History, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useJoinRankedQueue, useCreatePracticeBattle, useCreatePrivateBattle, useJoinPrivateBattle, useBattleHistory } from "@/lib/hooks/queries/use-battles";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function BattlesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Coding Battles" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coding Battles</h1>
        <p className="text-muted-foreground">Challenge others in real-time coding duels</p>
      </div>
      <Tabs defaultValue="play" className="space-y-6">
        <TabsList>
          <TabsTrigger value="play">Play</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="play"><PlayView /></TabsContent>
        <TabsContent value="history"><HistoryView /></TabsContent>
      </Tabs>
    </div>
  );
}

function PlayView() {
  const joinQueue = useJoinRankedQueue();
  const createPractice = useCreatePracticeBattle();
  const createPrivate = useCreatePrivateBattle();
  const joinPrivate = useJoinPrivateBattle();
  const [privateOpen, setPrivateOpen] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState("");
  const [difficulty, setDifficulty] = React.useState("medium");

  const handleRanked = async () => {
    try {
      const result = await joinQueue.mutateAsync();
      toast.success(result?.message || "Joined ranked queue!");
    } catch {
      toast.error("Failed to join queue");
    }
  };

  const handlePractice = async () => {
    try {
      const result = await createPractice.mutateAsync({ difficulty });
      toast.success("Practice battle started!");
    } catch {
      toast.error("Failed to start battle");
    }
  };

  const handleCreatePrivate = async () => {
    try {
      const result = await createPrivate.mutateAsync({});
      toast.success(`Invite code: ${result.inviteCode}`);
      setPrivateOpen(false);
    } catch {
      toast.error("Failed to create battle");
    }
  };

  const handleJoinPrivate = async () => {
    if (!inviteCode.trim()) { toast.error("Enter invite code"); return; }
    try {
      await joinPrivate.mutateAsync(inviteCode);
      toast.success("Joined battle!");
      setPrivateOpen(false);
      setInviteCode("");
    } catch {
      toast.error("Failed to join battle");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <CardTitle>Ranked Battle</CardTitle>
          </div>
          <CardDescription>Compete against a random opponent and earn rating points</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleRanked} disabled={joinQueue.isPending}>
            {joinQueue.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Swords className="mr-2 h-4 w-4" />}
            Join Queue
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500" />
            <CardTitle>Practice Battle</CardTitle>
          </div>
          <CardDescription>Solo practice with a timed coding challenge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button className="w-full" onClick={handlePractice} disabled={createPractice.isPending}>
            {createPractice.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Start Practice
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <CardTitle>Private Battle</CardTitle>
          </div>
          <CardDescription>Challenge a friend with an invite code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => setPrivateOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Create / Join
          </Button>
        </CardContent>
      </Card>

      <Dialog open={privateOpen} onOpenChange={setPrivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Private Battle</DialogTitle>
            <DialogDescription>Create a new battle or join with an invite code</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Join Existing Battle</p>
              <div className="flex gap-2">
                <Input placeholder="Enter invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                <Button onClick={handleJoinPrivate} disabled={joinPrivate.isPending}>
                  {joinPrivate.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Join
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreatePrivate} disabled={createPrivate.isPending}>
              {createPrivate.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Create New Battle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HistoryView() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useBattleHistory({ page, limit: 10 });

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No battles yet.</p>}
        {data?.data?.map((b) => (
          <Card key={b.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <Swords className={`h-6 w-6 ${b.status === "completed" ? "text-muted-foreground" : "text-yellow-500"}`} />
              <div className="flex-1">
                <p className="font-medium">{b.problemTitle}</p>
                <p className="text-sm text-muted-foreground">{b.type} · {formatDate(b.createdAt)}</p>
              </div>
              <Badge variant={b.status === "completed" ? "outline" : "secondary"}>{b.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="flex items-center px-3 text-sm">Page {page} of {data.meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
