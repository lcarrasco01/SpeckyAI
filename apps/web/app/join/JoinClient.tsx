"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";

export default function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function accept() {
      setStatus("working");
      setError(null);
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (!cancelled) {
          setStatus("error");
          setError(text || "Failed to accept invite.");
        }
        return;
      }

      if (!cancelled) {
        setStatus("ok");
        setTimeout(() => router.replace("/dashboard"), 600);
      }
    }

    accept();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Join workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {!token ? (
            <p>Missing invite token.</p>
          ) : status === "working" ? (
            <p>Accepting invite…</p>
          ) : status === "ok" ? (
            <p>Invite accepted. Redirecting…</p>
          ) : status === "error" ? (
            <p className="text-red-600">{error ?? "Failed to accept invite."}</p>
          ) : (
            <p>Ready.</p>
          )}
          <div className="flex gap-3">
            <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
            <Button variant="secondary" onClick={() => router.push("/login")}>
              Log in
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

