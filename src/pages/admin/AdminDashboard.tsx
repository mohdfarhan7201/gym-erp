import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import {
  AlertCircle, CalendarCheck, CircleDollarSign, IndianRupee, PiggyBank, Plus, Receipt, TrendingUp, UserCheck, UserMinus, UserX, Users, Wallet, Wrench,
} from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, StatCard, StatCardSkeleton } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { ChartCard, DonutChart, IncomeExpenseChart, RevenueChart, BarsChart, CHART } from "@/components/charts";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { ListCard, PersonRow, DaysBadge } from "@/components/dashboard/Widgets";
import { stagger } from "@/animations/motion";
import { bucketSeries, monthlyPL, pctChange } from "@/utils/analytics";
import { daysLeft, today } from "@/utils/date";
import { compactMoney, fmtShortDate, methodLabel, money, timeAgo } from "@/utils/format";
import { sum, totalDue } from "@/services/selectors";

export default function AdminDashboard() {
  const { db, ix, loading } = useGym();
  const dr = useDateRange("30d");
  const { from, to } = dr.range;
  const t = today();

  const stats = useMemo(() => {
    const statuses = [...ix.status.values()];
    const month = format(new Date(), "yyyy-MM");
    const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");
    // compare month-to-date with the same days last month
    const dom = new Date().getDate();
    const inMonth = (d: string, m: string, uptoDay?: number) => d.startsWith(m) && (!uptoDay || Number(d.slice(8, 10)) <= uptoDay);
    const rev = sum(db.payments.filter((p) => inMonth(p.date, month)), (p) => p.amount);
    const revPrev = sum(db.payments.filter((p) => inMonth(p.date, lastMonth, dom)), (p) => p.amount);
    const exp = sum(db.expenses.filter((e) => inMonth(e.date, month)), (e) => e.amount);
    const expPrev = sum(db.expenses.filter((e) => inMonth(e.date, lastMonth, dom)), (e) => e.amount);
    return {
      total: db.members.length,
      active: statuses.filter((s) => s === "active").length,
      inactive: statuses.filter((s) => s === "inactive").length,
      expired: statuses.filter((s) => s === "expired").length,
      todayAtt: ix.presentToday.size,
      todayCol: sum(db.payments.filter((p) => p.date === t), (p) => p.amount),
      pendingFees: sum([...ix.membershipDue.values()], (x) => x),
      pendingCharges: sum([...ix.chargeDue.values()], (x) => x),
      rev, revPrev, exp, expPrev, profit: rev - exp, profitPrev: revPrev - expPrev,
    };
  }, [db, ix, t]);

  const revenue = useMemo(() => bucketSeries(from, to, db.payments, (p) => p.date, (p) => p.amount), [db.payments, from, to]);
  const attendance = useMemo(() => bucketSeries(from, to, db.attendance, (a) => a.date), [db.attendance, from, to]);
  const pl = useMemo(() => monthlyPL(db, 6), [db]);
  const methods = useMemo(() => {
    const ps = db.payments.filter((p) => p.date >= from && p.date <= to);
    const colors: Record<string, string> = { upi: CHART.lime, cash: CHART.ink, card: CHART.blue, bank: CHART.amber };
    return (["upi", "cash", "card", "bank"] as const).map((m) => ({ name: methodLabel[m], value: sum(ps.filter((p) => p.method === m), (p) => p.amount), color: colors[m] })).filter((x) => x.value > 0);
  }, [db.payments, from, to]);
  const rangeTotal = sum(revenue.series, (s) => s.value);

  const recentMembers = useMemo(() => [...db.members].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [db.members]);
  const recentPayments = useMemo(() => [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [db.payments]);
  const expiring = useMemo(
    () => [...ix.latestMs.values()].filter((ms) => ms.endDate >= t && daysLeft(ms.endDate) <= db.settings.expiryReminderDays && ix.status.get(ms.memberId) === "active").sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 6),
    [ix, t, db.settings.expiryReminderDays],
  );
  const dues = useMemo(() => db.members.map((m) => ({ m, due: totalDue(m.id, ix) })).filter((x) => x.due > 0).sort((a, b) => b.due - a.due).slice(0, 6), [db.members, ix]);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title="Owner Dashboard"
        description={`${greeting} — here's how ${db.settings.name} is performing today, ${format(new Date(), "EEEE, dd MMM")}.`}
        actions={
          <>
            <DateRangeFilter {...dr} />
            <Button asChild variant="lime" className="w-full sm:w-auto"><Link to="/admin/members/new"><Plus /> Add member</Link></Button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="enter" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard featured label="Monthly revenue" value={stats.rev} format={money} icon={IndianRupee} trend={pctChange(stats.rev, stats.revPrev)} hint="vs last month" to="/admin/reports/collection" />
          <StatCard label="Monthly expenses" value={stats.exp} format={money} icon={Wallet} tone="warning" trend={pctChange(stats.exp, stats.expPrev)} hint="vs last month" to="/admin/expenses" />
          <StatCard label="Monthly profit" value={stats.profit} format={money} icon={PiggyBank} tone={stats.profit >= 0 ? "success" : "danger"} trend={pctChange(stats.profit, stats.profitPrev)} hint="month to date" to="/admin/reports/profit-loss" />
          <StatCard label="Today's collection" value={stats.todayCol} format={money} icon={CircleDollarSign} tone="lime" hint={`${db.payments.filter((p) => p.date === t).length} payments`} to="/admin/payments/history" />
          <StatCard label="Total members" value={stats.total} icon={Users} tone="dark" hint="all time" to="/admin/members" />
          <StatCard label="Active members" value={stats.active} icon={UserCheck} tone="success" hint={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% of total`} to="/admin/members/active" />
          <StatCard label="Expired members" value={stats.expired} icon={UserX} tone="danger" hint="need renewal" to="/admin/members/expired" />
          <StatCard label="Inactive members" value={stats.inactive} icon={UserMinus} tone="default" hint="deactivated" to="/admin/members/inactive" />
          <StatCard label="Today's attendance" value={stats.todayAtt} icon={CalendarCheck} tone="info" hint={`of ${stats.active} active`} to="/admin/attendance" />
          <StatCard label="Pending fees" value={stats.pendingFees} format={money} icon={AlertCircle} tone="danger" hint={`${ix.membershipDue.size} members`} to="/admin/payments/pending" />
          <StatCard label="Pending extra charges" value={stats.pendingCharges} format={money} icon={Wrench} tone="warning" hint={`${db.charges.filter((c) => c.status === "pending").length} charges`} to="/admin/charges/pending" />
          <StatCard label="Range collection" value={rangeTotal} format={money} icon={TrendingUp} tone="info" hint={`${fmtShortDate(from)} – ${fmtShortDate(to)}`} to="/admin/reports/collection" />
        </motion.div>
      )}

      <div className="mt-4 grid gap-4 sm:mt-5 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Revenue analytics" description={`${money(rangeTotal)} collected · ${revenue.granularity === "day" ? "daily" : "monthly"}`} loading={loading}>
          <RevenueChart data={revenue.series} />
        </ChartCard>
        <ChartCard title="Payment methods" description="Share of collection in range" loading={loading}>
          {methods.length ? <DonutChart data={methods} /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No payments in range</div>}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-5 xl:grid-cols-2">
        <ChartCard title="Attendance" description={`${sum(attendance.series, (s) => s.value)} check-ins in range`} loading={loading}>
          <BarsChart data={attendance.series} />
        </ChartCard>
        <ChartCard title="Income vs expense" description="Last 6 months" loading={loading} action={<Badge variant="lime">Profit {compactMoney(sum(pl, (x) => x.profit))}</Badge>}>
          <IncomeExpenseChart data={pl} />
        </ChartCard>
      </div>

      <motion.div variants={stagger} initial="initial" animate="enter" className="mt-4 grid gap-4 sm:mt-5 lg:grid-cols-2 2xl:grid-cols-3">
        <ListCard title="Recent registrations" to="/admin/members" loading={loading} empty={!recentMembers.length}>
          {recentMembers.map((m) => (
            <PersonRow key={m.id} name={m.name} photo={m.photo} to={`/admin/members/${m.id}`} sub={`${m.code} · joined ${fmtShortDate(m.joinDate)}`} right={<span className="text-xs text-muted-foreground">{ix.latestMs.get(m.id)?.planName}</span>} />
          ))}
        </ListCard>
        <ListCard title="Recent payments" to="/admin/payments/history" loading={loading} empty={!recentPayments.length}>
          {recentPayments.map((p) => {
            const m = ix.memberById.get(p.memberId);
            return <PersonRow key={p.id} name={m?.name ?? "—"} photo={m?.photo} to={m ? `/admin/members/${m.id}` : undefined} sub={`${p.receiptNo} · ${methodLabel[p.method]} · ${timeAgo(p.createdAt)}`} right={<span className="text-sm font-semibold tabular-nums">{money(p.amount)}</span>} />;
          })}
        </ListCard>
        <ListCard title="Upcoming expiries" to="/admin/membership/active" loading={loading} empty={!expiring.length}>
          {expiring.map((ms) => {
            const m = ix.memberById.get(ms.memberId)!;
            return <PersonRow key={ms.id} name={m.name} photo={m.photo} to={`/admin/membership/renew?member=${m.id}`} sub={`${ms.planName} · ends ${fmtShortDate(ms.endDate)}`} right={<DaysBadge days={daysLeft(ms.endDate)} />} />;
          })}
        </ListCard>
        <ListCard title="Pending dues" to="/admin/payments/pending" loading={loading} empty={!dues.length}>
          {dues.map(({ m, due }) => (
            <PersonRow key={m.id} name={m.name} photo={m.photo} to={`/admin/payments/collect?member=${m.id}`} sub={`${m.code} · ${m.phone}`} right={<span className="text-sm font-semibold text-danger tabular-nums">{money(due)}</span>} />
          ))}
        </ListCard>
        <ListCard title="Recent activity" to="/admin/activity" loading={loading} empty={!db.activity.length} className="lg:col-span-2 2xl:col-span-2">
          {db.activity.slice(0, 7).map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-2 py-2.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted"><Receipt className="h-4 w-4 text-muted-foreground" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px]"><span className="font-semibold">{a.action}</span> <span className="text-muted-foreground">by {a.actor}</span></div>
                <div className="truncate text-xs text-muted-foreground">{a.details}</div>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(a.at)}</span>
            </li>
          ))}
        </ListCard>
      </motion.div>
    </div>
  );
}
