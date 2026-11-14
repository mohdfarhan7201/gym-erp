import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CreditCard, Eye, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useMemberSearch } from "@/components/forms/MemberPicker";
import { attendanceService } from "@/services/gymService";
import { totalDue } from "@/services/selectors";
import { EmptyState, PageHeader, StatusBadge } from "@/components/common";
import { Avatar, Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { daysLeft } from "@/utils/date";
import { fmtDate, money } from "@/utils/format";

export default function MemberSearch() {
  const [q, setQ] = useState("");
  const results = useMemberSearch(q, 24);
  const { ix } = useGym(0);
  const { to } = usePanel();
  const { can } = useAuth();

  return (
    <div>
      <PageHeader title="Member Search" description="Find any member instantly by name, member ID or mobile number." />
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name, GYM-1001 or 98…" className="h-14 rounded-2xl pl-12 pr-12 text-base shadow-card" aria-label="Search members" />
        {q && <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg hover:bg-accent" aria-label="Clear"><X className="h-4 w-4" /></button>}
      </div>

      <div className="mt-6">
        {!q ? (
          <EmptyState icon={Search} title="Start typing to search" description="Results appear instantly as you type." />
        ) : results.length === 0 ? (
          <EmptyState title="No members found" description={`Nothing matches “${q}”.`} action={can("registerMembers") && <Button asChild variant="lime"><Link to={to("members/new")}>Register new member</Link></Button>} />
        ) : (
          <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {results.map((m) => {
                const ms = ix.latestMs.get(m.id);
                const status = ix.status.get(m.id)!;
                const due = totalDue(m.id, ix);
                const present = ix.presentToday.has(m.id);
                return (
                  <motion.div key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="p-4 transition-shadow hover:shadow-lift">
                      <div className="flex items-start gap-3">
                        <Avatar name={m.name} src={m.photo} className="h-12 w-12" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{m.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.code} · {m.phone}</div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><StatusBadge status={status} />{due > 0 && <span className="text-xs font-semibold text-danger">Due {money(due)}</span>}</div>
                        </div>
                      </div>
                      {ms && <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{ms.planName} · ends {fmtDate(ms.endDate)} {daysLeft(ms.endDate) >= 0 && `(${daysLeft(ms.endDate)}d left)`}</div>}
                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        <Button asChild variant="outline" size="sm" className="px-0"><Link to={to(`members/${m.id}`)} aria-label="View"><Eye /></Link></Button>
                        <Button variant={present ? "secondary" : "lime"} size="sm" className="px-0" disabled={present || status !== "active" || !can("markAttendance")} aria-label="Check in"
                          onClick={() => attendanceService.mark(m.id).then(() => toast.success(`${m.name} checked in`)).catch((e) => toast.error(e.message))}><CalendarCheck /></Button>
                        <Button asChild variant="outline" size="sm" className="px-0"><Link to={to(`payments/collect?member=${m.id}`)} aria-label="Collect"><CreditCard /></Link></Button>
                        <Button asChild variant="outline" size="sm" className="px-0"><Link to={to(`membership/renew?member=${m.id}`)} aria-label="Renew"><RefreshCw /></Link></Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
