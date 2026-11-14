import { Bell, CalendarDays, CreditCard, FileText, IdCard, LayoutDashboard, LifeBuoy, UserCircle, Wrench } from "lucide-react";
import type { PanelConfig } from "@/components/layout/types";

const b = "/member";
export const memberPanel: PanelConfig = {
  role: "member",
  base: b,
  label: "Member App",
  nav: [
    { label: "Dashboard", icon: LayoutDashboard, to: b },
    { label: "My Profile", icon: UserCircle, to: `${b}/profile` },
    { label: "My Membership", icon: IdCard, to: `${b}/membership` },
    { label: "Payment History", icon: CreditCard, to: `${b}/payments` },
    { label: "My Attendance", icon: CalendarDays, to: `${b}/attendance` },
    { label: "Extra Charges", icon: Wrench, to: `${b}/charges` },
    { label: "Notifications", icon: Bell, to: `${b}/notifications`, badge: "notifications" },
    { label: "My Receipts", icon: FileText, to: `${b}/receipts` },
    { label: "Help & Support", icon: LifeBuoy, to: `${b}/support` },
  ],
  bottomNav: [
    { label: "Home", icon: LayoutDashboard, to: b },
    { label: "Plan", icon: IdCard, to: `${b}/membership` },
    { label: "Attendance", icon: CalendarDays, to: `${b}/attendance` },
    { label: "Payments", icon: CreditCard, to: `${b}/payments` },
    { label: "Profile", icon: UserCircle, to: `${b}/profile` },
  ],
};
