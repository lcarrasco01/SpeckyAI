"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. You can now log in.");
    setTimeout(() => router.replace("/login"), 800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Update password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

