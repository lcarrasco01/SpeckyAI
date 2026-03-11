import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

type AuthState = {
  user: User | null;
  session: Session | null;
  role: WorkspaceRole | null;
  workspaceId: string | null;

  setAuth: (next: { user: User | null; session: Session | null }) => void;
  setWorkspace: (next: { role: WorkspaceRole | null; workspaceId: string | null }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      role: null,
      workspaceId: null,
      setAuth: ({ user, session }) => set({ user, session }),
      setWorkspace: ({ role, workspaceId }) => set({ role, workspaceId }),
      clear: () => set({ user: null, session: null, role: null, workspaceId: null })
    }),
    {
      name: "speckyai-auth",
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        role: state.role,
        workspaceId: state.workspaceId
      })
    }
  )
);

