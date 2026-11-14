import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, LogOut, Menu, Monitor, Moon, Search, Sun, UserCircle, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useGym } from "@/hooks/useGym";
import { notificationService } from "@/services/gymService";
import { Avatar, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { BrandMark, StatusBadge } from "@/components/common";
import { useMemberSearch } from "@/components/forms/MemberPicker";
import { timeAgo } from "@/utils/format";
import type { NotificationType } from "@/types";
import type { PanelConfig } from "./types";

const dot: Record<NotificationType, string> = { info: "bg-info", success: "bg-success", warning: "bg-warning", danger: "bg-danger" };

function NotificationBell({ panel }: { panel: PanelConfig }) {
  const { db } = useGym(0);
  const { session } = useAuth();
  const nav = useNavigate();
  const list = useMemo(() => notificationService.forUser(db, panel.role, session?.userId), [db, panel.role, session?.userId]);
  const unread = list.filter((n) => !n.read);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread.length} unread`}>
          <Bell className="!h-[19px] !w-[19px]" />
          <AnimatePresence>
            {unread.length > 0 && (
              <motion.span key={unread.length} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }} className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-lime px-1 text-[10px] font-bold text-lime-foreground ring-2 ring-background">
                {unread.length > 9 ? "9+" : unread.length}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-display text-base font-bold uppercase tracking-wide">Notifications</div>
          {unread.length > 0 && (
            <button type="button" onClick={() => notificationService.markRead(unread.map((n) => n.id))} className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-lime-ink hover:underline">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="scrollbar-thin max-h-[360px] overflow-y-auto p-1.5">
          {list.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {list.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="items-start gap-3 py-2.5"
              onSelect={() => {
                notificationService.markRead([n.id]);
                if (n.link) nav(`${panel.base}/${n.link}`);
              }}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-muted-foreground/30" : dot[n.type])} />
              <div className="min-w-0 flex-1">
                <div className={cn("text-[13px] leading-snug", !n.read && "font-semibold")}>{n.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</div>
                <div className="mt-1 text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
        <div className="border-t p-1.5">
          <DropdownMenuItem className="justify-center font-semibold" onSelect={() => nav(`${panel.base}/notifications`)}>View all notifications</DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch({ panel }: { panel: PanelConfig }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const results = useMemberSearch(q, 8);
  const { ix } = useGym(0);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const go = (id: string) => {
    setOpen(false);
    setQ("");
    nav(`${panel.base}/members/${id}`);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden h-10 w-full max-w-sm cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition hover:border-foreground/20 sm:flex">
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search members…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold lg:inline">Ctrl K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setOpen(true)} aria-label="Search members"><Search /></Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <DialogContent size="md" aria-describedby={undefined} className="sm:top-[20%] sm:translate-y-0">
          <DialogTitle className="sr-only">Search members</DialogTitle>
          <div className="relative border-b">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => { setQ(e.target.value); setHi(0); }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
                if (e.key === "Enter" && results[hi]) go(results[hi].id);
              }}
              placeholder="Name, member ID or mobile number"
              className="h-14 rounded-none border-0 bg-transparent pl-12 pr-12 text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="scrollbar-thin max-h-[50vh] overflow-y-auto p-2">
            {!q && <p className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Start typing to find a member</p>}
            {q && results.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">No members match “{q}”.</p>}
            {results.map((m, i) => (
              <button key={m.id} type="button" onClick={() => go(m.id)} onMouseEnter={() => setHi(i)} className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left", hi === i && "bg-accent")}>
                <Avatar name={m.name} src={m.photo} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.code} · {m.phone}</div>
                </div>
                <StatusBadge status={ix.status.get(m.id)!} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Topbar({ panel, onMenu }: { panel: PanelConfig; onMenu: () => void }) {
  const { session, logout } = useAuth();
  const { mode, setMode, resolved, toggle } = useTheme();
  const { db } = useGym(0);
  const nav = useNavigate();
  const photo = panel.role === "member" ? db.members.find((m) => m.id === session?.userId)?.photo : db.staff.find((s) => s.id === session?.userId)?.photo;
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header className={cn("sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-transparent bg-background/80 px-3 backdrop-blur-xl transition-[border-color,box-shadow] sm:px-6 lg:px-8", scrolled && "border-border shadow-[0_1px_0_rgba(0,0,0,0.02)]")}>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu"><Menu /></Button>
      <Link to={panel.base} className="md:hidden" aria-label="Home"><BrandMark className="h-8 w-8" /></Link>
      <div className="flex min-w-0 flex-1 items-center">
        {panel.role !== "member" ? <GlobalSearch panel={panel} /> : (
          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm text-muted-foreground">Welcome back,</div>
            <div className="-mt-0.5 truncate font-semibold">{session?.name}</div>
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={resolved} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }} className="grid place-items-center">
            {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </Button>
      <NotificationBell panel={panel} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex cursor-pointer items-center gap-2 rounded-full p-0.5 pr-0.5 transition hover:bg-accent sm:pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
            <Avatar name={session?.name ?? "User"} src={photo} className="h-9 w-9" />
            <div className="hidden text-left leading-tight lg:block">
              <div className="max-w-[140px] truncate text-[13px] font-semibold">{session?.name}</div>
              <div className="text-[11px] capitalize text-muted-foreground">{panel.role === "admin" ? "Owner" : panel.role}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>
            <div className="truncate text-sm font-semibold text-foreground">{session?.name}</div>
            <div className="truncate font-normal">{session?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => nav(`${panel.base}/profile`)}><UserCircle /> My Profile</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => nav(`${panel.base}/notifications`)}><Bell /> Notifications</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5">
            {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([m, Icon]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex cursor-pointer flex-col items-center gap-1 rounded-lg border py-2 text-[11px] font-semibold capitalize transition", mode === m ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent")}>
                <Icon className="h-4 w-4" /> {m}
              </button>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => { logout(); nav("/login"); }}><LogOut /> Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
