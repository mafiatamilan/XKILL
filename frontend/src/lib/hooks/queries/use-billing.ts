import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SubscriptionPlan } from "@/lib/types";

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: "active" | "cancelled" | "expired";
  startDate: string;
  endDate: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  date: string;
  description: string;
}

export function usePlans() {
  return useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => api.get<{ data: SubscriptionPlan[] }>("/billing/plans").then((r) => r.data.data),
  });
}

export function useSubscribe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { planId: string; couponCode?: string }) => api.post("/billing/subscribe", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-subscription"] }),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/billing/cancel"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-subscription"] }),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => api.get<Subscription>("/billing/subscription/me").then((r) => r.data),
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<{ data: Invoice[] }>("/billing/invoices").then((r) => r.data.data),
  });
}

export function useApplyCoupon() {
  return useMutation({
    mutationFn: (code: string) => api.post("/billing/coupons/apply", { code }).then((r) => r.data),
  });
}
