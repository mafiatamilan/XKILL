"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  Briefcase,
  Target,
  MessageSquare,
  Trophy,
  Star,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Flame,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DashboardData {
  readinessScore: number;
  problemsSolved: number;
  totalProblems: number;
  streak: number;
  xp: number;
  level: number;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
  }>;
}

const QUICK_ACTIONS = [
  { label: "DSA Practice", href: "/(dashboard)/dsa", icon: Code2, color: "text-blue-500" },
  { label: "Placement Prep", href: "/(dashboard)/placement", icon: Target, color: "text-green-500" },
  { label: "Mock Interview", href: "/(dashboard)/interviews", icon: MessageSquare, color: "text-purple-500" },
  { label: "Browse Jobs", href: "/(dashboard)/jobs", icon: Briefcase, color: "text-orange-500" },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: dashboard } = await api.get("/students/me/dashboard");
        setData(dashboard);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.fullName?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-muted-foreground">Here&apos;s your placement readiness overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Readiness Score</p>
                <p className="text-3xl font-bold">{data?.readinessScore || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Problems Solved</p>
                <p className="text-3xl font-bold">{data?.problemsSolved || 0}/{data?.totalProblems || 0}</p>
              </div>
              <Code2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Day Streak</p>
                <p className="text-3xl font-bold">{data?.streak || 0}</p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Level</p>
                <p className="text-3xl font-bold">{data?.level || 1}</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Card key={action.href} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(action.href)}>
              <CardContent className="p-6 flex items-center gap-4">
                <action.icon className={`h-8 w-8 ${action.color}`} />
                <div>
                  <p className="font-medium">{action.label}</p>
                  <p className="text-sm text-muted-foreground">Get started</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Readiness Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Readiness Breakdown</CardTitle>
          <CardDescription>Your scores across different areas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: "DSA", score: 75 },
              { label: "Aptitude", score: 60 },
              { label: "Interview", score: 45 },
              { label: "Resume", score: 80 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium">{item.label}</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${item.score}%` }} />
                </div>
                <span className="w-10 text-sm text-right text-muted-foreground">{item.score}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/(dashboard)/placement")}>
          <CardContent className="p-6">
            <Target className="h-6 w-6 text-green-500 mb-2" />
            <p className="font-medium">Weekly Roadmap</p>
            <p className="text-sm text-muted-foreground">Continue your placement prep</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/(dashboard)/dsa/contests")}>
          <CardContent className="p-6">
            <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
            <p className="font-medium">Active Contests</p>
            <p className="text-sm text-muted-foreground">Compete and climb the leaderboard</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/(dashboard)/mentors")}>
          <CardContent className="p-6">
            <Star className="h-6 w-6 text-purple-500 mb-2" />
            <p className="font-medium">Find a Mentor</p>
            <p className="text-sm text-muted-foreground">Get guidance from industry experts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
