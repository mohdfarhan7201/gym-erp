import {
  Activity, BarChart3, Bell, CalendarCheck, CreditCard, DatabaseBackup, IdCard, LayoutDashboard, ReceiptText, Settings, ShieldCheck, UserCircle, Users, Wallet, Wrench,
} from "lucide-react";
import type { PanelConfig } from "@/components/layout/types";

const b = "/admin";
export const adminPanel: PanelConfig = {
  role: "admin",
  base: b,
  label: "Owner Console",
  nav: [
    { label: "Dashboard", icon: LayoutDashboard, to: `${b}` },
    { label: "Members", icon: Users, children: [
      { label: "All Members", to: `${b}/members` },
      { label: "Add New Member", to: `${b}/members/new` },
      { label: "Active Members", to: `${b}/members/active` },
      { label: "Inactive Members", to: `${b}/members/inactive` },
      { label: "Expired Members", to: `${b}/members/expired` },
    ] },
    { label: "Membership", icon: IdCard, children: [
      { label: "Membership Plans", to: `${b}/membership/plans` },
      { label: "Active Memberships", to: `${b}/membership/active` },
      { label: "Expired Memberships", to: `${b}/membership/expired` },
      { label: "Renew Membership", to: `${b}/membership/renew` },
    ] },
    { label: "Payments", icon: CreditCard, children: [
      { label: "Collect Payment", to: `${b}/payments/collect` },
      { label: "Payment History", to: `${b}/payments/history` },
      { label: "Pending Payments", to: `${b}/payments/pending` },
      { label: "Receipts", to: `${b}/payments/receipts` },
    ] },
    { label: "Attendance", icon: CalendarCheck, children: [
      { label: "Daily Attendance", to: `${b}/attendance` },
      { label: "Attendance History", to: `${b}/attendance/history` },
      { label: "Attendance Reports", to: `${b}/attendance/reports` },
    ] },
    { label: "Extra Charges", icon: Wrench, children: [
      { label: "Add Extra Charge", to: `${b}/charges/new` },
      { label: "All Charges", to: `${b}/charges` },
      { label: "Pending Charges", to: `${b}/charges/pending` },
      { label: "Paid Charges", to: `${b}/charges/paid` },
    ] },
    { label: "Expenses", icon: Wallet, children: [
      { label: "Expense Dashboard", to: `${b}/expenses` },
      { label: "Add Expense", to: `${b}/expenses/new` },
      { label: "Expense History", to: `${b}/expenses/history` },
      { label: "Categories", to: `${b}/expenses/categories` },
    ] },
    { label: "Reports", icon: BarChart3, children: [
      { label: "Collection Reports", to: `${b}/reports/collection` },
      { label: "Attendance Reports", to: `${b}/reports/attendance` },
      { label: "Member Reports", to: `${b}/reports/members` },
      { label: "Expense Reports", to: `${b}/reports/expenses` },
      { label: "Profit & Loss", to: `${b}/reports/profit-loss` },
    ] },
    { label: "Staff Management", icon: ShieldCheck, children: [
      { label: "All Staff", to: `${b}/staff` },
      { label: "Add Receptionist", to: `${b}/staff/new` },
      { label: "Permissions", to: `${b}/staff/permissions` },
    ] },
    { label: "Notifications", icon: Bell, to: `${b}/notifications`, badge: "notifications" },
    { label: "Activity Logs", icon: Activity, to: `${b}/activity` },
    { label: "Backup & Restore", icon: DatabaseBackup, to: `${b}/backup` },
    { label: "Gym Settings", icon: Settings, to: `${b}/settings` },
    { label: "My Profile", icon: UserCircle, to: `${b}/profile` },
  ],
  bottomNav: [
    { label: "Home", icon: LayoutDashboard, to: b },
    { label: "Members", icon: Users, to: `${b}/members` },
    { label: "Check-in", icon: CalendarCheck, to: `${b}/attendance` },
    { label: "Collect", icon: ReceiptText, to: `${b}/payments/collect` },
    { label: "Reports", icon: BarChart3, to: `${b}/reports/collection` },
  ],
};
