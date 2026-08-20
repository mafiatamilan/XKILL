"use client";

import * as React from "react";
import { BookOpen, Users, FileText, Calendar, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useFacultyDashboard, useFacultySubjects } from "@/lib/hooks/queries/use-faculty";

export default function FacultyPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Faculty Portal" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Faculty Portal</h1>
        <p className="text-muted-foreground">Manage subjects, attendance, and grades</p>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><FacultyDashboardView /></TabsContent>
        <TabsContent value="subjects"><FacultySubjectsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function FacultyDashboardView() {
  const { data, isLoading } = useFacultyDashboard();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const stats = [
    { label: "Total Students", value: data?.totalStudents || 0, icon: Users, color: "text-blue-500" },
    { label: "Subjects", value: data?.totalSubjects || 0, icon: BookOpen, color: "text-green-500" },
    { label: "Pending Assignments", value: data?.pendingAssignments || 0, icon: FileText, color: "text-orange-500" },
    { label: "Upcoming Exams", value: data?.upcomingExams || 0, icon: Calendar, color: "text-purple-500" },
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

function FacultySubjectsView() {
  const { data: subjects = [], isLoading } = useFacultySubjects();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {subjects.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.code} · Semester {s.semester}</p>
              </div>
              <Badge variant="secondary">{s.studentCount} students</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
