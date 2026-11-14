import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGym } from "./useGym";
import { msDue, msNet, msStatus } from "@/services/selectors";
import type { DB } from "@/types";

/**
 * Member-scoped data access. This is the ONLY way member pages read data, so a
 * member can never see another member's personal or financial records.
 * (With a backend this becomes GET /me/* endpoints.)
 */
export function selectMyAccount(db: DB, memberId: string) {
  const member = db.members.find((m) => m.id === memberId);
  if (!member) return null;
  const memberships = db.memberships.filter((m) => m.memberId === memberId).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const payments = db.payments.filter((p) => p.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const charges = db.charges.filter((c) => c.memberId === memberId).sort((a, b) => b.date.localeCompare(a.date));
  const attendance = db.attendance.filter((a) => a.memberId === memberId).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const renewals = db.renewals.filter((r) => r.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tickets = db.tickets.filter((t) => t.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { member, memberships, payments, charges, attendance, renewals, tickets, plans: db.plans.filter((p) => p.active), gym: db.settings };
}

export function useMyAccount() {
  const { session } = useAuth();
  const { db, ix, loading } = useGym();
  const acc = useMemo(() => (session?.role === "member" ? selectMyAccount(db, session.userId) : null), [db, session]);
  const derived = useMemo(() => {
    if (!acc) return null;
    const current = ix.latestMs.get(acc.member.id);
    const status = ix.status.get(acc.member.id)!;
    const membershipDue = acc.memberships.reduce((s, m) => s + msDue(m, ix), 0);
    const chargeDue = acc.charges.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    return { current, status, membershipDue, chargeDue, pending: membershipDue + chargeDue, msDue: (id: string) => { const m = acc.memberships.find((x) => x.id === id); return m ? msDue(m, ix) : 0; }, msNet, msStatus };
  }, [acc, ix]);
  return { acc, d: derived, loading };
}
