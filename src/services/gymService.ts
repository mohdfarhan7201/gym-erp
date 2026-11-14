/**
 * Business operations (the "API" of the demo). Every function is async so the
 * signature stays identical when these become HTTP calls to a real backend.
 */
import type {
  AppNotification, ChargeType, DB, Expense, ExpenseCategory, ExtraCharge, GymSettings, Member, Membership,
  Payment, PaymentKind, PaymentMethod, PermissionKey, Plan, Role, Staff,
} from "@/types";
import { calcEndDate, today } from "@/utils/date";
import { uid } from "@/utils/id";
import { money } from "@/utils/format";
import { dbStore, delay } from "./storage/db";
import { localStore } from "./storage/localStore";
import { buildIndex, msDue, msNet } from "./selectors";
import { allPermissions } from "./mock/permissions";

type Actor = { name: string; role: Role };
const actor = (): Actor => {
  const s = localStore.get<{ name: string; role: Role } | null>("session", null);
  return s ? { name: s.name, role: s.role } : { name: "System", role: "admin" };
};

function log(d: DB, action: string, entity: string, details: string) {
  const a = actor();
  d.activity.unshift({ id: uid("act_"), actor: a.name, role: a.role, action, entity, details, at: new Date().toISOString() });
  if (d.activity.length > 400) d.activity.length = 400;
}
function notify(d: DB, n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  d.notifications.unshift({ ...n, id: uid("ntf_"), createdAt: new Date().toISOString(), read: false });
}
const nextReceipt = (d: DB) => `${d.settings.receiptPrefix}${d.counters.receipt++}`;

function addPayment(
  d: DB,
  p: { memberId: string; kind: PaymentKind; amount: number; method: PaymentMethod; description: string; membershipId?: string; chargeId?: string; reference?: string; date?: string; note?: string },
): Payment {
  const pay: Payment = {
    id: uid("pay_"), receiptNo: nextReceipt(d), date: p.date ?? today(), createdAt: new Date().toISOString(), collectedBy: actor().name,
    memberId: p.memberId, kind: p.kind, amount: Math.round(p.amount), method: p.method, description: p.description,
    membershipId: p.membershipId, chargeId: p.chargeId, reference: p.reference || undefined, note: p.note || undefined,
  };
  d.payments.push(pay);
  const m = d.members.find((x) => x.id === p.memberId);
  notify(d, { audience: "member", memberId: p.memberId, title: "Payment received", message: `We received ${money(pay.amount)} via ${pay.method.toUpperCase()} (${pay.receiptNo}).`, type: "success", link: "receipts" });
  log(d, "Payment collected", "Payment", `${pay.receiptNo} — ${money(pay.amount)} from ${m?.name ?? "member"}`);
  return pay;
}

/* -------------------------------- Members -------------------------------- */
export interface MemberInput {
  name: string; phone: string; email?: string; gender: Member["gender"]; dob?: string; address: string; photo?: string | null;
  bloodGroup?: string; emergencyContact?: string; occupation?: string; notes?: string;
}
export interface RegisterInput extends MemberInput {
  planId: string; startDate: string; discount: number;
  paymentStatus: "paid" | "partial" | "unpaid"; amountPaid: number; method: PaymentMethod; reference?: string;
}

const phoneTaken = (d: DB, phone: string, exceptId?: string) => d.members.some((m) => m.phone === phone && m.id !== exceptId);

