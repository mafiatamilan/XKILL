"use client";

import * as React from "react";
import { Briefcase, Users, FileCheck, Calendar, BarChart3, Search, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useRecruiterDashboard, useCandidateSearch, useShortlistCandidate } from "@/lib/hooks/queries/use-recruiter";
import { toast } from "sonner";

export default function RecruiterPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Recruiter Portal" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recruiter Portal</h1>
        <p className="text-muted-foreground">Find and hire top talent</p>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><RecruiterDashboardView /></TabsContent>
        <TabsContent value="candidates"><CandidateSearch /></TabsContent>
      </Tabs>
    </div>
  );
}

function RecruiterDashboardView() {
  const { data, isLoading } = useRecruiterDashboard();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const stats = [
    { label: "Active Jobs", value: data?.totalJobs || 0, icon: Briefcase, color: "text-blue-500" },
    { label: "Applications", value: data?.totalApplications || 0, icon: Users, color: "text-green-500" },
    { label: "Shortlisted", value: data?.shortlisted || 0, icon: FileCheck, color: "text-orange-500" },
    { label: "Interviews", value: data?.interviewsScheduled || 0, icon: Calendar, color: "text-purple-500" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CandidateSearch() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useCandidateSearch({ page, limit: 10, search: search || undefined });
  const shortlist = useShortlistCandidate();

  const handleShortlist = async (id: string) => {
    try {
      await shortlist.mutateAsync(id);
      toast.success("Candidate shortlisted!");
    } catch {
      toast.error("Failed to shortlist");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search candidates by skills..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No candidates found.</p>}
          {data?.data?.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.avatarUrl} />
                  <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.skills.slice(0, 5).map((s) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Rating: {c.rating}</p>
                <Button size="sm" onClick={() => handleShortlist(c.id)} disabled={shortlist.isPending}>
                  <UserPlus className="mr-1 h-3 w-3" /> Shortlist
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
