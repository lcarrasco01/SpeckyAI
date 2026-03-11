"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";
import { getPublicEnv } from "../../lib/env";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const env = getPublicEnv();
    const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/verify-email`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo }
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.replace("/verify-email");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your SpeckyAI account</CardTitle>
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
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create account"}
            </Button>
            <div className="text-center text-sm text-slate-600">
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => router.push("/login")}
              >
                Already have an account? Log in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