export const memberService = {
  async register(input: RegisterInput): Promise<{ member: Member; payment?: Payment }> {
    await delay(700);
    let out: { member: Member; payment?: Payment } | null = null;
    dbStore.commit((d) => {
      if (phoneTaken(d, input.phone)) throw new Error("A member with this mobile number already exists.");
      if (input.email && d.members.some((m) => m.email?.toLowerCase() === input.email!.toLowerCase())) throw new Error("This email is already used by another member.");
      const plan = d.plans.find((p) => p.id === input.planId);
      if (!plan) throw new Error("Selected plan no longer exists.");
      const { planId: _p, startDate, discount, paymentStatus, amountPaid, method, reference, ...profile } = input;
      const member: Member = { ...profile, email: profile.email || undefined, id: uid("mem_"), code: `${d.settings.memberPrefix}${d.counters.member++}`, joinDate: startDate, isActive: true, createdAt: new Date().toISOString() };
      d.members.push(member);
      const ms: Membership = { id: uid("msp_"), memberId: member.id, planId: plan.id, planName: plan.name, durationMonths: plan.durationMonths, price: plan.price, discount: discount || 0, startDate, endDate: calcEndDate(startDate, plan.durationMonths), createdAt: new Date().toISOString(), createdBy: actor().name };
      d.memberships.push(ms);
      const net = msNet(ms);
      const amt = paymentStatus === "paid" ? net : paymentStatus === "partial" ? Math.min(amountPaid, net) : 0;
      let payment: Payment | undefined;
      if (amt > 0) payment = addPayment(d, { memberId: member.id, kind: "membership", membershipId: ms.id, amount: amt, method, reference, description: `${plan.name} membership`, date: today() });
      log(d, "Member registered", "Member", `${member.name} (${member.code}) on ${plan.name}`);
      for (const audience of ["admin", "receptionist"] as const)
        notify(d, { audience, title: "New member registered", message: `${member.name} joined on the ${plan.name} plan.`, type: "success", link: `members/${member.id}` });
      notify(d, { audience: "member", memberId: member.id, title: "Welcome to the gym!", message: `Your ${plan.name} membership starts on ${startDate}.`, type: "success", link: "membership" });
      out = { member, payment };
    });
    return out!;
  },

  async update(id: string, input: MemberInput) {
    await delay(500);
    dbStore.commit((d) => {
      if (phoneTaken(d, input.phone, id)) throw new Error("Another member already uses this mobile number.");
      const m = d.members.find((x) => x.id === id);
      if (!m) throw new Error("Member not found.");
      Object.assign(m, { ...input, email: input.email || undefined });
      log(d, "Member updated", "Member", `${m.name} (${m.code})`);
    });
  },

  async setActive(id: string, active: boolean) {
    await delay(300);
    dbStore.commit((d) => {
      const m = d.members.find((x) => x.id === id);
      if (!m) throw new Error("Member not found.");
      m.isActive = active;
      log(d, active ? "Member reactivated" : "Member deactivated", "Member", `${m.name} (${m.code})`);
    });
  },

  async remove(id: string) {
    await delay(400);
    dbStore.commit((d) => {
      const m = d.members.find((x) => x.id === id);
      if (!m) throw new Error("Member not found.");
      d.members = d.members.filter((x) => x.id !== id);
      d.memberships = d.memberships.filter((x) => x.memberId !== id);
      d.payments = d.payments.filter((x) => x.memberId !== id);
      d.charges = d.charges.filter((x) => x.memberId !== id);
      d.attendance = d.attendance.filter((x) => x.memberId !== id);
      d.renewals = d.renewals.filter((x) => x.memberId !== id);
      d.tickets = d.tickets.filter((x) => x.memberId !== id);
      d.notifications = d.notifications.filter((x) => x.memberId !== id);
      log(d, "Member deleted", "Member", `${m.name} (${m.code})`);
    });
  },
};

/* ------------------------------ Plans / Membership ------------------------------ */
export const planService = {
  async save(plan: Omit<Plan, "id"> & { id?: string }) {
    await delay(450);
    dbStore.commit((d) => {
      if (plan.id) {
        const p = d.plans.find((x) => x.id === plan.id);
        if (!p) throw new Error("Plan not found.");
        Object.assign(p, plan);
        log(d, "Plan updated", "Plan", `${p.name} — ${money(p.price)} / ${p.durationMonths} mo`);
      } else {
        const p = { ...plan, id: uid("plan_") } as Plan;
        d.plans.push(p);
        log(d, "Plan created", "Plan", `${p.name} — ${money(p.price)} / ${p.durationMonths} mo`);
      }
    });
  },
  async remove(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      if (d.memberships.some((m) => m.planId === id)) throw new Error("This plan has memberships linked to it. Deactivate it instead.");
      const p = d.plans.find((x) => x.id === id);
      d.plans = d.plans.filter((x) => x.id !== id);
      log(d, "Plan deleted", "Plan", p?.name ?? id);
    });
  },
};

