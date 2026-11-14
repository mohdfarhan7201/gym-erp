import { useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { AlertCircle, CalendarCheck, CircleDollarSign, Clock, CreditCard, RefreshCw, Search, UserCheck, UserPlus, Wrench } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, StatCard, StatCardSkeleton } from "@/components/common";
import { ListCard, PersonRow, QuickAction, DaysBadge } from "@/components/dashboard/Widgets";
import { stagger } from "@/animations/motion";
import { daysLeft, today } from "@/utils/date";
import { fmtShortDate, fmtTime, methodLabel, money, timeAgo } from "@/utils/format";
import { sum } from "@/services/selectors";
import { useAuth } from "@/contexts/AuthContext";

export default function ReceptionDashboard() {
  const { db, ix, loading } = useGym();
  const { session } = useAuth();
  const t = today();
  const b = "/reception";

  const s = useMemo(() => {
    const todays = db.payments.filter((p) => p.date === t);
    return {
      att: ix.presentToday.size,
      active: [...ix.status.values()].filter((x) => x === "active").length,
      col: sum(todays, (p) => p.amount),
      colCount: todays.length,
      pending: sum([...ix.membershipDue.values()], (x) => x),
      expiring: [...ix.latestMs.values()].filter((ms) => ms.endDate >= t && daysLeft(ms.endDate) <= db.settings.expiryReminderDays && ix.status.get(ms.memberId) === "active").sort((a, b2) => a.endDate.localeCompare(b2.endDate)),
    };
  }, [db, ix, t]);

  const recentMembers = useMemo(() => [...db.members].sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 5), [db.members]);
  const recentPayments = useMemo(() => [...db.payments].sort((a, c) => c.createdAt.localeCompare(a.createdAt)).slice(0, 5), [db.payments]);
  const recentCheckins = useMemo(() => db.attendance.filter((a) => a.date === t).sort((a, c) => c.checkIn.localeCompare(a.checkIn)).slice(0, 5), [db.attendance, t]);

  return (
    <div>
      <PageHeader title="Front Desk" description={`Hi ${session?.name.split(" ")[0]} — ${format(new Date(), "EEEE, dd MMMM")}. Let's keep the floor moving.`} />

      <motion.div variants={stagger} initial="initial" animate="enter" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <QuickAction icon={CalendarCheck} label="Mark Attendance" hint="Check a member in" to={`${b}/attendance`} tone="lime" />
        <QuickAction icon={UserPlus} label="Register Member" hint="New admission" to={`${b}/members/new`} tone="dark" />
        <QuickAction icon={CreditCard} label="Collect Fees" hint="Cash or UPI" to={`${b}/payments/collect`} />
        <QuickAction icon={RefreshCw} label="Renew Membership" hint="Extend a plan" to={`${b}/membership/renew`} />
        <QuickAction icon={Wrench} label="Add Extra Charge" hint="Damage, fines, cards" to={`${b}/charges/new`} />
        <QuickAction icon={Search} label="Search Member" hint="Name, ID or mobile" to={`${b}/members/search`} />
      </motion.div>

      {loading ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}</div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="enter" className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard featured label="Today's attendance" value={s.att} icon={CalendarCheck} hint="checked in" to={`${b}/attendance/today`} />
          <StatCard label="Active members" value={s.active} icon={UserCheck} tone="success" to={`${b}/membership/active`} />
          <StatCard label="Today's collection" value={s.col} format={money} icon={CircleDollarSign} tone="lime" hint={`${s.colCount} receipts`} to={`${b}/payments/history`} />
          <StatCard label="Pending fees" value={s.pending} format={money} icon={AlertCircle} tone="danger" to={`${b}/payments/pending`} />
          <StatCard label="Upcoming expiries" value={s.expiring.length} icon={Clock} tone="warning" hint={`next ${db.settings.expiryReminderDays} days`} to={`${b}/membership/active`} />
        </motion.div>
      )}

      <motion.div variants={stagger} initial="initial" animate="enter" className="mt-5 grid gap-4 lg:grid-cols-2">
        <ListCard title="Live check-ins" to={`${b}/attendance/today`} loading={loading} empty={!recentCheckins.length}>
          {recentCheckins.map((a) => {
            const m = ix.memberById.get(a.memberId)!;
            return <PersonRow key={a.id} name={m.name} photo={m.photo} to={`${b}/members/${m.id}`} sub={m.code} right={<span className="text-sm font-semibold tabular-nums">{fmtTime(a.checkIn)}</span>} />;
          })}
        </ListCard>
        <ListCard title="Upcoming expiries" to={`${b}/membership/active`} loading={loading} empty={!s.expiring.length}>
          {s.expiring.slice(0, 5).map((ms) => {
            const m = ix.memberById.get(ms.memberId)!;
            return <PersonRow key={ms.id} name={m.name} photo={m.photo} to={`${b}/membership/renew?member=${m.id}`} sub={`${ms.planName} · ends ${fmtShortDate(ms.endDate)}`} right={<DaysBadge days={daysLeft(ms.endDate)} />} />;
          })}
        </ListCard>
        <ListCard title="Recently registered" to={`${b}/members`} loading={loading}>
          {recentMembers.map((m) => <PersonRow key={m.id} name={m.name} photo={m.photo} to={`${b}/members/${m.id}`} sub={`${m.code} · ${fmtShortDate(m.joinDate)}`} right={<span className="text-xs text-muted-foreground">{ix.latestMs.get(m.id)?.planName}</span>} />)}
        </ListCard>
        <ListCard title="Recent payments" to={`${b}/payments/history`} loading={loading}>
          {recentPayments.map((p) => {
            const m = ix.memberById.get(p.memberId);
            return <PersonRow key={p.id} name={m?.name ?? "—"} photo={m?.photo} sub={`${p.receiptNo} · ${methodLabel[p.method]} · ${timeAgo(p.createdAt)}`} right={<span className="text-sm font-semibold tabular-nums">{money(p.amount)}</span>} />;
          })}
        </ListCard>
      </motion.div>
    </div>
  );
}
