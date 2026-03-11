"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthStore, type WorkspaceRole } from "../stores/authStore";

type Options = {
  minRole?: WorkspaceRole;
};

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
};

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Options = {}
): React.FC<P> {
  const { minRole } = options;

  const WithAuthWrapper = (props: P) => {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const role = useAuthStore((s) => s.role);

    useEffect(() => {
      if (!user) router.replace("/login");
    }, [router, user]);

    useEffect(() => {
      if (!minRole) return;
      if (!role) return;
      if (ROLE_ORDER[role] < ROLE_ORDER[minRole]) router.replace("/unauthorized");
    }, [role, router]);

    if (!user) return null;
    if (minRole && role && ROLE_ORDER[role] < ROLE_ORDER[minRole]) return null;
    return <Component {...props} />;
  };

  return WithAuthWrapper;
}

