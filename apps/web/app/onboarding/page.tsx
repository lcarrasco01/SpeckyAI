"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { createSupabaseBrowserClient } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [router, user]);

  useEffect(() => {
    if (workspaceId) router.replace("/dashboard");
  }, [router, workspaceId]);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    const { data: ws, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name: workspaceName, created_by: user.id })
      .select("id")
      .single();

    if (wsError) {
      setIsLoading(false);
      setError(wsError.message);
      return;
    }

    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: "owner"
    });

    setIsLoading(false);

    if (memberError) {
      setError(memberError.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Acme Studio"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

