"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Loader2, Trash2, BarChart3, Download, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useResumes, useCreateResume, useDeleteResume, useResumeTemplates } from "@/lib/hooks/queries/use-resumes";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ResumesPage() {
  const router = useRouter();
  const { data: resumes = [], isLoading } = useResumes();
  const { data: templates = [] } = useResumeTemplates();
  const createResume = useCreateResume();
  const deleteResume = useDeleteResume();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [templateId, setTemplateId] = React.useState("");

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Enter a title"); return; }
    try {
      const resume = await createResume.mutateAsync({ title, templateId: templateId || templates[0]?.id || "" });
      setCreateOpen(false);
      setTitle("");
      router.push(`/(dashboard)/resumes/${resume.id}`);
    } catch {
      toast.error("Failed to create resume");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    try {
      await deleteResume.mutateAsync(id);
      toast.success("Resume deleted");
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Resumes" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resume Builder</h1>
          <p className="text-muted-foreground">Create and manage your resumes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Resume</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Resume</DialogTitle>
              <DialogDescription>Choose a template and give your resume a title</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="e.g. Software Engineer Resume" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createResume.isPending}>
                {createResume.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resumes.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No resumes yet. Create your first one to get started!</p>
            </CardContent>
          </Card>
        )}
        {resumes.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{r.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(r.updatedAt)}
                  </CardDescription>
                </div>
                {r.atsScore != null && (
                  <Badge variant={r.atsScore >= 80 ? "default" : r.atsScore >= 60 ? "secondary" : "destructive"}>
                    ATS: {r.atsScore}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Link href={`/(dashboard)/resumes/${r.id}`} className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">Edit</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => handleDelete(r.id)} disabled={deleteResume.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
