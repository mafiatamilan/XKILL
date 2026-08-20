"use client";

import * as React from "react";
import { Search, Building2, Code2, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useCompanyPrepList, useCompanyQuestions, useCompanySalaryInsights } from "@/lib/hooks/queries/use-company-prep";

export default function CompanyPrepPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Company Prep" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Preparation</h1>
        <p className="text-muted-foreground">Prepare for specific company hiring processes</p>
      </div>
      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>
        <TabsContent value="companies"><CompanyList /></TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyList() {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useCompanyPrepList({ page, limit: 10, search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search companies..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.data?.map((c) => (
            <Card key={c.slug} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.industry}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline"><Code2 className="mr-1 h-3 w-3" />{c.questionCount} questions</Badge>
                      <Badge>{c.difficulty}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-2">No companies found.</p>}
        </div>
      )}
    </div>
  );
}
