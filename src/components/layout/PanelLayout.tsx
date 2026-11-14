import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/utils/cn";
import { Logo, BrandMark } from "@/components/common";
import { Avatar } from "@/components/ui/primitives";
import { Sheet, SheetContent } from "@/components/ui/overlays";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useGym } from "@/hooks/useGym";
import { useLocalPref, useMediaQuery } from "@/hooks/useUtils";
import { notificationService } from "@/services/gymService";
import { pageVariants } from "@/animations/motion";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Topbar } from "./Topbar";
import type { NavItem, PanelConfig } from "./types";

const groupPrefix = (item: NavItem) => (item.children ? item.children[0].to.split("/").slice(0, 3).join("/") : item.to ?? "");

function useUnread(role: PanelConfig["role"]) {
  const { db } = useGym(0);
  const { session } = useAuth();
  return useMemo(() => notificationService.forUser(db, role, session?.userId).filter((n) => !n.read).length, [db, role, session?.userId]);
}

function SidebarNav({ panel, collapsed, onNavigate }: { panel: PanelConfig; collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const unread = useUnread(panel.role);
  const activeGroup = panel.nav.find((n) => n.children && pathname.startsWith(groupPrefix(n)))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>(() => (activeGroup ? { [activeGroup]: true } : {}));
  useEffect(() => {
    if (activeGroup) setOpen((o) => ({ ...o, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <nav aria-label="Main" className="scrollbar-none flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {panel.nav.map((item) => {
        const Icon = item.icon;
        const isGroupActive = item.children ? pathname.startsWith(groupPrefix(item)) : item.to === panel.base ? pathname === panel.base : pathname.startsWith(item.to!);
        const rowCls = cn(
          "group relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors duration-200",
          isGroupActive ? "text-white" : "text-sidebar-muted hover:bg-white/[0.04] hover:text-white",
          collapsed && "justify-center px-0",
        );
        const indicator = isGroupActive && (
          <motion.span layoutId={`nav-active-${panel.role}${collapsed ? "-c" : ""}`} className="absolute inset-0 -z-10 rounded-lg bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]" transition={{ type: "spring", stiffness: 420, damping: 36 }}>
            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-lime" />
          </motion.span>
        );
        const badge = item.badge === "notifications" && unread > 0 && (
          <span key={unread} className={cn("grid h-5 min-w-5 animate-badge-pop place-items-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-lime-foreground", collapsed ? "absolute right-1 top-1 h-4 min-w-4 px-1" : "ml-auto")}>{unread > 99 ? "99+" : unread}</span>
        );

        if (!item.children)
          return (
            <NavLink key={item.label} to={item.to!} end={item.to === panel.base} onClick={onNavigate} title={collapsed ? item.label : undefined} className={cn(rowCls, "isolate")}>
              {indicator}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isGroupActive && "text-lime")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {badge}
            </NavLink>
          );

        if (collapsed)
          return (
            <Link key={item.label} to={item.children[0].to} onClick={onNavigate} title={item.label} className={cn(rowCls, "isolate")}>
              {indicator}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isGroupActive && "text-lime")} />
            </Link>
          );

        const isOpen = !!open[item.label];
        return (
          <div key={item.label}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [item.label]: !o[item.label] }))} className={cn(rowCls, "isolate")}>
              {indicator}
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isGroupActive && "text-lime")} />
              <span className="truncate">{item.label}</span>
              <ChevronDown className={cn("ml-auto h-4 w-4 opacity-60 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <div className="relative ml-[21px] space-y-0.5 border-l border-sidebar-border py-1 pl-3">
                    {item.children.map((c) => (
                      <NavLink
                        key={c.to}
                        to={c.to}
                        end
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          cn("relative flex h-9 items-center rounded-md px-2.5 text-[13px] transition-colors", isActive ? "font-semibold text-lime" : "text-sidebar-muted hover:bg-white/[0.04] hover:text-white")
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <span className="absolute -left-[13px] top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-lime" />}
                            {c.label}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ collapsed, panel }: { collapsed: boolean; panel: PanelConfig }) {
  const { session, logout } = useAuth();
  const { db } = useGym(0);
  const nav = useNavigate();
  const photo = panel.role === "member" ? db.members.find((m) => m.id === session?.userId)?.photo : db.staff.find((s) => s.id === session?.userId)?.photo;
  return (
    <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
      <div className={cn("flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5", collapsed && "justify-center bg-transparent p-0")}>
        {!collapsed && (
          <>
            <Avatar name={session?.name ?? "User"} src={photo} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">{session?.name}</div>
              <div className="truncate text-[11px] text-sidebar-muted">{panel.label}</div>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => { logout(); nav("/login"); }}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-muted transition hover:bg-white/10 hover:text-white"
          title="Logout"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SidebarShell({ panel, collapsed, onNavigate, onToggle }: { panel: PanelConfig; collapsed: boolean; onNavigate?: () => void; onToggle?: () => void }) {
  const { db } = useGym(0);
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-16 shrink-0 items-center justify-between px-5", collapsed && "justify-center px-0")}>
        <Link to={panel.base} onClick={onNavigate} aria-label="Dashboard">
          {collapsed ? <BrandMark /> : <Logo name={db.settings.name} sub={panel.label} light />}
        </Link>
        {onToggle && !collapsed && (
          <button type="button" onClick={onToggle} className="hidden h-8 w-8 cursor-pointer place-items-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white lg:grid" aria-label="Collapse sidebar">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      {collapsed && onToggle && (
        <button type="button" onClick={onToggle} className="mx-auto mb-1 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-sidebar-muted hover:bg-white/10 hover:text-white" aria-label="Expand sidebar">
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}
      <SidebarNav panel={panel} collapsed={collapsed} onNavigate={onNavigate} />
      <SidebarFooter collapsed={collapsed} panel={panel} />
    </div>
  );
}

function BottomNav({ panel }: { panel: PanelConfig }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-safe backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
        {panel.bottomNav.map((i) => {
          const active = i.to === panel.base ? pathname === panel.base : pathname.startsWith(i.to);
          const Icon = i.icon;
          return (
            <Link key={i.to} to={i.to} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold" aria-current={active ? "page" : undefined}>
              {active && <motion.span layoutId="bottom-active" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-lime" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active ? "bg-lime/25 text-foreground" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className={active ? "text-foreground" : "text-muted-foreground"}>{i.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PanelLayout({ panel }: { panel: PanelConfig }) {
  const location = useLocation();
  const outlet = useOutlet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const [prefCollapsed, setPrefCollapsed] = useLocalPref("sidebarCollapsed", false);
  const collapsed = isTablet ? true : prefCollapsed;
  const [tabletExpanded, setTabletExpanded] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setTabletExpanded(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      {/* desktop / tablet sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 ease-out md:block", collapsed ? "w-[76px]" : "w-[268px]")}>
        <SidebarShell panel={panel} collapsed={collapsed} onToggle={isTablet ? () => setTabletExpanded(true) : () => setPrefCollapsed((c) => !c)} />
      </aside>

      {/* mobile + tablet-expanded drawer */}
      <Sheet open={mobileOpen || tabletExpanded} onOpenChange={(o) => { setMobileOpen(o); setTabletExpanded(o && tabletExpanded); }}>
        <SheetContent side="left" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarShell panel={panel} collapsed={false} onNavigate={() => { setMobileOpen(false); setTabletExpanded(false); }} />
        </SheetContent>
      </Sheet>

      <div className={cn("flex min-h-dvh flex-col transition-[padding] duration-300 ease-out", collapsed ? "md:pl-[76px]" : "md:pl-[268px]")}>
        <Topbar panel={panel} onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 lg:px-8 lg:pt-7">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="enter" exit="exit">
              <ErrorBoundary resetKey={location.pathname}>{outlet}</ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav panel={panel} />
    </div>
  );
}

