"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Clock, CheckCircle2, Loader2, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useInterviewSessions, useCreateInterviewSession } from "@/lib/hooks/queries/use-interviews";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InterviewsPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useInterviewSessions({ page, limit: 10 });
  const [createOpen, setCreateOpen] = React.useState(false);
  const createSession = useCreateInterviewSession();
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("technical");
  const [role, setRole] = React.useState("Software Engineer");

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Enter a title"); return; }
    try {
      const session = await createSession.mutateAsync({ title, type, role });
      setCreateOpen(false);
      setTitle("");
      router.push(`/(dashboard)/interviews/${session.id}`);
    } catch {
      toast.error("Failed to create session");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Interviews" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mock Interviews</h1>
          <p className="text-muted-foreground">Practice with AI-powered interview sessions</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Session</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Interview Session</DialogTitle>
              <DialogDescription>Start a new mock interview practice session</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g. Google SDE Interview Prep" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="system_design">System Design</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                    <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                    <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                    <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                    <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                    <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createSession.isPending}>
                {createSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {data?.data?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No interview sessions yet. Create your first one!</p>
            </CardContent>
          </Card>
        )}
        {data?.data?.map((s) => (
          <Link key={s.id} href={`/(dashboard)/interviews/${s.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  {s.status === "completed" ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : s.status === "active" ? (
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                  ) : (
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline">{s.type}</Badge>
                    <span>{s.role}</span>
                    <span>·</span>
                    <span>{formatDate(s.createdAt)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {s.score != null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{s.score}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                  )}
                </div>
                <Badge variant={s.status === "completed" ? "default" : s.status === "active" ? "secondary" : "outline"}>
                  {s.status}
                </Badge>
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
