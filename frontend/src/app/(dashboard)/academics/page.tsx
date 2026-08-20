"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, FileText, ClipboardCheck, BarChart3, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useSubjects, useMyExams, useMyAssignments, useMyAttendance, useMyMarks, useMyGpa, useMyCgpa } from "@/lib/hooks/queries/use-academics";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Academics" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Academics</h1>
        <p className="text-muted-foreground">Track your academic progress</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="marks">Marks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AcademicsOverview />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsList />
        </TabsContent>
        <TabsContent value="exams">
          <ExamsList />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsList />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceView />
        </TabsContent>
        <TabsContent value="marks">
          <MarksView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AcademicsOverview() {
  const { data: gpa, isLoading: gpaLoading } = useMyGpa();
  const { data: cgpa, isLoading: cgpaLoading } = useMyCgpa();
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: attendance = [], isLoading: attendanceLoading } = useMyAttendance();

  const presentDays = attendance.filter((a) => a.status === "present").length;
  const attendancePercent = attendance.length > 0 ? Math.round((presentDays / attendance.length) * 100) : 0;

  if (gpaLoading || subjectsLoading || attendanceLoading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Current GPA</p>
                <p className="text-2xl font-bold">{gpa?.gpa?.toFixed(2) || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">CGPA</p>
                <p className="text-2xl font-bold">{cgpa?.cgpa?.toFixed(2) || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold">{attendancePercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SubjectsList() {
  const { data: subjects = [], isLoading } = useSubjects();
  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (subjects.length === 0) return <p className="text-center text-muted-foreground py-8">No subjects found.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {subjects.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.code} · {s.credits} credits</p>
              </div>
              <Badge variant="secondary">Sem {s.semester}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExamsList() {
  const { data: exams = [], isLoading } = useMyExams();
  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (exams.length === 0) return <p className="text-center text-muted-foreground py-8">No exams scheduled.</p>;
  return (
    <div className="space-y-3">
      {exams.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-muted-foreground">{e.type} · {e.totalMarks} marks</p>
            </div>
            <div className="text-right text-sm">
              <p>{formatDate(e.startTime)}</p>
              <p className="text-muted-foreground">{new Date(e.startTime).toLocaleTimeString()} - {new Date(e.endTime).toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssignmentsList() {
  const { data: assignments = [], isLoading } = useMyAssignments();
  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  if (assignments.length === 0) return <p className="text-center text-muted-foreground py-8">No assignments.</p>;
  return (
    <div className="space-y-3">
      {assignments.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1">{a.description}</p>
            </div>
            <div className="text-right text-sm">
              <Badge variant={new Date(a.deadline) < new Date() ? "destructive" : "secondary"}>
                Due {formatDate(a.deadline)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AttendanceView() {
  const { data: attendance = [], isLoading } = useMyAttendance();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;
  if (attendance.length === 0) return <p className="text-center text-muted-foreground py-8">No attendance records.</p>;

  const bySubject = attendance.reduce<Record<string, { present: number; total: number }>>((acc, a) => {
    if (!acc[a.subjectId]) acc[a.subjectId] = { present: 0, total: 0 };
    acc[a.subjectId].total++;
    if (a.status === "present") acc[a.subjectId].present++;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(bySubject).map(([id, { present, total }]) => (
        <Card key={id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Subject {id.slice(0, 8)}</p>
              <p className="text-sm">{present}/{total} ({Math.round((present / total) * 100)}%)</p>
            </div>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(present / total) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MarksView() {
  const { data: marks = [], isLoading } = useMyMarks();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;
  if (marks.length === 0) return <p className="text-center text-muted-foreground py-8">No marks recorded yet.</p>;
  return (
    <div className="space-y-3">
      {marks.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{m.examTitle}</p>
              <p className="text-sm text-muted-foreground">{m.subjectName}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{m.marksObtained}/{m.totalMarks}</p>
              <p className="text-sm text-muted-foreground">{Math.round((m.marksObtained / m.totalMarks) * 100)}%</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
