"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<"loading" | "success" | "error">("loading");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setStatus("success");
        toast.success("Email verified! You can now login.");
      })
      .catch(() => {
        setStatus("error");
        toast.error("Invalid or expired verification link");
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === "loading" && <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />}
          {status === "error" && <XCircle className="mx-auto h-12 w-12 text-destructive" />}
          <CardTitle className="text-2xl">
            {status === "loading" && "Verifying email..."}
            {status === "success" && "Email verified!"}
            {status === "error" && "Verification failed"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Please wait while we verify your email address."}
            {status === "success" && "Your email has been verified. You can now sign in."}
            {status === "error" && "The verification link is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
