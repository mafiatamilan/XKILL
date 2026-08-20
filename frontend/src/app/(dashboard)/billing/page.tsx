"use client";

import * as React from "react";
import { CreditCard, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { usePlans, useMySubscription, useSubscribe, useCancelSubscription, useInvoices } from "@/lib/hooks/queries/use-billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Billing" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-muted-foreground">Manage your plan and payment history</p>
      </div>
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscription">My Subscription</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="plans"><PlansView /></TabsContent>
        <TabsContent value="subscription"><SubscriptionView /></TabsContent>
        <TabsContent value="invoices"><InvoicesView /></TabsContent>
      </Tabs>
    </div>
  );
}

function PlansView() {
  const { data: plans = [], isLoading } = usePlans();
  const subscribe = useSubscribe();
  const [coupon, setCoupon] = React.useState("");

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribe.mutateAsync({ planId, couponCode: coupon || undefined });
      toast.success("Subscribed successfully!");
    } catch {
      toast.error("Failed to subscribe");
    }
  };

  if (isLoading) return <div className="grid gap-4 md:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className="relative">
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{formatCurrency(p.price)}</span>
                <span className="text-muted-foreground">/{p.interval}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => handleSubscribe(p.id)} disabled={subscribe.isPending}>
                {subscribe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Subscribe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Label>Coupon Code</Label>
            <Input className="max-w-xs" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Enter coupon" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionView() {
  const { data: sub, isLoading } = useMySubscription();
  const cancel = useCancelSubscription();

  if (isLoading) return <Skeleton className="h-[200px] w-full" />;

  return (
    <Card>
      <CardContent className="p-6">
        {sub ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-lg">{sub.planName}</p>
                <p className="text-sm text-muted-foreground">Expires {formatDate(sub.endDate)}</p>
              </div>
              <Badge variant={sub.status === "active" ? "default" : "destructive"}>{sub.status}</Badge>
            </div>
            <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {cancel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground">No active subscription. Choose a plan to get started.</p>
        )}
      </CardContent>
    </Card>
  );
}

function InvoicesView() {
  const { data: invoices = [], isLoading } = useInvoices();

  if (isLoading) return <Skeleton className="h-[300px] w-full" />;

  return (
    <div className="space-y-3">
      {invoices.length === 0 && <p className="text-center text-muted-foreground py-8">No invoices yet.</p>}
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{inv.description}</p>
              <p className="text-sm text-muted-foreground">{formatDate(inv.date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">{formatCurrency(inv.amount)}</span>
              <Badge variant={inv.status === "paid" ? "default" : inv.status === "pending" ? "secondary" : "destructive"}>
                {inv.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
