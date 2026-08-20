"use client";

import * as React from "react";
import { Building2, Users, FileCheck, Calendar, Plus, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useTpoDashboard, useCompanyDrives, useDepartmentStats } from "@/lib/hooks/queries/use-tpo";

export default function TpoPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "TPO Portal" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">TPO Portal</h1>
        <p className="text-muted-foreground">Manage company drives and placements</p>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="drives">Company Drives</TabsTrigger>
          <TabsTrigger value="stats">Department Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><TpoDashboardView /></TabsContent>
        <TabsContent value="drives"><CompanyDrivesView /></TabsContent>
        <TabsContent value="stats"><DepartmentStatsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function TpoDashboardView() {
  const { data, isLoading } = useTpoDashboard();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const stats = [
    { label: "Total Drives", value: data?.totalDrives || 0, icon: Building2, color: "text-blue-500" },
    { label: "Total Offers", value: data?.totalOffers || 0, icon: FileCheck, color: "text-green-500" },
    { label: "Students Placed", value: data?.placedStudents || 0, icon: Users, color: "text-orange-500" },
    { label: "Upcoming Drives", value: data?.upcomingDrives || 0, icon: Calendar, color: "text-purple-500" },
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

function CompanyDrivesView() {
  const { data: drives = [], isLoading } = useCompanyDrives();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {drives.length === 0 && <p className="text-center text-muted-foreground py-8">No company drives scheduled.</p>}
      {drives.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{d.companyName}</p>
              <p className="text-sm text-muted-foreground">{d.role}</p>
            </div>
            <div className="text-right">
              <Badge variant={d.status === "upcoming" ? "secondary" : d.status === "active" ? "default" : "outline"}>
                {d.status}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">{d.eligibleStudents} eligible · {d.applied} applied</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DepartmentStatsView() {
  const { data: stats, isLoading } = useDepartmentStats();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle>Department-wise Placement Stats</CardTitle></CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Department statistics will appear here once data is available.</p>
      </CardContent>
    </Card>
  );
}
