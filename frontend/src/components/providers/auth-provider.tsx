"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api, setAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAccessToken: storeSetToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const initializeAuth = async () => {
      try {
        const { data } = await api.get("/auth/me");
        const user: User = data;
        setAccessToken(data.accessToken);
        storeSetToken(data.accessToken);
        setUser(user);
      } catch {
        storeSetToken(null);
        const publicRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];
        if (!publicRoutes.includes(pathname)) {
          router.push("/auth/login");
        }
      }
    };
    initializeAuth();
  }, []);

  if (!mounted) {
    return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return <>{children}</>;
}
