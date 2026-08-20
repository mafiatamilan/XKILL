"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Briefcase, MapPin, Clock, DollarSign, Bookmark, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useJobSearch, useMyApplications } from "@/lib/hooks/queries/use-jobs";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Jobs" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Marketplace</h1>
        <p className="text-muted-foreground">Find your next opportunity</p>
      </div>
      <Tabs defaultValue="search" className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Search Jobs</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
        </TabsList>
        <TabsContent value="search"><JobSearch /></TabsContent>
        <TabsContent value="applications"><MyApplications /></TabsContent>
      </Tabs>
    </div>
  );
}

function JobSearch() {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useJobSearch({ page, limit: 10, search: search || undefined, type: type || undefined });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs by title or company..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={type} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="full_time">Full Time</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="internship">Internship</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No jobs found.</p>}
          {data?.data?.map((job) => (
            <Link key={job.id} href={`/(dashboard)/jobs/${job.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Briefcase className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.companyName}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.type.replace("_", " ")}</span>
                      {job.salaryMin && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(job.salaryMin)}-{formatCurrency(job.salaryMax || 0)}</span>}
                    </div>
                  </div>
                  <Badge variant={job.isActive ? "default" : "secondary"}>{job.isActive ? "Active" : "Closed"}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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

function MyApplications() {
  const { data, isLoading } = useMyApplications();
  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {(!data?.data || data.data.length === 0) && <p className="text-center text-muted-foreground py-8">No applications yet.</p>}
      {data?.data?.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{a.jobTitle}</p>
              <p className="text-sm text-muted-foreground">{a.companyName} · Applied {formatDate(a.appliedAt)}</p>
            </div>
            <Badge variant={a.status === "offered" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}>
              {a.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
