"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log in to SpeckyAI</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in…" : "Log in"}
            </Button>
            <div className="flex justify-between text-sm text-slate-600">
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => router.push("/reset-password")}
              >
                Forgot password?
              </button>
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => router.push("/signup")}
              >
                Create account
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