export interface RenewInput {
  memberId: string; planId: string; startDate: string; discount: number; amountPaid: number; method: PaymentMethod; reference?: string; requestId?: string;
}
export const membershipService = {
  async renew(input: RenewInput): Promise<{ membership: Membership; payment?: Payment }> {
    await delay(650);
    let out: { membership: Membership; payment?: Payment } | null = null;
    dbStore.commit((d) => {
      const plan = d.plans.find((p) => p.id === input.planId);
      const m = d.members.find((x) => x.id === input.memberId);
      if (!plan || !m) throw new Error("Member or plan not found.");
      const ix = buildIndex(dbStore.snapshot());
      const cur = ix.latestMs.get(m.id);
      if (cur && cur.endDate >= input.startDate && cur.startDate <= input.startDate)
        throw new Error(`New membership overlaps the current one ending ${cur.endDate}. Choose a later start date.`);
      const ms: Membership = { id: uid("msp_"), memberId: m.id, planId: plan.id, planName: plan.name, durationMonths: plan.durationMonths, price: plan.price, discount: input.discount || 0, startDate: input.startDate, endDate: calcEndDate(input.startDate, plan.durationMonths), createdAt: new Date().toISOString(), createdBy: actor().name };
      d.memberships.push(ms);
      m.isActive = true;
      const amt = Math.min(input.amountPaid, msNet(ms));
      let payment: Payment | undefined;
      if (amt > 0) payment = addPayment(d, { memberId: m.id, kind: "membership", membershipId: ms.id, amount: amt, method: input.method, reference: input.reference, description: `${plan.name} membership renewal` });
      if (input.requestId) {
        const r = d.renewals.find((x) => x.id === input.requestId);
        if (r) r.status = "approved";
      }
      notify(d, { audience: "member", memberId: m.id, title: "Membership renewed", message: `Your ${plan.name} plan runs ${ms.startDate} → ${ms.endDate}.`, type: "success", link: "membership" });
      log(d, "Membership renewed", "Membership", `${m.name} — ${plan.name} (${ms.startDate} → ${ms.endDate})`);
      out = { membership: ms, payment };
    });
    return out!;
  },
  async rejectRequest(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const r = d.renewals.find((x) => x.id === id);
      if (!r) return;
      r.status = "rejected";
      notify(d, { audience: "member", memberId: r.memberId, title: "Renewal request declined", message: "Please contact the front desk to discuss your renewal.", type: "warning", link: "membership" });
      log(d, "Renewal request rejected", "Membership", r.id);
    });
  },
};

/* ------------------------------ Payments ------------------------------ */
export const paymentService = {
  async collect(input: { memberId: string; membershipId?: string; amount: number; method: PaymentMethod; reference?: string; note?: string; description?: string; date?: string }) {
    await delay(650);
    let out: Payment | null = null;
    dbStore.commit((d) => {
      if (input.amount <= 0) throw new Error("Amount must be greater than zero.");
      let description = input.description || "Payment";
      let kind: PaymentKind = "other";
      if (input.membershipId) {
        const ms = d.memberships.find((x) => x.id === input.membershipId);
        if (!ms) throw new Error("Membership not found.");
        const due = msDue(ms, buildIndex(dbStore.snapshot()));
        if (input.amount > due) throw new Error(`Amount exceeds the pending balance of ${money(due)}.`);
        description = `${ms.planName} membership — balance`;
        kind = "membership";
      }
      out = addPayment(d, { ...input, kind, description });
    });
    return out!;
  },
  async remove(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const p = d.payments.find((x) => x.id === id);
      if (!p) return;
      d.payments = d.payments.filter((x) => x.id !== id);
      if (p.chargeId) {
        const c = d.charges.find((x) => x.id === p.chargeId);
        if (c) Object.assign(c, { status: "pending", paidAt: undefined, paymentId: undefined });
      }
      log(d, "Payment voided", "Payment", `${p.receiptNo} — ${money(p.amount)}`);
    });
  },
};

