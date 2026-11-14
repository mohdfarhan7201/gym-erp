import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, CalendarCheck, CalendarDays, CreditCard, Flame, IdCard, Receipt, RefreshCw } from "lucide-react";
import { useMyAccount } from "@/hooks/useMyAccount";
import { AnimatedNumber, StatCard, StatCardSkeleton, StatusBadge } from "@/components/common";
import { ListCard } from "@/components/dashboard/Widgets";
import { Avatar, Badge, Card, Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fadeUp, stagger } from "@/animations/motion";
import { daysBetween, daysLeft, daysAgo, today } from "@/utils/date";
import { fmtDate, fmtShortDate, fmtTime, methodLabel, money, timeAgo } from "@/utils/format";

function streak(dates: Set<string>) {
  let s = 0;
  for (let i = dates.has(today()) ? 0 : 1; i < 365; i++) {
    if (dates.has(daysAgo(i))) s++;
    else break;
  }
  return s;
}

export default function MemberDashboard() {
  const { acc, d, loading } = useMyAccount();
  if (!acc || !d) return null;
  const { member, payments, attendance, charges } = acc;
  const cur = d.current;
  const left = cur ? Math.max(0, daysLeft(cur.endDate)) : 0;
  const total = cur ? daysBetween(cur.startDate, cur.endDate) + 1 : 1;
  const dates = new Set(attendance.map((a) => a.date));
  const thisMonth = attendance.filter((a) => a.date.startsWith(today().slice(0, 7))).length;
  const lastPayment = payments[0];
  const activities = [
    ...attendance.slice(0, 5).map((a) => ({ at: a.checkIn, icon: CalendarCheck, text: `Checked in at ${fmtTime(a.checkIn)}`, sub: fmtDate(a.date) })),
    ...payments.slice(0, 4).map((p) => ({ at: p.createdAt, icon: Receipt, text: `Paid ${money(p.amount)} · ${p.receiptNo}`, sub: p.description })),
    ...charges.slice(0, 3).map((c) => ({ at: c.date + "T12:00:00", icon: AlertCircle, text: `${c.type} charge ${money(c.amount)}`, sub: c.status === "paid" ? "Paid" : "Pending" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7);

  return (
    <div>
      {/* Hero membership card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Card className="relative overflow-hidden border-transparent bg-[#0B0D10] p-5 text-white sm:p-7">
          <div className="bg-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" />
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-lime/25 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar name={member.name} src={member.photo} ring className="h-16 w-16 text-lg sm:h-20 sm:w-20" />
              <div className="min-w-0">
                <p className="text-sm text-white/60">Welcome back,</p>
                <h1 className="truncate font-display text-3xl font-extrabold uppercase tracking-wide sm:text-4xl">{member.name.split(" ")[0]}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs">{member.code}</span><StatusBadge status={d.status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
              {[
                ["Plan", cur?.planName ?? "—"],
                ["Started", fmtShortDate(cur?.startDate)],
                ["Expires", fmtShortDate(cur?.endDate)],
                ["Days left", String(left)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[11px] uppercase tracking-wider text-white/50">{k}</div>
                  <div className={`mt-0.5 truncate font-display text-xl font-bold ${k === "Days left" ? "text-lime" : ""}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {cur && (
            <div className="relative mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-white/60"><span>Membership progress</span><span>{Math.round(((total - left) / total) * 100)}%</span></div>
              <Progress value={((total - left) / total) * 100} className="h-2 bg-white/10" />
            </div>
          )}
          {(d.status === "expired" || left <= 7) && (
            <div className="relative mt-5 flex flex-col gap-3 rounded-xl bg-lime p-3 text-lime-foreground sm:flex-row sm:items-center">
              <RefreshCw className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-sm font-semibold">{d.status === "expired" ? "Your membership has expired." : `Your membership ends in ${left} day${left === 1 ? "" : "s"}.`} Renew to keep training.</div>
              <Button asChild size="sm" className="bg-[#0B0D10] text-white hover:bg-black"><Link to="/member/membership">Renew now <ArrowRight /></Link></Button>
            </div>
          )}
        </Card>
      </motion.div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="enter" className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Total attendance" value={attendance.length} icon={CalendarDays} tone="lime" hint={`${thisMonth} this month`} to="/member/attendance" />
          <StatCard label="Current streak" value={streak(dates)} format={(n) => `${Math.round(n)} days`} icon={Flame} tone="warning" to="/member/attendance" />
          <StatCard label="Last payment" value={lastPayment?.amount ?? 0} format={money} icon={CreditCard} tone="success" hint={lastPayment ? fmtDate(lastPayment.date) : "No payments"} to="/member/payments" />
          <StatCard label="Pending amount" value={d.pending} format={money} icon={AlertCircle} tone={d.pending ? "danger" : "default"} hint={d.pending ? "Pay at the front desk" : "All clear"} to="/member/charges" />
        </motion.div>
      )}

      <motion.div variants={stagger} initial="initial" animate="enter" className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <ListCard title="Recent activity" loading={loading} empty={!activities.length}>
          {activities.map((a, i) => {
            const I = a.icon;
            return (
              <li key={i} className="flex items-center gap-3 px-2 py-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted"><I className="h-4 w-4 text-muted-foreground" /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-medium">{a.text}</div><div className="truncate text-xs text-muted-foreground">{a.sub}</div></div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.at)}</span>
              </li>
            );
          })}
        </ListCard>
        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold uppercase tracking-wide">This week</div>
              <Badge variant="lime">{[0, 1, 2, 3, 4, 5, 6].filter((i) => dates.has(daysAgo(i))).length}/7</Badge>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {[6, 5, 4, 3, 2, 1, 0].map((i) => {
                const ds = daysAgo(i);
                const on = dates.has(ds);
                return (
                  <div key={ds} className="text-center">
                    <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.05 * (6 - i), duration: 0.35 }} className={`mx-auto h-14 w-full origin-bottom rounded-lg ${on ? "bg-lime" : "bg-muted"}`} />
                    <div className="mt-1 text-[11px] text-muted-foreground">{new Date(ds).toLocaleDateString("en-IN", { weekday: "narrow" })}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4"><Link to="/member/membership"><IdCard className="!h-5 !w-5" />My plan</Link></Button>
            <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4"><Link to="/member/receipts"><Receipt className="!h-5 !w-5" />Receipts</Link></Button>
          </div>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Visits this month</div>
            <div className="font-display text-4xl font-bold"><AnimatedNumber value={thisMonth} /></div>
            <div className="text-xs text-muted-foreground">Last payment via {lastPayment ? methodLabel[lastPayment.method] : "—"}</div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
