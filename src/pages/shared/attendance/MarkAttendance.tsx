import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Clock, Percent, ScanLine, Search, Trash2, UserCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { attendanceService } from "@/services/gymService";
import { useMemberSearch } from "@/components/forms/MemberPicker";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/common";
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { stagger } from "@/animations/motion";
import { today } from "@/utils/date";
import { fmtTime, timeAgo } from "@/utils/format";
import { format } from "date-fns";

export default function MarkAttendance() {
  const { db, ix } = useGym(0);
  const { to, isAdmin } = usePanel();
  const { can } = useAuth();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ name: string; time: string } | null>(null);
  const results = useMemberSearch(q, 8);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = today();

  const todays = useMemo(() => db.attendance.filter((a) => a.date === t).sort((a, b) => b.checkIn.localeCompare(a.checkIn)), [db.attendance, t]);
  const active = useMemo(() => [...ix.status.values()].filter((s) => s === "active").length, [ix]);
  const peak = useMemo(() => {
    const h = new Map<number, number>();
    todays.forEach((a) => { const k = new Date(a.checkIn).getHours(); h.set(k, (h.get(k) ?? 0) + 1); });
    const top = [...h.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? `${format(new Date().setHours(top[0], 0), "h a")}` : "—";
  }, [todays]);

  const mark = async (id: string, allowExpired = false) => {
    setBusyId(id);
    try {
      const r = await attendanceService.mark(id, { allowExpired });
      setFlash(r);
      setTimeout(() => setFlash(null), 2200);
      toast.success(`${r.name} marked present`, { description: fmtTime(r.time) });
      setQ("");
      inputRef.current?.focus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title={isAdmin ? "Daily Attendance" : "Mark Attendance"} description={`${format(new Date(), "EEEE, dd MMMM yyyy")} · one check-in per member per gym day.`} />

      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Present today" value={todays.length} icon={UserCheck} />
        <StatCard label="Active members" value={active} icon={Users} tone="success" />
        <StatCard label="Turnout" value={active ? Math.round((todays.length / active) * 100) : 0} format={(n) => `${Math.round(n)}%`} icon={Percent} tone="info" />
        <StatCard label="Peak hour" value={todays.length} format={() => peak} icon={Clock} tone="warning" />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <Card className="min-w-0">
          <CardHeader><div><CardTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> Check-in</CardTitle></div></CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length === 1 && can("markAttendance")) mark(results[0].id);
                }}
                placeholder="Member name, ID (GYM-1001) or mobile…"
                className="h-14 rounded-xl pl-12 pr-12 text-base"
                aria-label="Search member to check in"
              />
              {q && <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg hover:bg-accent" aria-label="Clear"><X className="h-4 w-4" /></button>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tip: type a full member ID and press Enter to check in instantly.</p>

            <AnimatePresence>
              {flash && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="mt-4 flex items-center gap-3 rounded-xl bg-lime p-4 text-lime-foreground">
                  <CheckCircle2 className="h-7 w-7" />
                  <div><div className="font-display text-xl font-bold uppercase">{flash.name}</div><div className="text-sm opacity-80">Checked in at {fmtTime(flash.time)}</div></div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 space-y-2">
              {!q && !flash && <EmptyState icon={CalendarCheck} title="Search to check in" description="Results show membership status so expired members can be sent for renewal." className="py-8" />}
              {q && results.length === 0 && <EmptyState title="No member found" description={`No one matches “${q}”.`} className="py-8" />}
              {results.map((m) => {
                const st = ix.status.get(m.id)!;
                const time = ix.presentToday.get(m.id);
                const ms = ix.latestMs.get(m.id);
                return (
                  <motion.div layout key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={m.name} src={m.photo} className="h-11 w-11" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{m.name}</span><StatusBadge status={st} /></div>
                        <div className="truncate text-xs text-muted-foreground">{m.code} · {ms ? `${ms.planName} till ${ms.endDate}` : "No plan"}</div>
                      </div>
                    </div>
                    {time ? (
                      <Badge variant="success" className="h-9 justify-center px-3 text-sm"><CheckCircle2 className="h-4 w-4" /> Present · {fmtTime(time)}</Badge>
                    ) : st === "active" ? (
                      <Button variant="lime" size="lg" className="sm:w-40" loading={busyId === m.id} disabled={!can("markAttendance")} onClick={() => mark(m.id)}><CalendarCheck /> Mark present</Button>
                    ) : st === "expired" ? (
                      <div className="flex gap-2">
                        <Button asChild variant="outline"><Link to={to(`membership/renew?member=${m.id}`)}>Renew</Link></Button>
                        {isAdmin && <Button variant="ghost" onClick={async () => { if (await confirm({ title: "Allow check-in?", description: `${m.name}'s membership has expired. Allow a one-time check-in anyway?`, confirmText: "Allow once" })) mark(m.id, true); }}>Allow once</Button>}
                      </div>
                    ) : (
                      <Badge className="h-9 justify-center px-3">Account deactivated</Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="items-center">
            <CardTitle>Today's attendance</CardTitle>
            <span className="relative flex items-center gap-2 text-xs font-semibold text-success"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>Live</span>
          </CardHeader>
          <CardContent>
            {todays.length === 0 ? <EmptyState title="No check-ins yet" className="py-8" /> : (
              <ul className="scrollbar-thin -mx-2 max-h-[560px] divide-y overflow-y-auto">
                <AnimatePresence initial={false}>
                  {todays.map((a) => {
                    const m = ix.memberById.get(a.memberId);
                    if (!m) return null;
                    return (
                      <motion.li key={a.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="flex items-center gap-3 px-2 py-2.5">
                        <Avatar name={m.name} src={m.photo} />
                        <Link to={to(`members/${m.id}`)} className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{m.name}</div><div className="truncate text-xs text-muted-foreground">{m.code} · by {a.markedBy}</div></Link>
                        <div className="text-right"><div className="text-sm font-semibold tabular">{fmtTime(a.checkIn)}</div><div className="text-[11px] text-muted-foreground">{timeAgo(a.checkIn)}</div></div>
                        {isAdmin && <Button variant="ghost" size="icon-sm" aria-label="Remove check-in" onClick={async () => { if (await confirm({ title: "Remove this check-in?", description: `${m.name} at ${fmtTime(a.checkIn)}`, destructive: true, confirmText: "Remove" })) attendanceService.remove(a.id).then(() => toast.success("Check-in removed")); }}><Trash2 /></Button>}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
