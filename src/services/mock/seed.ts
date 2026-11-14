import { addDays, format, parseISO } from "date-fns";
import type {
  ActivityLog, AppNotification, Attendance, ChargeType, DB, Expense, ExpenseCategory, ExtraCharge,
  Member, Membership, Payment, PaymentMethod, Plan, Staff,
} from "@/types";
import { calcEndDate, daysAgo, today, toDateStr } from "@/utils/date";
import { allPermissions } from "./permissions";

/* Deterministic PRNG so the demo data looks the same on every reset (relative to today). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_M = ["Arjun", "Rahul", "Karan", "Aditya", "Vivek", "Rohit", "Siddharth", "Aman", "Nikhil", "Manish", "Harsh", "Yash", "Varun", "Kunal", "Abhishek", "Deepak", "Saurabh", "Gaurav", "Ankit", "Tushar", "Pranav", "Ishaan", "Dev", "Kabir", "Rajat", "Mohit", "Akash", "Sahil", "Om", "Lakshay"];
const FIRST_F = ["Priya", "Ananya", "Sneha", "Pooja", "Kavya", "Riya", "Neha", "Shreya", "Aditi", "Isha", "Tanvi", "Meera", "Simran", "Nisha", "Divya", "Anjali", "Sakshi", "Muskan", "Khushi", "Aarohi"];
const LAST = ["Sharma", "Verma", "Mehta", "Gupta", "Singh", "Patel", "Kapoor", "Malhotra", "Joshi", "Rao", "Nair", "Iyer", "Reddy", "Chauhan", "Agarwal", "Bansal", "Saxena", "Mishra", "Pandey", "Bhatia", "Khanna", "Tiwari", "Desai", "Kulkarni"];
const AREAS = ["Sector 15, Noida", "Indirapuram, Ghaziabad", "Sector 62, Noida", "Vaishali, Ghaziabad", "Sector 18, Noida", "Raj Nagar Extension", "Sector 50, Noida", "Crossing Republik", "Sector 137, Noida", "Kaushambi, Ghaziabad"];
const BLOOD = ["A+", "B+", "O+", "AB+", "A-", "O-", "B-"];
const JOBS = ["Software Engineer", "Student", "Business Owner", "Teacher", "Doctor", "Designer", "Sales Manager", "Accountant", "Homemaker", "Consultant"];

export const DEFAULT_PLANS: Plan[] = [
  { id: "plan_1m", name: "Monthly", durationMonths: 1, price: 700, description: "Perfect to get started and build the habit.", features: ["Full gym floor access", "Locker room", "1 trainer consultation"], active: true },
  { id: "plan_3m", name: "Quarterly", durationMonths: 3, price: 1900, description: "Three months to see real progress.", features: ["Everything in Monthly", "Body composition scan", "Diet chart"], active: true, popular: true },
  { id: "plan_6m", name: "Half-Yearly", durationMonths: 6, price: 3500, description: "Commit to a half-year transformation.", features: ["Everything in Quarterly", "2 PT sessions / month", "Freeze up to 15 days"], active: true },
  { id: "plan_12m", name: "Annual", durationMonths: 12, price: 6300, description: "Best value for serious athletes.", features: ["Everything in Half-Yearly", "Free gym kit", "Freeze up to 30 days", "Guest passes x4"], active: true },
];

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "cat_rent", name: "Rent", color: "#6366F1", isDefault: true },
  { id: "cat_elec", name: "Electricity", color: "#F59E0B", isDefault: true },
  { id: "cat_salary", name: "Salary", color: "#10B981", isDefault: true },
  { id: "cat_equip", name: "Equipment", color: "#3B82F6", isDefault: true },
  { id: "cat_maint", name: "Maintenance", color: "#EC4899", isDefault: true },
  { id: "cat_other", name: "Other", color: "#8B5CF6", isDefault: true },
];

export const CHARGE_TYPES: ChargeType[] = ["Equipment Damage", "Machine Repair", "Locker Damage", "Lost Key", "Access Card", "Late Payment Fine", "Other Penalties"];

export function buildSeed(): DB {
  const rnd = mulberry32(20261112);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
  const T = today();
  const now = new Date();
  let idc = 0;
  const id = (p: string) => `${p}_${(++idc).toString(36)}`;
  const iso = (d: string, h: number, m: number) => new Date(`${d}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`).toISOString();

  const staff: Staff[] = [
    { id: "stf_admin", name: "Vikram Malhotra", email: "admin@gymdemo.com", phone: "9810012345", role: "admin", password: "admin123", active: true, joinedAt: daysAgo(900), shift: "Full Day", permissions: allPermissions(true) },
    { id: "stf_rec1", name: "Priya Sharma", email: "reception@gymdemo.com", phone: "9810098765", role: "receptionist", password: "reception123", active: true, joinedAt: daysAgo(420), shift: "Morning (5 AM – 1 PM)", permissions: { ...allPermissions(true), deleteMembers: false, giveDiscounts: false } },
    { id: "stf_rec2", name: "Rohit Saxena", email: "rohit.s@gymdemo.com", phone: "9811122233", role: "receptionist", password: "reception123", active: true, joinedAt: daysAgo(200), shift: "Evening (1 PM – 10 PM)", permissions: { ...allPermissions(true), deleteMembers: false, giveDiscounts: false, editMembers: false } },
  ];
  const staffNames = ["Priya Sharma", "Rohit Saxena", "Vikram Malhotra"];

  const members: Member[] = [];
  const memberships: Membership[] = [];
  const payments: Omit<Payment, "receiptNo">[] = [];
  const COUNT = 120;

  for (let i = 0; i < COUNT; i++) {
    const female = i !== 0 && rnd() < 0.38;
    const first = i === 0 ? "Arjun" : pick(female ? FIRST_F : FIRST_M);
    const last = i === 0 ? "Mehta" : pick(LAST);
    const joinOffset = i === 0 ? 260 : int(3, 430);
    const joinDate = daysAgo(joinOffset);
    const m: Member = {
      id: i === 0 ? "mem_demo" : id("mem"),
      code: `GYM-${1001 + i}`,
      name: `${first} ${last}`,
      phone: `9${int(100000000, 999999999)}`,
      email: i === 0 ? "member@gymdemo.com" : rnd() < 0.7 ? `${first}.${last}${int(1, 99)}@mail.com`.toLowerCase() : undefined,
      gender: female ? "female" : "male",
      dob: toDateStr(new Date(int(1975, 2006), int(0, 11), int(1, 28))),
      address: `${int(1, 450)}, ${pick(AREAS)}`,
      photo: null,
      bloodGroup: pick(BLOOD),
      emergencyContact: `9${int(100000000, 999999999)}`,
      occupation: pick(JOBS),
      joinDate,
      isActive: true,
      createdAt: iso(joinDate, int(7, 20), int(0, 59)),
    };
    members.push(m);

    // build membership chain
    let start = joinDate;
    let cycle = 0;
    const retention = i === 0 ? 1 : rnd() < 0.78 ? 0.9 : 0.35;
    while (start <= T) {
      const plan = i === 0 ? (cycle < 2 ? DEFAULT_PLANS[1] : DEFAULT_PLANS[1]) : pick([DEFAULT_PLANS[0], DEFAULT_PLANS[0], DEFAULT_PLANS[1], DEFAULT_PLANS[1], DEFAULT_PLANS[2], DEFAULT_PLANS[3]]);
      const discount = rnd() < 0.12 ? pick([100, 200, 300]) : 0;
      const end = calcEndDate(start, plan.durationMonths);
      const ms: Membership = {
        id: id("msp"), memberId: m.id, planId: plan.id, planName: plan.name, durationMonths: plan.durationMonths,
        price: plan.price, discount, startDate: start, endDate: end, createdAt: iso(start, int(7, 20), int(0, 59)), createdBy: pick(staffNames),
      };
      memberships.push(ms);
      const due = plan.price - discount;
      const isLatest = toDateStr(addDays(parseISO(end), 1)) > T;
      const partial = (isLatest && rnd() < 0.22) || (i === 0 && isLatest);
      const method: PaymentMethod = rnd() < 0.55 ? "upi" : rnd() < 0.85 ? "cash" : "card";
      const firstAmt = partial ? Math.round((due * pick([0.5, 0.6, 0.7])) / 50) * 50 : due;
      payments.push({
        id: id("pay"), memberId: m.id, kind: "membership", membershipId: ms.id, description: `${plan.name} membership`,
        amount: firstAmt, method, reference: method === "upi" ? `UPI${int(100000000, 999999999)}` : undefined,
        date: start, createdAt: ms.createdAt, collectedBy: ms.createdBy,
      });
      cycle++;
      const renew = rnd() < retention;
      if (!renew) break;
      const gap = rnd() < 0.8 ? 1 : int(2, 12);
      start = toDateStr(addDays(parseISO(end), gap));
    }
    // deactivate a handful
    if (i > 0 && i % 17 === 0) m.isActive = false;
  }

  // Attendance for last 75 days
  const attendance: Attendance[] = [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const regularity = new Map(members.map((m) => [m.id, m.id === "mem_demo" ? 0.82 : 0.3 + rnd() * 0.55]));
  const msByMember = new Map<string, Membership[]>();
  memberships.forEach((ms) => msByMember.set(ms.memberId, [...(msByMember.get(ms.memberId) ?? []), ms]));
  for (let back = 75; back >= 0; back--) {
    const d = daysAgo(back);
    const dow = parseISO(d).getDay();
    for (const m of members) {
      if (!m.isActive && back < 40) continue;
      const covered = (msByMember.get(m.id) ?? []).some((ms) => ms.startDate <= d && ms.endDate >= d);
      if (!covered) continue;
      const p = (regularity.get(m.id) ?? 0.5) * (dow === 0 ? 0.35 : 1);
      if (rnd() > p) continue;
      const morning = rnd() < 0.6;
      const h = morning ? int(5, 9) : int(16, 21);
      const min = int(0, 59);
      if (back === 0 && h * 60 + min > nowMinutes) continue;
      attendance.push({ id: id("att"), memberId: m.id, date: d, checkIn: iso(d, h, min), markedBy: h < 13 ? "Priya Sharma" : "Rohit Saxena" });
    }
  }

  // Extra charges
  const charges: ExtraCharge[] = [];
  const chargeDesc: Record<ChargeType, [string, number][]> = {
    "Equipment Damage": [["Dropped dumbbell cracked floor tile", 1200], ["Broken resistance band", 350]],
    "Machine Repair": [["Treadmill belt misuse repair", 2500], ["Cable machine pulley damage", 1800]],
    "Locker Damage": [["Locker hinge broken", 600], ["Locker door dent", 450]],
    "Lost Key": [["Locker key lost", 250]],
    "Access Card": [["Replacement access card", 200]],
    "Late Payment Fine": [["Membership renewal paid late", 100], ["Late fee — 7 days overdue", 150]],
    "Other Penalties": [["Gym rule violation (no towel)", 100], ["Unauthorised guest entry", 300]],
  };
  const chargeMembers = [members[0], ...members.slice(1).sort(() => rnd() - 0.5).slice(0, 19)];
  chargeMembers.forEach((m, k) => {
    const type = k === 0 ? "Locker Damage" : pick(CHARGE_TYPES);
    const [description, amount] = pick(chargeDesc[type]);
    const d = daysAgo(k === 0 ? 6 : int(1, 120));
    const paid = k !== 0 && rnd() < 0.6;
    const ch: ExtraCharge = { id: id("chg"), memberId: m.id, type, description, amount, date: d, status: paid ? "paid" : "pending", createdBy: pick(staffNames) };
    if (paid) {
      const pd = toDateStr(addDays(parseISO(d), int(0, 6)) > now ? now : addDays(parseISO(d), int(0, 6)));
      const pid = id("pay");
      ch.paidAt = iso(pd, int(8, 20), int(0, 59));
      ch.paymentId = pid;
      payments.push({ id: pid, memberId: m.id, kind: "extra_charge", chargeId: ch.id, description: `${type}: ${description}`, amount, method: rnd() < 0.5 ? "cash" : "upi", date: pd, createdAt: ch.paidAt, collectedBy: pick(staffNames) });
    }
    charges.push(ch);
  });
  // one extra paid charge for the demo member so their history is not empty
  {
    const d = daysAgo(48);
    const pid = id("pay");
    const ch: ExtraCharge = { id: id("chg"), memberId: "mem_demo", type: "Access Card", description: "Replacement access card", amount: 200, date: d, status: "paid", paidAt: iso(d, 18, 40), paymentId: pid, createdBy: "Rohit Saxena" };
    charges.push(ch);
    payments.push({ id: pid, memberId: "mem_demo", kind: "extra_charge", chargeId: ch.id, description: "Access Card: Replacement access card", amount: 200, method: "upi", reference: "UPI482019334", date: d, createdAt: ch.paidAt!, collectedBy: "Rohit Saxena" });
  }

  // A few walk-in sales earlier today so the "today" widgets have data
  {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const extras: [string, number, PaymentMethod][] = [["Personal training session", 500, "upi"], ["Protein shake", 150, "cash"], ["Guest day pass", 200, "upi"]];
    extras.forEach(([description, amount, method], k) => {
      const minutes = Math.max(5, nowMin - (k + 1) * 47);
      const m = members[3 + k * 5];
      payments.push({ id: id("pay"), memberId: m.id, kind: "other", description, amount, method, date: T, createdAt: iso(T, Math.floor(minutes / 60), minutes % 60), collectedBy: minutes < 13 * 60 ? "Priya Sharma" : "Rohit Saxena" });
    });
  }

  // Expenses for ~13 months
  const expenses: Expense[] = [];
  for (let mo = 12; mo >= 0; mo--) {
    const base = new Date(now.getFullYear(), now.getMonth() - mo, 1);
    const ym = format(base, "yyyy-MM");
    const day = (n: number) => `${ym}-${String(n).padStart(2, "0")}`;
    const add = (categoryId: string, title: string, amount: number, d: string, vendor?: string, method: PaymentMethod = "bank") => {
      if (d > T) return;
      expenses.push({ id: id("exp"), categoryId, title, amount, date: d, method, vendor, createdBy: "Vikram Malhotra", createdAt: iso(d, 11, 0) });
    };
    add("cat_rent", "Monthly premises rent", 12000, day(1), "Sharma Properties");
    add("cat_elec", "Electricity bill", int(28, 42) * 100, day(6), "UPPCL");
    add("cat_salary", "Trainer salaries", 9000, day(2), "Payroll");
    add("cat_salary", "Front desk salaries", 6500, day(2), "Payroll");
    add("cat_salary", "Housekeeping", 3000, day(2), "Payroll", "cash");
    if (rnd() < 0.8) add("cat_maint", pick(["AC servicing", "Treadmill servicing", "Plumbing work", "Mirror replacement"]), int(6, 22) * 100, day(int(8, 25)), pick(["CoolAir Services", "FitFix Repairs", "Local vendor"]), "upi");
    if (rnd() < 0.35) add("cat_equip", pick(["Dumbbell set 2.5–25 kg", "Adjustable bench", "Kettlebell set", "Resistance bands", "Olympic plates"]), int(25, 120) * 100, day(int(5, 25)), "Decathlon Pro", "bank");
    add("cat_other", pick(["Cleaning supplies", "Drinking water cans", "Internet & phone", "Marketing flyers"]), int(5, 15) * 100, day(int(10, 27)), undefined, "cash");
  }

  // receipts numbered chronologically
  const sortedPayments: Payment[] = payments
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p, idx) => ({ ...p, receiptNo: `RCP-${String(10001 + idx)}` }));

  const latest = new Map<string, Membership>();
  memberships.forEach((ms) => {
    const cur = latest.get(ms.memberId);
    if (!cur || ms.endDate > cur.endDate) latest.set(ms.memberId, ms);
  });
  const soon = [...latest.values()].filter((ms) => ms.endDate >= T && ms.endDate <= toDateStr(addDays(now, 7)));
  const memberName = (mid: string) => members.find((m) => m.id === mid)?.name ?? "";

  const notifications: AppNotification[] = [];
  const pushN = (n: Omit<AppNotification, "id">) => notifications.push({ id: id("ntf"), ...n });
  soon.slice(0, 4).forEach((ms, k) => {
    for (const audience of ["admin", "receptionist"] as const)
      pushN({ audience, title: "Membership expiring soon", message: `${memberName(ms.memberId)}'s ${ms.planName} plan ends on ${format(parseISO(ms.endDate), "dd MMM")}.`, type: "warning", link: `members/${ms.memberId}`, createdAt: new Date(now.getTime() - (k + 1) * 3600e3).toISOString(), read: k > 1 });
  });
  pushN({ audience: "admin", title: "Monthly expense recorded", message: "Rent and salaries for this month have been added.", type: "info", link: "expenses/history", createdAt: new Date(now.getTime() - 26 * 3600e3).toISOString(), read: true });
  pushN({ audience: "admin", title: "Renewal request", message: "A member requested a membership renewal from the member app.", type: "info", link: "membership/renew", createdAt: new Date(now.getTime() - 5 * 3600e3).toISOString(), read: false });
  pushN({ audience: "receptionist", title: "Pending dues reminder", message: "Several members have outstanding balances. Review pending payments.", type: "danger", link: "payments/pending", createdAt: new Date(now.getTime() - 8 * 3600e3).toISOString(), read: false });
  pushN({ audience: "member", memberId: "mem_demo", title: "Locker damage charge added", message: "A charge of ₹600 for locker hinge damage was added to your account.", type: "danger", link: "charges", createdAt: new Date(now.getTime() - 6 * 86400e3).toISOString(), read: false });
  pushN({ audience: "member", memberId: "mem_demo", title: "Pending balance on membership", message: "You have a pending balance on your current Quarterly plan. Please clear it at the front desk.", type: "warning", link: "payments", createdAt: new Date(now.getTime() - 2 * 86400e3).toISOString(), read: false });
  pushN({ audience: "member", memberId: "mem_demo", title: "Gym timing update", message: "The gym will open at 6:00 AM on public holidays.", type: "info", createdAt: new Date(now.getTime() - 9 * 86400e3).toISOString(), read: true });
  pushN({ audience: "member", memberId: "mem_demo", title: "Great streak!", message: "You worked out 5 days in a row last week. Keep it up!", type: "success", link: "attendance", createdAt: new Date(now.getTime() - 3 * 86400e3).toISOString(), read: true });

  const activity: ActivityLog[] = [];
  sortedPayments.slice(-14).forEach((p) =>
    activity.push({ id: id("act"), actor: p.collectedBy, role: p.collectedBy === "Vikram Malhotra" ? "admin" : "receptionist", action: "Payment collected", entity: "Payment", details: `${p.receiptNo} — ₹${p.amount} from ${memberName(p.memberId)}`, at: p.createdAt }),
  );
  members.slice(-6).forEach((m) =>
    activity.push({ id: id("act"), actor: "Priya Sharma", role: "receptionist", action: "Member registered", entity: "Member", details: `${m.name} (${m.code})`, at: m.createdAt }),
  );
  activity.push({ id: id("act"), actor: "Vikram Malhotra", role: "admin", action: "Plan updated", entity: "Plan", details: "Annual plan price set to ₹6,300", at: new Date(now.getTime() - 20 * 86400e3).toISOString() });
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const renewalMember = [...latest.values()].find((ms) => ms.endDate < T && ms.memberId !== "mem_demo");
  return {
    plans: DEFAULT_PLANS.map((p) => ({ ...p })),
    members,
    memberships,
    payments: sortedPayments,
    charges,
    attendance,
    expenses,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    staff,
    notifications,
    activity,
    renewals: renewalMember
      ? [{ id: id("rnw"), memberId: renewalMember.memberId, planId: "plan_3m", preferredStart: T, note: "Want to restart from this week.", status: "pending", createdAt: new Date(now.getTime() - 5 * 3600e3).toISOString() }]
      : [],
    tickets: [],
    settings: {
      name: "PulseFit Gym",
      tagline: "Train hard. Live strong.",
      phone: "+91 98100 12345",
      email: "hello@pulsefit.in",
      address: "2nd Floor, Galaxy Plaza, Sector 18, Noida, UP 201301",
      gstin: "09ABCDE1234F1Z5",
      memberPrefix: "GYM-",
      receiptPrefix: "RCP-",
      openTime: "05:00",
      closeTime: "22:00",
      expiryReminderDays: 7,
      receiptFooter: "Fees once paid are non-refundable. Thank you for training with us!",
    },
    counters: { member: 1001 + COUNT, receipt: 10001 + sortedPayments.length },
  };
}
