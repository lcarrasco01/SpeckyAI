"use client";

import { useRouter } from "next/navigation";
import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";

import { useAuthStore } from "../../stores/authStore";
import { createSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="text-xl font-semibold">
          Dashboard
          <span className="ml-2 text-sm font-normal text-slate-500">
            {user?.email ? `(${user.email})` : ""}
          </span>
        </div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>SpeckyAI</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Next steps: start a recording, watch live transcript chunks arrive, then generate notes,
          export a PDF, and email it.
        </CardContent>
      </Card>
    </main>
  );
}

