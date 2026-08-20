"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Clock, DollarSign, Building2, Loader2, Bookmark } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useJob, useApplyToJob, useSaveJob } from "@/lib/hooks/queries/use-jobs";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { data: job, isLoading } = useJob(jobId);
  const applyToJob = useApplyToJob();
  const saveJob = useSaveJob();

  const handleApply = async () => {
    try {
      await applyToJob.mutateAsync(jobId);
      toast.success("Application submitted!");
    } catch {
      toast.error("Failed to apply");
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!job) return <p className="text-center py-8">Job not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <Breadcrumb items={[{ label: "Jobs", href: "/(dashboard)/jobs" }, { label: job.title }]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Building2 className="h-4 w-4" />{job.companyName}
                  </CardDescription>
                </div>
                <Badge>{job.type.replace("_", " ")}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                {job.salaryMin && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{formatCurrency(job.salaryMin)} - {formatCurrency(job.salaryMax || 0)}</span>}
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Deadline: {formatDate(job.deadline)}</span>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.description}</p>
              </div>
              {job.requirements.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Requirements</h3>
                  <ul className="space-y-1">
                    {job.requirements.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-3">
              <Button className="w-full" onClick={handleApply} disabled={applyToJob.isPending}>
                {applyToJob.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Now
              </Button>
              <Button className="w-full" variant="outline" onClick={() => saveJob.mutate(jobId)} disabled={saveJob.isPending}>
                <Bookmark className="mr-2 h-4 w-4" />
                Save Job
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
