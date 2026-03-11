"use client";

import { useEffect, useMemo } from "react";

import { createSupabaseBrowserClient } from "../lib/supabaseClient";
import { useAuthStore, type WorkspaceRole } from "../stores/authStore";

export function useAuth() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setWorkspace = useAuthStore((s) => s.setWorkspace);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setAuth({ user: data.session?.user ?? null, session: data.session ?? null });
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setAuth({ user: session?.user ?? null, session: session ?? null });
      if (!session) {
        clear();
      }
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: event === "SIGNED_OUT" ? "auth.sign_out" : "auth.sign_in"
        })
      }).catch(() => {});
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clear, setAuth, supabase]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      const session = (await supabase.auth.getSession()).data.session;
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id,role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      const row = data?.[0];
      if (cancelled) return;
      setWorkspace({
        workspaceId: row?.workspace_id ?? null,
        role: (row?.role as WorkspaceRole | undefined) ?? null
      });
    }

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [setWorkspace, supabase]);

  return { supabase };
}

