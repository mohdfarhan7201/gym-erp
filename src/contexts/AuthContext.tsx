import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { PermissionKey, Role, Session } from "@/types";
import { authService } from "@/services/authService";
import { useDB } from "@/hooks/useGym";

interface AuthCtx {
  session: Session | null;
  login: (email: string, password: string) => Promise<Session>;
  logout: () => void;
  refresh: () => void;
  can: (p: PermissionKey) => boolean;
}
const Ctx = createContext<AuthCtx | null>(null);

export const panelBase: Record<Role, string> = { admin: "/admin", receptionist: "/reception", member: "/member" };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => authService.getSession());
  const db = useDB();

  const login = useCallback(async (email: string, password: string) => {
    const s = await authService.login(email, password);
    setSession(s);
    return s;
  }, []);
  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);
  const refresh = useCallback(() => setSession(authService.getSession()), []);

  const can = useCallback(
    (p: PermissionKey) => {
      if (!session) return false;
      if (session.role === "admin") return true;
      if (session.role === "member") return false;
      const st = db.staff.find((s) => s.id === session.userId);
      return !!st?.permissions[p];
    },
    [session, db.staff],
  );

  const value = useMemo(() => ({ session, login, logout, refresh, can }), [session, login, logout, refresh, can]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

/** Current panel info: role + base path for building links shared across admin/reception pages. */
export function usePanel() {
  const { session } = useAuth();
  const role = session?.role ?? "admin";
  const base = panelBase[role];
  return { role, base, to: (p: string) => `${base}/${p.replace(/^\//, "")}`, isAdmin: role === "admin" };
}
