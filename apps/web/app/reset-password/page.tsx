"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";
import { getPublicEnv } from "../../lib/env";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const env = getPublicEnv();
    const redirectTo = `${env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/update-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("If an account exists, you’ll receive a reset email shortly.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
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
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending…" : "Send reset email"}
            </Button>
            <div className="text-center text-sm text-slate-600">
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => router.push("/login")}
              >
                Back to login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

