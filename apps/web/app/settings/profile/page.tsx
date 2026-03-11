"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { useAuthStore } from "../../../stores/authStore";

export default function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const workspaceId = useAuthStore((s) => s.workspaceId);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <div>
            <span className="font-medium">Email:</span> {user?.email ?? "—"}
          </div>
          <div>
            <span className="font-medium">Workspace:</span> {workspaceId ?? "—"}
          </div>
          <div>
            <span className="font-medium">Role:</span> {role ?? "—"}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

