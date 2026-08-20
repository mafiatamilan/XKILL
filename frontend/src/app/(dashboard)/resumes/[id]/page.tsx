"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, BarChart3, Download, FileText, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useResume, useUpdateResume, useRunAtsAnalysis, useExportResume, useResumeVersions, useRestoreVersion } from "@/lib/hooks/queries/use-resumes";
import { toast } from "sonner";

export default function ResumeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.id as string;
  const { data: resume, isLoading } = useResume(resumeId);
  const updateResume = useUpdateResume();
  const runAnalysis = useRunAtsAnalysis(resumeId);
  const exportResume = useExportResume();

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (resume) {
      setTitle(resume.title);
      setContent(resume.content || {});
    }
  }, [resume]);

  const handleSave = async () => {
    try {
      await updateResume.mutateAsync({ id: resumeId, title, content });
      toast.success("Resume saved");
    } catch {
      toast.error("Failed to save resume");
    }
  };

  const handleAnalyze = async () => {
    try {
      await runAnalysis.mutateAsync();
      toast.success("ATS analysis complete");
    } catch {
      toast.error("Failed to run analysis");
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    try {
      const blob = await exportResume.mutateAsync({ id: resumeId, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export resume");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[500px] w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <Breadcrumb items={[{ label: "Resumes", href: "/(dashboard)/resumes" }, { label: title || "Editor" }]} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-lg font-bold" />
        </div>
        <div className="flex items-center gap-2">
          {resume?.atsScore != null && (
            <Badge variant={resume.atsScore >= 80 ? "default" : resume.atsScore >= 60 ? "secondary" : "destructive"}>
              ATS Score: {resume.atsScore}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={runAnalysis.isPending}>
            {runAnalysis.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <BarChart3 className="mr-1 h-3 w-3" />}
            Analyze
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={exportResume.isPending}>
            <Download className="mr-1 h-3 w-3" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("docx")} disabled={exportResume.isPending}>
            <Download className="mr-1 h-3 w-3" /> DOCX
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateResume.isPending}>
            {updateResume.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="ats">ATS Analysis</TabsTrigger>
          <TabsTrigger value="versions">Version History</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <Card>
            <CardContent className="p-6 space-y-6">
              <ResumeEditor content={content} onChange={setContent} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ats">
          <AtsAnalysisView resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="versions">
          <VersionsView resumeId={resumeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface SectionData {
  [key: string]: unknown;
  title?: string;
  items?: Array<Record<string, string>>;
  text?: string;
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

function ResumeEditor({ content, onChange }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }) {
  const sections = ["personalInfo", "education", "experience", "skills", "projects", "certifications"] as const;

  const updateSection = (key: string, data: SectionData) => {
    onChange({ ...content, [key]: data });
  };

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const data = (content[section] as SectionData) || {};
        return (
          <div key={section} className="space-y-3">
            <h3 className="text-lg font-semibold capitalize">{section.replace(/([A-Z])/g, " $1").trim()}</h3>
            <Separator />
            {section === "personalInfo" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={data.name || ""} onChange={(e) => updateSection(section, { ...data, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={data.email || ""} onChange={(e) => updateSection(section, { ...data, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={data.phone || ""} onChange={(e) => updateSection(section, { ...data, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn</Label>
                  <Input value={data.linkedin || ""} onChange={(e) => updateSection(section, { ...data, linkedin: e.target.value })} />
                </div>
              </div>
            ) : section === "skills" ? (
              <div className="space-y-2">
                <Label>Skills (comma-separated)</Label>
                <Textarea
                  value={data.text || ""}
                  onChange={(e) => updateSection(section, { ...data, text: e.target.value })}
                  placeholder="JavaScript, React, Node.js, Python..."
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={data.text || ""}
                  onChange={(e) => updateSection(section, { ...data, text: e.target.value })}
                  placeholder={`Add your ${section} details...`}
                  rows={4}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AtsAnalysisView({ resumeId }: { resumeId: string }) {
  const { data: resume } = useResume(resumeId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ATS Score: {resume?.atsScore ?? "Not analyzed yet"}</CardTitle>
        <CardDescription>Run an analysis to get detailed feedback on your resume&apos;s ATS compatibility.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Click &quot;Analyze&quot; in the toolbar to run ATS analysis on your resume.</p>
      </CardContent>
    </Card>
  );
}

function VersionsView({ resumeId }: { resumeId: string }) {
  const { data: versions = [], isLoading } = useResumeVersions(resumeId);
  const restoreVersion = useRestoreVersion();

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion.mutateAsync({ resumeId, versionId });
      toast.success("Version restored");
    } catch {
      toast.error("Failed to restore version");
    }
  };

  if (isLoading) return <Skeleton className="h-[200px] w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
        <CardDescription>Restore a previous version of your resume</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.length === 0 ? (
          <p className="text-muted-foreground">No version history yet. Save your resume to create versions.</p>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Version {v.versionNumber}</p>
                <p className="text-sm text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleRestore(v.id)} disabled={restoreVersion.isPending}>
                Restore
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
