import type { PermissionKey } from "@/types";

export const PERMISSIONS: { key: PermissionKey; label: string; description: string }[] = [
  { key: "registerMembers", label: "Register members", description: "Add new members at the front desk" },
  { key: "editMembers", label: "Edit members", description: "Update member profile details and photo" },
  { key: "deleteMembers", label: "Delete members", description: "Permanently remove member records" },
  { key: "collectPayments", label: "Collect payments", description: "Collect membership fees and generate receipts" },
  { key: "giveDiscounts", label: "Give discounts", description: "Apply a discount while registering or renewing" },
  { key: "addExtraCharges", label: "Add extra charges", description: "Raise damage, fine and other charges" },
  { key: "markAttendance", label: "Mark attendance", description: "Check members in at the front desk" },
  { key: "renewMemberships", label: "Renew memberships", description: "Create renewals and approve requests" },
  { key: "viewPaymentHistory", label: "View payment history", description: "See past payments and reprint receipts" },
];

export const allPermissions = (v: boolean) =>
  Object.fromEntries(PERMISSIONS.map((p) => [p.key, v])) as Record<PermissionKey, boolean>;
