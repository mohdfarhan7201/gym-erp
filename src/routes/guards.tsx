import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { panelBase, useAuth } from "@/contexts/AuthContext";
import type { PermissionKey, Role } from "@/types";
import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

/** Frontend route protection: requires a session with the given role. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (session.role !== role) return <Navigate to={panelBase[session.role]} replace />;
  return <>{children}</>;
}

/** Hides a page from receptionists whose permission was revoked by the owner. */
export function RequirePermission({ perm, children }: { perm: PermissionKey; children: ReactNode }) {
  const { can, session } = useAuth();
  if (can(perm)) return <>{children}</>;
  return (
    <div className="rounded-xl border bg-card">
      <EmptyState
        icon={Lock}
        title="Access restricted"
        description="The gym owner hasn't given your account permission for this action. Ask the owner to enable it under Staff → Permissions."
        action={<Button asChild variant="outline"><Link to={session ? panelBase[session.role] : "/login"}>Back to dashboard</Link></Button>}
      />
    </div>
  );
}

export function NotFound() {
  const { session } = useAuth();
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
        action={<Button asChild variant="lime"><Link to={session ? panelBase[session.role] : "/login"}>Go to dashboard</Link></Button>}
      />
    </div>
  );
}
