"use client";

import * as React from "react";
import { Shield, Users, Settings, Flag, Activity, AlertTriangle, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { api } from "@/lib/api";

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Platform Admin" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Administration</h1>
        <p className="text-muted-foreground">Manage users, roles, and system settings</p>
      </div>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><AdminOverview /></TabsContent>
        <TabsContent value="users"><UsersManagement /></TabsContent>
        <TabsContent value="roles"><RolesManagement /></TabsContent>
        <TabsContent value="flags"><FeatureFlags /></TabsContent>
        <TabsContent value="audit"><AuditLogs /></TabsContent>
      </Tabs>
    </div>
  );
}

function AdminOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">System Status</p>
              <p className="text-2xl font-bold text-green-500">Healthy</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">API Status</p>
              <p className="text-2xl font-bold text-green-500">Operational</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Maintenance</p>
              <p className="text-2xl font-bold">Off</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersManagement() {
  const [users, setUsers] = React.useState<Array<{ id: string; name: string; email: string; role: string; isActive: boolean }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get("/admin/users").then((r) => { setUsers(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle>Users</CardTitle><CardDescription>Manage platform users</CardDescription></CardHeader>
      <CardContent className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">{u.name}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{u.role}</Badge>
              <Badge variant={u.isActive ? "default" : "destructive"}>{u.isActive ? "Active" : "Suspended"}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RolesManagement() {
  return (
    <Card>
      <CardHeader><CardTitle>Roles & Permissions</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {["admin", "college_admin", "faculty", "student", "recruiter", "tpo", "mentor", "parent"].map((role) => (
            <div key={role} className="flex items-center justify-between p-3 rounded-lg border">
              <p className="font-medium capitalize">{role.replace("_", " ")}</p>
              <Badge variant="outline">{role}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureFlags() {
  return (
    <Card>
      <CardHeader><CardTitle>Feature Flags</CardTitle></CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Feature flags can be toggled to enable/disable platform features.</p>
      </CardContent>
    </Card>
  );
}

function AuditLogs() {
  return (
    <Card>
      <CardHeader><CardTitle>Audit Logs</CardTitle></CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Audit logs track all administrative actions on the platform.</p>
      </CardContent>
    </Card>
  );
}
