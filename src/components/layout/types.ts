import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavChild {
  label: string;
  to: string;
}
export interface NavItem {
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
  badge?: "notifications";
}
export interface PanelConfig {
  role: Role;
  base: string;
  label: string;
  nav: NavItem[];
  bottomNav: { label: string; icon: LucideIcon; to: string }[];
}
