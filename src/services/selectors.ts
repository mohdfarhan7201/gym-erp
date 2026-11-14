import type { DB, ExtraCharge, Member, MemberStatus, Membership, MembershipStatus, Payment } from "@/types";
import { daysLeft, today } from "@/utils/date";

/** Pre-computed lookups so pages don't rebuild them per render. Built once per DB snapshot. */
export interface GymIndex {
  memberById: Map<string, Member>;
  planName: Map<string, string>;
  latestMs: Map<string, Membership>;
  msByMember: Map<string, Membership[]>;
  paidByMs: Map<string, number>;
  status: Map<string, MemberStatus>;
  membershipDue: Map<string, number>;
  chargeDue: Map<string, number>;
  presentToday: Map<string, string>;
  attendanceCount: Map<string, number>;
  lastVisit: Map<string, string>;
  categoryName: Map<string, string>;
}

export const msStatus = (ms: Membership, t = today()): MembershipStatus =>
  ms.startDate > t ? "upcoming" : ms.endDate < t ? "expired" : "active";

export const msNet = (ms: Membership) => Math.max(0, ms.price - ms.discount);

const cache = new WeakMap<DB, GymIndex>();

export function buildIndex(db: DB): GymIndex {
  const hit = cache.get(db);
  if (hit) return hit;
  const t = today();
  const memberById = new Map(db.members.map((m) => [m.id, m]));
  const planName = new Map(db.plans.map((p) => [p.id, p.name]));
  const categoryName = new Map(db.categories.map((c) => [c.id, c.name]));
  const msByMember = new Map<string, Membership[]>();
  const latestMs = new Map<string, Membership>();
  for (const ms of db.memberships) {
    const arr = msByMember.get(ms.memberId);
    if (arr) arr.push(ms);
    else msByMember.set(ms.memberId, [ms]);
    const cur = latestMs.get(ms.memberId);
    // "current" = latest started membership; else the earliest upcoming one
    if (!cur) latestMs.set(ms.memberId, ms);
    else {
      const curStarted = cur.startDate <= t;
      const msStarted = ms.startDate <= t;
      if ((msStarted && (!curStarted || ms.startDate > cur.startDate)) || (!msStarted && !curStarted && ms.startDate < cur.startDate))
        latestMs.set(ms.memberId, ms);
    }
  }
  msByMember.forEach((a) => a.sort((x, y) => y.startDate.localeCompare(x.startDate)));

  const paidByMs = new Map<string, number>();
  for (const p of db.payments) if (p.membershipId) paidByMs.set(p.membershipId, (paidByMs.get(p.membershipId) ?? 0) + p.amount);

  const membershipDue = new Map<string, number>();
  for (const ms of db.memberships) {
    const due = msNet(ms) - (paidByMs.get(ms.id) ?? 0);
    if (due > 0) membershipDue.set(ms.memberId, (membershipDue.get(ms.memberId) ?? 0) + due);
  }
  const chargeDue = new Map<string, number>();
  for (const c of db.charges) if (c.status === "pending") chargeDue.set(c.memberId, (chargeDue.get(c.memberId) ?? 0) + c.amount);

  const status = new Map<string, MemberStatus>();
  for (const m of db.members) {
    const ms = latestMs.get(m.id);
    status.set(m.id, !m.isActive ? "inactive" : !ms || ms.endDate < t ? "expired" : "active");
  }

  const presentToday = new Map<string, string>();
  const attendanceCount = new Map<string, number>();
  const lastVisit = new Map<string, string>();
  for (const a of db.attendance) {
    if (a.date === t) presentToday.set(a.memberId, a.checkIn);
    attendanceCount.set(a.memberId, (attendanceCount.get(a.memberId) ?? 0) + 1);
    const lv = lastVisit.get(a.memberId);
    if (!lv || a.checkIn > lv) lastVisit.set(a.memberId, a.checkIn);
  }

  const ix: GymIndex = { memberById, planName, latestMs, msByMember, paidByMs, status, membershipDue, chargeDue, presentToday, attendanceCount, lastVisit, categoryName };
  cache.set(db, ix);
  return ix;
}

export const msDue = (ms: Membership, ix: GymIndex) => Math.max(0, msNet(ms) - (ix.paidByMs.get(ms.id) ?? 0));
export const memberDaysLeft = (memberId: string, ix: GymIndex) => {
  const ms = ix.latestMs.get(memberId);
  return ms ? daysLeft(ms.endDate) : null;
};
export const totalDue = (memberId: string, ix: GymIndex) => (ix.membershipDue.get(memberId) ?? 0) + (ix.chargeDue.get(memberId) ?? 0);

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);
export const paymentsIn = (p: Payment[], from: string, to: string) => p.filter((x) => x.date >= from && x.date <= to);
export const pendingCharges = (c: ExtraCharge[]) => c.filter((x) => x.status === "pending");
