"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@speckyai/ui/components/ui/select";
import { Badge } from "@speckyai/ui/components/ui/badge";

import { withAuth } from "../../../components/withAuth";
import { createSupabaseBrowserClient } from "../../../lib/supabaseClient";
import { useAuthStore, type WorkspaceRole } from "../../../stores/authStore";

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
};

function TeamSettingsPageInner() {
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    async function loadMembers() {
      const { data, error: loadError } = await supabase
        .from("workspace_members")
        .select("user_id,role,created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message);
        return;
      }
      setMembers((data ?? []) as MemberRow[]);
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [supabase, workspaceId]);

  async function invite() {
    if (!workspaceId) return;
    setIsInviting(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, email: inviteEmail, role: inviteRole })
    });

    setIsInviting(false);

    if (!res.ok) {
      setError(await res.text().catch(() => "Invite failed."));
      return;
    }

    setMessage(`Invite sent to ${inviteEmail}`);
    setInviteEmail("");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Invite email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          <Button onClick={invite} disabled={isInviting || !inviteEmail || !workspaceId}>
            {isInviting ? "Sending…" : "Send invite"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!workspaceId ? (
            <p className="text-sm text-slate-600">No workspace selected.</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-600">No members found.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="text-sm">
                    <div className="font-medium">{m.user_id}</div>
                    <div className="text-slate-500">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <Badge variant="secondary">{m.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default withAuth(TeamSettingsPageInner, { minRole: "admin" });