/* ------------------------------ Attendance ------------------------------ */
export const attendanceService = {
  async mark(memberId: string, opts: { allowExpired?: boolean } = {}) {
    await delay(300);
    let out: { name: string; time: string } | null = null;
    dbStore.commit((d) => {
      const ix = buildIndex(dbStore.snapshot());
      const m = ix.memberById.get(memberId);
      if (!m) throw new Error("Member not found.");
      const t = today();
      if (d.attendance.some((a) => a.memberId === memberId && a.date === t)) throw new Error(`${m.name} is already marked present today.`);
      const st = ix.status.get(memberId);
      if (st === "inactive") throw new Error(`${m.name}'s account is deactivated.`);
      if (st === "expired" && !opts.allowExpired) throw new Error(`${m.name}'s membership has expired. Renew before check-in.`);
      const checkIn = new Date().toISOString();
      d.attendance.push({ id: uid("att_"), memberId, date: t, checkIn, markedBy: actor().name });
      log(d, "Attendance marked", "Attendance", `${m.name} (${m.code})`);
      out = { name: m.name, time: checkIn };
    });
    return out!;
  },
  async remove(id: string) {
    await delay(250);
    dbStore.commit((d) => {
      const a = d.attendance.find((x) => x.id === id);
      d.attendance = d.attendance.filter((x) => x.id !== id);
      if (a) log(d, "Attendance removed", "Attendance", `${d.members.find((m) => m.id === a.memberId)?.name} on ${a.date}`);
    });
  },
};

/* ------------------------------ Extra charges ------------------------------ */
export const chargeService = {
  async add(input: { memberId: string; type: ChargeType; description: string; amount: number; date: string }) {
    await delay(500);
    dbStore.commit((d) => {
      const m = d.members.find((x) => x.id === input.memberId);
      if (!m) throw new Error("Member not found.");
      const c: ExtraCharge = { ...input, id: uid("chg_"), status: "pending", createdBy: actor().name };
      d.charges.push(c);
      notify(d, { audience: "member", memberId: m.id, title: `${input.type} charge added`, message: `${money(input.amount)} — ${input.description}`, type: "danger", link: "charges" });
      log(d, "Extra charge added", "Charge", `${m.name} — ${input.type} ${money(input.amount)}`);
    });
  },
  async markPaid(id: string, method: PaymentMethod, reference?: string): Promise<Payment> {
    await delay(550);
    let out: Payment | null = null;
    dbStore.commit((d) => {
      const c = d.charges.find((x) => x.id === id);
      if (!c) throw new Error("Charge not found.");
      if (c.status === "paid") throw new Error("This charge is already paid.");
      const p = addPayment(d, { memberId: c.memberId, kind: "extra_charge", chargeId: c.id, amount: c.amount, method, reference, description: `${c.type}: ${c.description}` });
      Object.assign(c, { status: "paid", paidAt: p.createdAt, paymentId: p.id });
      out = p;
    });
    return out!;
  },
  async markPending(id: string) {
    const c = dbStore.snapshot().charges.find((x) => x.id === id);
    if (c?.paymentId) return paymentService.remove(c.paymentId);
  },
  async remove(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const c = d.charges.find((x) => x.id === id);
      if (c?.status === "paid") throw new Error("Paid charges can't be deleted. Mark it unpaid first.");
      d.charges = d.charges.filter((x) => x.id !== id);
      if (c) log(d, "Extra charge deleted", "Charge", `${c.type} ${money(c.amount)}`);
    });
  },
};

/* ------------------------------ Expenses ------------------------------ */
export const expenseService = {
  async save(e: Omit<Expense, "id" | "createdAt" | "createdBy"> & { id?: string }) {
    await delay(450);
    dbStore.commit((d) => {
      if (e.id) {
        const x = d.expenses.find((y) => y.id === e.id);
        if (!x) throw new Error("Expense not found.");
        Object.assign(x, e);
        log(d, "Expense updated", "Expense", `${x.title} — ${money(x.amount)}`);
      } else {
        const x: Expense = { ...e, id: uid("exp_"), createdAt: new Date().toISOString(), createdBy: actor().name };
        d.expenses.push(x);
        log(d, "Expense added", "Expense", `${x.title} — ${money(x.amount)}`);
      }
    });
  },
  async remove(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const x = d.expenses.find((y) => y.id === id);
      d.expenses = d.expenses.filter((y) => y.id !== id);
      if (x) log(d, "Expense deleted", "Expense", `${x.title} — ${money(x.amount)}`);
    });
  },
  async saveCategory(c: Omit<ExpenseCategory, "id" | "isDefault"> & { id?: string }) {
    await delay(300);
    dbStore.commit((d) => {
      if (d.categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase() && x.id !== c.id)) throw new Error("A category with this name already exists.");
      if (c.id) Object.assign(d.categories.find((x) => x.id === c.id)!, c);
      else d.categories.push({ ...c, id: uid("cat_"), isDefault: false });
      log(d, c.id ? "Category updated" : "Category added", "Expense", c.name);
    });
  },
  async removeCategory(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const c = d.categories.find((x) => x.id === id);
      if (!c || c.isDefault) throw new Error("Default categories can't be deleted.");
      d.expenses.forEach((e) => {
        if (e.categoryId === id) e.categoryId = "cat_other";
      });
      d.categories = d.categories.filter((x) => x.id !== id);
      log(d, "Category deleted", "Expense", `${c.name} (expenses moved to Other)`);
    });
  },
};

