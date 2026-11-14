import { Bell, CalendarCheck, CreditCard, IdCard, LayoutDashboard, ReceiptText, UserCircle, Users, Wrench } from "lucide-react";
import type { PanelConfig } from "@/components/layout/types";

const b = "/reception";
export const receptionPanel: PanelConfig = {
  role: "receptionist",
  base: b,
  label: "Front Desk",
  nav: [
    { label: "Dashboard", icon: LayoutDashboard, to: b },
    { label: "Members", icon: Users, children: [
      { label: "All Members", to: `${b}/members` },
      { label: "Register New Member", to: `${b}/members/new` },
      { label: "Member Search", to: `${b}/members/search` },
    ] },
    { label: "Membership", icon: IdCard, children: [
      { label: "Active Memberships", to: `${b}/membership/active` },
      { label: "Expired Memberships", to: `${b}/membership/expired` },
      { label: "Renew Membership", to: `${b}/membership/renew` },
    ] },
    { label: "Payments", icon: CreditCard, children: [
      { label: "Collect Fees", to: `${b}/payments/collect` },
      { label: "Payment History", to: `${b}/payments/history` },
      { label: "Pending Payments", to: `${b}/payments/pending` },
      { label: "Generate Receipt", to: `${b}/payments/receipts` },
    ] },
    { label: "Attendance", icon: CalendarCheck, children: [
      { label: "Mark Attendance", to: `${b}/attendance` },
      { label: "Today's Attendance", to: `${b}/attendance/today` },
      { label: "Attendance History", to: `${b}/attendance/history` },
    ] },
    { label: "Extra Charges", icon: Wrench, children: [
      { label: "Add Extra Charge", to: `${b}/charges/new` },
      { label: "Collect Extra Charges", to: `${b}/charges/pending` },
      { label: "Charge History", to: `${b}/charges` },
    ] },
    { label: "Notifications", icon: Bell, to: `${b}/notifications`, badge: "notifications" },
    { label: "My Profile", icon: UserCircle, to: `${b}/profile` },
  ],
  bottomNav: [
    { label: "Home", icon: LayoutDashboard, to: b },
    { label: "Check-in", icon: CalendarCheck, to: `${b}/attendance` },
    { label: "Members", icon: Users, to: `${b}/members` },
    { label: "Collect", icon: ReceiptText, to: `${b}/payments/collect` },
    { label: "Alerts", icon: Bell, to: `${b}/notifications` },
  ],
};
