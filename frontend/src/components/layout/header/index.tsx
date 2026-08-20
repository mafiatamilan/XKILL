"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";
import { api } from "@/lib/api";

export function Header() {
  const { user } = useAuthStore();
  const { sidebarOpen } = useUiStore();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/notifications/me");
        const items = data.data || data;
        setNotifications(items.slice(0, 5));
        setUnreadCount(items.filter((n: Notification) => !n.readAt).length);
      } catch {
        // silent
      }
    };
    if (user) fetchNotifications();
  }, [user]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 transition-all duration-300",
        sidebarOpen ? "lg:pl-72" : "lg:pl-12"
      )}
    >
      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden md:block w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search problems, jobs, mentors..." className="pl-8" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">{unreadCount} unread</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-sm font-medium">{n.title}</span>
                    {!n.readAt && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <Link href="/(dashboard)/notifications" className="block">
              <DropdownMenuItem className="justify-center text-sm font-medium">
                View all notifications
                <ChevronRight className="ml-1 h-4 w-4" />
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
