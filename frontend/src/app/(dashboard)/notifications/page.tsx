"use client";

import * as React from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/hooks/queries/use-notifications";
import { formatRelativeTime } from "@/lib/utils";

export default function NotificationsPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useNotifications({ page, limit: 20 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Notifications" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated on your activities</p>
        </div>
        <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
          {markAllRead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {(!data?.data || data.data.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications yet.</p>
              </CardContent>
            </Card>
          )}
          {data?.data?.map((n) => (
            <Card key={n.id} className={!n.readAt ? "border-l-4 border-l-primary" : ""}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    {!n.readAt && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.readAt && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                    Mark read
                  </Button>
                )}
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
