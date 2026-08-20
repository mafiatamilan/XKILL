"use client";

import * as React from "react";
import { Building2, Users, GraduationCap, BookOpen, Megaphone, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useCollegeAdminDashboard, useDepartments, useAdminStudents, useAnnouncements, useCreateAnnouncement } from "@/lib/hooks/queries/use-admin";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function CollegeAdminPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "College Admin" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">College Administration</h1>
        <p className="text-muted-foreground">Manage departments, students, and announcements</p>
      </div>
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><AdminDashboardView /></TabsContent>
        <TabsContent value="departments"><DepartmentsView /></TabsContent>
        <TabsContent value="students"><StudentsView /></TabsContent>
        <TabsContent value="announcements"><AnnouncementsView /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminDashboardView() {
  const { data, isLoading } = useCollegeAdminDashboard();
  if (isLoading) return <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  const stats = [
    { label: "Students", value: data?.totalStudents || 0, icon: Users, color: "text-blue-500" },
    { label: "Faculty", value: data?.totalFaculty || 0, icon: GraduationCap, color: "text-green-500" },
    { label: "Departments", value: data?.totalDepartments || 0, icon: Building2, color: "text-orange-500" },
    { label: "Courses", value: data?.totalCourses || 0, icon: BookOpen, color: "text-purple-500" },
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

function DepartmentsView() {
  const { data: depts = [], isLoading } = useDepartments();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {depts.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-muted-foreground">Head: {d.head}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{d.facultyCount} faculty</p>
                <p>{d.studentCount} students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StudentsView() {
  const { data: students = [], isLoading } = useAdminStudents();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {students.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">{s.email}</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary">{s.department}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Sem {s.semester}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnnouncementsView() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Fill in all fields"); return; }
    try {
      await createAnnouncement.mutateAsync({ title, body, targetRoles: ["student"] });
      setCreateOpen(false);
      setTitle("");
      setBody("");
      toast.success("Announcement created!");
    } catch {
      toast.error("Failed to create announcement");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Announcement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Input value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createAnnouncement.isPending}>
                {createAnnouncement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {announcements.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4">
            <p className="font-medium">{a.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
            <p className="text-xs text-muted-foreground mt-2">By {a.author} · {formatDate(a.publishedAt)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
