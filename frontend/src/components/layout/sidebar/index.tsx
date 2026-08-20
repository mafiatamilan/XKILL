"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Code2,
  Briefcase,
  MessageSquare,
  Trophy,
  User,
  Settings,
  GraduationCap,
  FileText,
  Target,
  Users,
  CreditCard,
  FlaskConical,
  Bot,
  Star,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  Menu,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { useTheme } from "next-themes";
import type { Role } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/(dashboard)", icon: LayoutDashboard },
  { label: "Profile", href: "/(dashboard)/student/profile", icon: User, roles: ["student"] },
  { label: "Academics", href: "/(dashboard)/academics", icon: BookOpen, roles: ["student", "faculty"] },
  { label: "DSA Practice", href: "/(dashboard)/dsa", icon: Code2, roles: ["student"] },
  { label: "Placement", href: "/(dashboard)/placement", icon: Target, roles: ["student"] },
  { label: "Interviews", href: "/(dashboard)/interviews", icon: MessageSquare, roles: ["student"] },
  { label: "Career Coach", href: "/(dashboard)/career", icon: Bot, roles: ["student"] },
  { label: "Resumes", href: "/(dashboard)/resumes", icon: FileText, roles: ["student"] },
  { label: "Leaderboards", href: "/(dashboard)/leaderboards", icon: Trophy, roles: ["student"] },
  { label: "Gamification", href: "/(dashboard)/gamification", icon: Star, roles: ["student"] },
  { label: "Certificates", href: "/(dashboard)/certificates", icon: GraduationCap, roles: ["student"] },
  { label: "Community", href: "/(dashboard)/community", icon: Users, roles: ["student"] },
  { label: "Jobs", href: "/(dashboard)/jobs", icon: Briefcase, roles: ["student", "recruiter"] },
  { label: "Internships", href: "/(dashboard)/internships", icon: Briefcase, roles: ["student"] },
  { label: "Mentors", href: "/(dashboard)/mentors", icon: Star, roles: ["student"] },
  { label: "Company Prep", href: "/(dashboard)/company-prep", icon: Search, roles: ["student"] },
  { label: "Lab", href: "/(dashboard)/lab", icon: FlaskConical, roles: ["student", "faculty"] },
  { label: "AI Services", href: "/(dashboard)/ai", icon: Bot, roles: ["student"] },
  { label: "Billing", href: "/(dashboard)/billing", icon: CreditCard, roles: ["student"] },
  { label: "Faculty", href: "/(dashboard)/faculty", icon: BookOpen, roles: ["faculty"] },
  { label: "Recruiter", href: "/(dashboard)/recruiter", icon: Briefcase, roles: ["recruiter"] },
  { label: "TPO", href: "/(dashboard)/tpo", icon: GraduationCap, roles: ["tpo"] },
  { label: "College Admin", href: "/(dashboard)/college-admin", icon: Settings, roles: ["college_admin"] },
  { label: "Admin", href: "/(dashboard)/admin", icon: Settings, roles: ["admin"] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const role = user?.role;

  const filteredItems = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-4">
        <Code2 className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">XKILL</span>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="text-xs">{user?.fullName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{user?.fullName || "User"}</span>
              <ChevronDown className="ml-auto h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="mr-2 h-4 w-4" />
              System
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Link href="/settings/profile">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          !sidebarOpen && "lg:w-0 lg:overflow-hidden"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Toggle button for desktop */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn(
          "hidden lg:flex fixed top-4 z-50 h-8 w-8 items-center justify-center rounded-md border bg-background hover:bg-accent",
          sidebarOpen ? "left-64" : "left-0"
        )}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
      </Button>
    </>
  );
}
