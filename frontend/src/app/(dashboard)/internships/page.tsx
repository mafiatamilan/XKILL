"use client";

import * as React from "react";
import { Search, Briefcase, MapPin, Clock, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useInternshipSearch } from "@/lib/hooks/queries/use-internships";
import { formatDate } from "@/lib/utils";

export default function InternshipsPage() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useInternshipSearch({ page, limit: 10, search: search || undefined });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Internships" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Internship Portal</h1>
        <p className="text-muted-foreground">Find internships to kickstart your career</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search internships..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No internships found.</p>}
          {data?.data?.map((i) => (
            <Card key={i.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Briefcase className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-sm text-muted-foreground">{i.companyName}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{i.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{i.duration}</span>
                    {i.stipend && <span>₹{i.stipend.toLocaleString()}/mo</span>}
                  </div>
                </div>
                <Badge variant={i.isActive ? "default" : "secondary"}>{i.isActive ? "Open" : "Closed"}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
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
