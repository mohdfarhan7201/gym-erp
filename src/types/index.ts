export type Role = "admin" | "receptionist" | "member";
export type ID = string;
/** yyyy-MM-dd */
export type DateStr = string;
/** ISO timestamp */
export type ISO = string;

export type Gender = "male" | "female" | "other";
export type PaymentMethod = "cash" | "upi" | "card" | "bank";
export type MemberStatus = "active" | "inactive" | "expired";
export type MembershipStatus = "active" | "expired" | "upcoming";

export interface Plan {
  id: ID;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  features: string[];
  active: boolean;
  popular?: boolean;
}

export interface Member {
  id: ID;
  code: string;
  name: string;
  phone: string;
  email?: string;
  gender: Gender;
  dob?: DateStr;
  address: string;
  photo?: string | null;
  bloodGroup?: string;
  emergencyContact?: string;
  occupation?: string;
  notes?: string;
  joinDate: DateStr;
  /** false when admin/reception has deactivated (frozen) the member */
  isActive: boolean;
  createdAt: ISO;
}

export interface Membership {
  id: ID;
  memberId: ID;
  planId: ID;
  planName: string;
  durationMonths: number;
  price: number;
  discount: number;
  startDate: DateStr;
  endDate: DateStr;
  createdAt: ISO;
  createdBy: string;
}

export type PaymentKind = "membership" | "extra_charge" | "other";

export interface Payment {
  id: ID;
  receiptNo: string;
  memberId: ID;
  kind: PaymentKind;
  membershipId?: ID;
  chargeId?: ID;
  description: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date: DateStr;
  createdAt: ISO;
  collectedBy: string;
  note?: string;
}

export type ChargeType =
  | "Equipment Damage"
  | "Machine Repair"
  | "Locker Damage"
  | "Lost Key"
  | "Access Card"
  | "Late Payment Fine"
  | "Other Penalties";

export interface ExtraCharge {
  id: ID;
  memberId: ID;
  type: ChargeType;
  description: string;
  amount: number;
  date: DateStr;
  status: "pending" | "paid";
  paidAt?: ISO;
  paymentId?: ID;
  createdBy: string;
}

export interface Attendance {
  id: ID;
  memberId: ID;
  date: DateStr;
  checkIn: ISO;
  markedBy: string;
}

export interface ExpenseCategory {
  id: ID;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface Expense {
  id: ID;
  categoryId: ID;
  title: string;
  amount: number;
  date: DateStr;
  method: PaymentMethod;
  vendor?: string;
  note?: string;
  createdBy: string;
  createdAt: ISO;
}

export type PermissionKey =
  | "registerMembers"
  | "editMembers"
  | "deleteMembers"
  | "collectPayments"
  | "giveDiscounts"
  | "addExtraCharges"
  | "markAttendance"
  | "renewMemberships"
  | "viewPaymentHistory";

export interface Staff {
  id: ID;
  name: string;
  email: string;
  phone: string;
  role: Exclude<Role, "member">;
  password: string;
  active: boolean;
  joinedAt: DateStr;
  shift?: string;
  photo?: string | null;
  permissions: Record<PermissionKey, boolean>;
}

export type NotificationType = "info" | "success" | "warning" | "danger";

export interface AppNotification {
  id: ID;
  audience: Role;
  /** for member notifications */
  memberId?: ID;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  createdAt: ISO;
  read: boolean;
}

export interface ActivityLog {
  id: ID;
  actor: string;
  role: Role;
  action: string;
  entity: string;
  details: string;
  at: ISO;
}

export interface RenewalRequest {
  id: ID;
  memberId: ID;
  planId: ID;
  preferredStart: DateStr;
  note?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: ISO;
}

export interface SupportTicket {
  id: ID;
  memberId: ID;
  subject: string;
  category: string;
  message: string;
  status: "open" | "resolved";
  createdAt: ISO;
}

export interface GymSettings {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  memberPrefix: string;
  receiptPrefix: string;
  openTime: string;
  closeTime: string;
  expiryReminderDays: number;
  receiptFooter: string;
}

export interface DB {
  plans: Plan[];
  members: Member[];
  memberships: Membership[];
  payments: Payment[];
  charges: ExtraCharge[];
  attendance: Attendance[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  staff: Staff[];
  notifications: AppNotification[];
  activity: ActivityLog[];
  renewals: RenewalRequest[];
  tickets: SupportTicket[];
  settings: GymSettings;
  counters: { member: number; receipt: number };
}

export interface Session {
  role: Role;
  userId: ID;
  name: string;
  email: string;
  loggedInAt: ISO;
}
