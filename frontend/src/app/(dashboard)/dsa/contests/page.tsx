"use client";

import * as React from "react";
import { Trophy, Clock, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useContests, useRegisterContest } from "@/lib/hooks/queries/use-dsa";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ContestsPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useContests({ page, limit: 10 });
  const registerContest = useRegisterContest();

  const handleRegister = async (id: string) => {
    try {
      await registerContest.mutateAsync(id);
      toast.success("Registered for contest!");
    } catch {
      toast.error("Failed to register");
    }
  };

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "DSA", href: "/(dashboard)/dsa" }, { label: "Contests" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contests</h1>
        <p className="text-muted-foreground">Compete with others and test your skills</p>
      </div>

      <div className="space-y-4">
        {data?.data?.length === 0 && <p className="text-center text-muted-foreground py-8">No contests available.</p>}
        {data?.data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-6 flex items-center gap-6">
              <div className="flex-shrink-0">
                <Trophy className={`h-10 w-10 ${c.status === "active" ? "text-yellow-500" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{c.title}</h3>
                  <Badge variant={c.status === "active" ? "default" : c.status === "upcoming" ? "secondary" : "outline"}>
                    {c.status}
                  </Badge>
                  {c.isRated && <Badge variant="outline">Rated</Badge>}
                </div>
                {c.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{c.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{c.durationMinutes} min</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.participantCount} participants</span>
                  <span>{formatDate(c.startTime)}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                {c.status === "upcoming" ? (
                  <Button onClick={() => handleRegister(c.id)} disabled={registerContest.isPending}>
                    {registerContest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Register
                  </Button>
                ) : c.status === "active" ? (
                  <Button>Join</Button>
                ) : (
                  <Button variant="outline">Results</Button>
                )}
              </div>
            </CardContent>
          </Card>
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
