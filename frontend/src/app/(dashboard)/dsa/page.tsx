"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Code2, ChevronRight, Flame, Trophy, BarChart3, BookOpen, List } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useProblems, useDsaProgress, useDsaRating, useMySubmissions, useSheets, usePlaylists } from "@/lib/hooks/queries/use-dsa";
import { formatDate } from "@/lib/utils";

export default function DsaPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "DSA Practice" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DSA Practice</h1>
        <p className="text-muted-foreground">Sharpen your data structures & algorithms skills</p>
      </div>
      <Tabs defaultValue="problems" className="space-y-6">
        <TabsList>
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="sheets">Sheets</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
        </TabsList>
        <TabsContent value="problems"><ProblemsList /></TabsContent>
        <TabsContent value="progress"><ProgressView /></TabsContent>
        <TabsContent value="submissions"><SubmissionsView /></TabsContent>
        <TabsContent value="sheets"><SheetsView /></TabsContent>
        <TabsContent value="playlists"><PlaylistsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProblemsList() {
  const [search, setSearch] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useProblems({ page, limit: 20, search: search || undefined, difficulty: difficulty || undefined });

  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search problems..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={difficulty} onValueChange={(v) => { setDifficulty(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {data?.data?.map((p) => (
          <Link key={p.id} href={`/(dashboard)/dsa/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <Code2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.tags.slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant={p.difficulty === "easy" ? "default" : p.difficulty === "medium" ? "secondary" : "destructive"}>
                  {p.difficulty}
                </Badge>
                <span className="text-sm text-muted-foreground">{p.acceptanceRate}%</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
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

function ProgressView() {
  const { data: progress, isLoading: progressLoading } = useDsaProgress();
  const { data: rating, isLoading: ratingLoading } = useDsaRating();

  if (progressLoading || ratingLoading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{progress?.solved || 0}</p>
            <p className="text-sm text-muted-foreground">Problems Solved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{rating?.rating || 0}</p>
            <p className="text-sm text-muted-foreground">Current Rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold">{rating?.tier || "Beginner"}</p>
            <p className="text-sm text-muted-foreground">Current Tier</p>
          </CardContent>
        </Card>
      </div>
      {progress?.byDifficulty && (
        <Card>
          <CardHeader><CardTitle>By Difficulty</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(progress.byDifficulty).map(([d, count]) => (
              <div key={d} className="flex items-center gap-3">
                <Badge variant={d === "easy" ? "default" : d === "medium" ? "secondary" : "destructive"}>{d}</Badge>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress.totalProblems > 0 ? (count / progress.totalProblems) * 100 : 0}%` }} />
                </div>
                <span className="w-10 text-sm text-right">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubmissionsView() {
  const { data, isLoading } = useMySubmissions({ page: 1, limit: 20 });
  if (isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (!data?.data?.length) return <p className="text-center text-muted-foreground py-8">No submissions yet.</p>;
  return (
    <div className="space-y-3">
      {data.data.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">Problem {s.problemId.slice(0, 8)}</p>
              <p className="text-sm text-muted-foreground">{s.languageId} · {s.executionTimeMs}ms</p>
            </div>
            <Badge variant={s.verdict === "Accepted" ? "default" : "destructive"}>{s.verdict}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SheetsView() {
  const { data: sheets = [], isLoading } = useSheets();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;
  if (sheets.length === 0) return <p className="text-center text-muted-foreground py-8">No sheets available.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sheets.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
              </div>
              <Badge>{s.problemCount} problems</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlaylistsView() {
  const { data: playlists = [], isLoading } = usePlaylists();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;
  if (playlists.length === 0) return <p className="text-center text-muted-foreground py-8">No playlists yet. Create one to organize problems.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {playlists.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
              </div>
              <Badge variant="secondary">{p.problemCount} problems</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
