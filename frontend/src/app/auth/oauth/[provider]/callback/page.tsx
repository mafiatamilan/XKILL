"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");

  React.useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");

    if (!accessToken) {
      setStatus("error");
      return;
    }

    api
      .post("/auth/oauth/callback", { accessToken })
      .then(() => {
        setStatus("success");
        toast.success("Signed in successfully!");
        router.push("/(dashboard)");
      })
      .catch(() => {
        setStatus("error");
        toast.error("OAuth sign-in failed");
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === "loading" && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />}
          {status === "error" && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
          <CardTitle className="text-2xl">
            {status === "loading" && "Signing you in..."}
            {status === "success" && "Welcome!"}
            {status === "error" && "Sign-in failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we complete your sign-in."}
            {status === "success" && "Redirecting to dashboard..."}
            {status === "error" && "Something went wrong. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <Link href="/auth/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