/* ------------------------------ Staff ------------------------------ */
export const staffService = {
  async save(s: Omit<Staff, "id" | "permissions" | "role"> & { id?: string }) {
    await delay(500);
    dbStore.commit((d) => {
      if (d.staff.some((x) => x.email.toLowerCase() === s.email.toLowerCase() && x.id !== s.id)) throw new Error("This email is already used by another staff account.");
      if (s.id) {
        const x = d.staff.find((y) => y.id === s.id)!;
        Object.assign(x, s);
        log(d, "Staff updated", "Staff", x.name);
      } else {
        d.staff.push({ ...s, id: uid("stf_"), role: "receptionist", permissions: { ...allPermissions(true), deleteMembers: false, giveDiscounts: false } });
        log(d, "Receptionist added", "Staff", s.name);
      }
    });
  },
  async setActive(id: string, active: boolean) {
    await delay(300);
    dbStore.commit((d) => {
      const x = d.staff.find((y) => y.id === id);
      if (!x || x.role === "admin") throw new Error("The owner account can't be deactivated.");
      x.active = active;
      log(d, active ? "Staff activated" : "Staff deactivated", "Staff", x.name);
    });
  },
  async remove(id: string) {
    await delay(300);
    dbStore.commit((d) => {
      const x = d.staff.find((y) => y.id === id);
      if (!x || x.role === "admin") throw new Error("The owner account can't be deleted.");
      d.staff = d.staff.filter((y) => y.id !== id);
      log(d, "Staff deleted", "Staff", x.name);
    });
  },
  async setPermission(id: string, key: PermissionKey, value: boolean) {
    dbStore.commit((d) => {
      const x = d.staff.find((y) => y.id === id);
      if (!x) return;
      x.permissions[key] = value;
      log(d, "Permission changed", "Staff", `${x.name}: ${key} → ${value ? "allowed" : "denied"}`);
    });
  },
};

