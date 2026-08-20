"use client";

import * as React from "react";
import { Award, Download, ExternalLink, Loader2, Plus, Search, Share2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useMyCertificates, useIssueCertificate, useDownloadCertificatePdf, useShareToLinkedin, useVerifyCertificate } from "@/lib/hooks/queries/use-certificates";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function CertificatesPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Certificates" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Certificates</h1>
        <p className="text-muted-foreground">Manage and share your certificates</p>
      </div>
      <Tabs defaultValue="my" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my">My Certificates</TabsTrigger>
          <TabsTrigger value="verify">Verify</TabsTrigger>
        </TabsList>
        <TabsContent value="my"><MyCertificates /></TabsContent>
        <TabsContent value="verify"><VerifyCertificate /></TabsContent>
      </Tabs>
    </div>
  );
}

function Tabs(props: { defaultValue: string; children: React.ReactNode; className?: string }) {
  return <div className={props.className}>{props.children}</div>;
}
function TabsList(props: { children: React.ReactNode }) { return <div className="flex gap-2 mb-6">{props.children}</div>; }
function TabsTrigger(props: { value: string; children: React.ReactNode }) { return <Button variant="outline">{props.children}</Button>; }
function TabsContent(props: { value: string; children: React.ReactNode }) { return <div>{props.children}</div>; }

function MyCertificates() {
  const { data: certs = [], isLoading } = useMyCertificates();
  const downloadPdf = useDownloadCertificatePdf();
  const shareLinkedin = useShareToLinkedin();
  const issueCert = useIssueCertificate();
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [email, setEmail] = React.useState("");

  const handleIssue = async () => {
    if (!title.trim() || !email.trim()) { toast.error("Fill in all fields"); return; }
    try {
      await issueCert.mutateAsync({ title, recipientEmail: email });
      setIssueOpen(false);
      setTitle("");
      setEmail("");
      toast.success("Certificate issued!");
    } catch {
      toast.error("Failed to issue certificate");
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const blob = await downloadPdf.mutateAsync(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleShare = async (id: string) => {
    try {
      const result = await shareLinkedin.mutateAsync(id);
      if (result.url) window.open(result.url, "_blank");
      toast.success("LinkedIn share URL generated!");
    } catch {
      toast.error("Failed to share");
    }
  };

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Issue Certificate</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue Certificate</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Completion Certificate" />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recipient@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button onClick={handleIssue} disabled={issueCert.isPending}>
                {issueCert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {certs.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-2">No certificates yet.</p>}
        {certs.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-lg">{c.title}</CardTitle>
              </div>
              <CardDescription>{c.recipientName} · {formatDate(c.issueDate)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span>Code: {c.verificationCode}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDownload(c.id, c.title)} disabled={downloadPdf.isPending}>
                  <Download className="mr-1 h-3 w-3" /> PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleShare(c.id)} disabled={shareLinkedin.isPending}>
                  <Share2 className="mr-1 h-3 w-3" /> LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VerifyCertificate() {
  const [code, setCode] = React.useState("");
  const [searchCode, setSearchCode] = React.useState("");
  const { data: cert, isLoading } = useVerifyCertificate(searchCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify Certificate</CardTitle>
        <CardDescription>Enter a verification code to check authenticity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Enter verification code" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button onClick={() => setSearchCode(code)} disabled={!code.trim()}>Verify</Button>
        </div>
        {isLoading && <Skeleton className="h-20 w-full" />}
        {cert && (
          <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
            <p className="font-medium text-green-700 dark:text-green-300">Certificate Verified!</p>
            <p className="text-sm mt-1">{cert.title} — issued to {cert.recipientName} on {formatDate(cert.issueDate)}</p>
          </div>
        )}
        {searchCode && !isLoading && !cert && (
          <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950">
            <p className="font-medium text-red-700 dark:text-red-300">Certificate not found</p>
            <p className="text-sm mt-1">The verification code is invalid.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