/* ------------------------------ Notifications / activity ------------------------------ */
export const notificationService = {
  forUser(db: DB, role: Role, memberId?: string) {
    return db.notifications
      .filter((n) => n.audience === role && (role !== "member" || n.memberId === memberId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markRead(ids: string[]) {
    dbStore.commit((d) => d.notifications.forEach((n) => ids.includes(n.id) && (n.read = true)));
  },
  async remove(id: string) {
    dbStore.commit((d) => {
      d.notifications = d.notifications.filter((n) => n.id !== id);
    });
  },
  async broadcast(input: { title: string; message: string; type: AppNotification["type"]; audience: "members" | "staff" | "all" }) {
    await delay(400);
    dbStore.commit((d) => {
      if (input.audience !== "staff")
        d.members.forEach((m) => notify(d, { audience: "member", memberId: m.id, title: input.title, message: input.message, type: input.type }));
      if (input.audience !== "members") notify(d, { audience: "receptionist", title: input.title, message: input.message, type: input.type });
      log(d, "Announcement sent", "Notification", `${input.title} → ${input.audience}`);
    });
  },
};

export const activityService = {
  async clear() {
    await delay(300);
    dbStore.commit((d) => {
      d.activity = [];
      log(d, "Activity log cleared", "System", "All previous entries removed");
    });
  },
};

/* ------------------------------ Settings / backup ------------------------------ */
export const settingsService = {
  async update(s: GymSettings) {
    await delay(500);
    dbStore.commit((d) => {
      d.settings = s;
      log(d, "Settings updated", "Settings", s.name);
    });
  },
};

const BACKUPS_KEY = "backups";
export interface BackupMeta { id: string; label: string; createdAt: string; size: number; records: number }
export const backupService = {
  list(): BackupMeta[] {
    return localStore.get<BackupMeta[]>(BACKUPS_KEY, []);
  },
  async create(label: string) {
    await delay(900);
    const db = dbStore.snapshot();
    const json = JSON.stringify(db);
    const meta: BackupMeta = { id: uid("bk_"), label, createdAt: new Date().toISOString(), size: json.length, records: db.members.length + db.payments.length + db.attendance.length + db.expenses.length };
    // keep at most 3 snapshots to stay within storage quota
    const list = [meta, ...backupService.list()].slice(0, 2);
    backupService.list().slice(1).forEach((b) => localStore.remove(`backup:${b.id}`));
    localStore.set(`backup:${meta.id}`, db);
    localStore.set(BACKUPS_KEY, list);
    dbStore.commit((d) => log(d, "Backup created", "System", label));
    return meta;
  },
  async restore(id: string) {
    await delay(900);
    const db = localStore.get<DB | null>(`backup:${id}`, null);
    if (!db) throw new Error("Backup file is missing.");
    dbStore.replace(db);
    dbStore.commit((d) => log(d, "Backup restored", "System", id));
  },
  removeBackup(id: string) {
    localStore.remove(`backup:${id}`);
    localStore.set(BACKUPS_KEY, backupService.list().filter((b) => b.id !== id));
  },
  exportJson() {
    return JSON.stringify(dbStore.snapshot(), null, 2);
  },
  async importJson(text: string) {
    await delay(700);
    let parsed: DB;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("That file isn't valid JSON.");
    }
    if (!Array.isArray(parsed.members) || !Array.isArray(parsed.payments) || !parsed.settings) throw new Error("This doesn't look like a PulseFit backup file.");
    dbStore.replace(parsed);
    dbStore.commit((d) => log(d, "Backup imported", "System", "Data restored from file"));
  },
  async resetDemo() {
    await delay(800);
    dbStore.reset();
    localStore.remove("memberPasswords");
  },
};

/* ------------------------------ Member self-service ------------------------------ */
export const memberPortalService = {
  async requestRenewal(memberId: string, planId: string, preferredStart: string, note?: string) {
    await delay(600);
    dbStore.commit((d) => {
      if (d.renewals.some((r) => r.memberId === memberId && r.status === "pending")) throw new Error("You already have a pending renewal request.");
      d.renewals.push({ id: uid("rnw_"), memberId, planId, preferredStart, note, status: "pending", createdAt: new Date().toISOString() });
      const m = d.members.find((x) => x.id === memberId);
      const plan = d.plans.find((p) => p.id === planId);
      for (const audience of ["admin", "receptionist"] as const)
        notify(d, { audience, title: "Renewal request", message: `${m?.name} requested the ${plan?.name} plan from ${preferredStart}.`, type: "info", link: `membership/renew?member=${memberId}` });
      log(d, "Renewal requested", "Membership", `${m?.name} → ${plan?.name}`);
    });
  },
  async updateProfile(memberId: string, patch: Partial<Pick<Member, "phone" | "email" | "address" | "photo" | "emergencyContact" | "bloodGroup" | "occupation">>) {
    await delay(500);
    dbStore.commit((d) => {
      if (patch.phone && phoneTaken(d, patch.phone, memberId)) throw new Error("This mobile number is used by another member.");
      Object.assign(d.members.find((m) => m.id === memberId)!, patch);
    });
  },
  async createTicket(memberId: string, t: { subject: string; category: string; message: string }) {
    await delay(500);
    dbStore.commit((d) => {
      d.tickets.push({ ...t, id: uid("tkt_"), memberId, status: "open", createdAt: new Date().toISOString() });
      const m = d.members.find((x) => x.id === memberId);
      for (const audience of ["admin", "receptionist"] as const)
        notify(d, { audience, title: `Support: ${t.subject}`, message: `${m?.name}: ${t.message.slice(0, 90)}`, type: "info", link: `members/${memberId}` });
    });
  },
};

export const profileService = {
  async updateStaff(id: string, patch: Partial<Pick<Staff, "name" | "phone" | "email" | "photo">>) {
    await delay(500);
    dbStore.commit((d) => {
      if (patch.email && d.staff.some((s) => s.email.toLowerCase() === patch.email!.toLowerCase() && s.id !== id)) throw new Error("Email already in use.");
      Object.assign(d.staff.find((s) => s.id === id)!, patch);
    });
  },
};
