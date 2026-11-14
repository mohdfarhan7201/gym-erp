import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CalendarDays, Flame, Percent } from "lucide-react";
import { useMyAccount } from "@/hooks/useMyAccount";
import { AttendanceCalendar } from "@/components/common/AttendanceCalendar";
import { PageHeader, StatCard } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { stagger } from "@/animations/motion";
import { daysAgo, daysBetween, today } from "@/utils/date";
import { fmtDate, fmtTime } from "@/utils/format";

export default function MyAttendance() {
  const { acc } = useMyAccount();
  const s = useMemo(() => {
    if (!acc) return null;
    const dates = new Set(acc.attendance.map((a) => a.date));
    const t = today();
    const covered = (d: string) => acc.memberships.some((m) => m.startDate <= d && m.endDate >= d);
    // attendance % = present days / membership days since attendance tracking began
    const firstVisit = [...dates].sort()[0] ?? t;
    let memberDays = 0;
    acc.memberships.forEach((m) => {
      const start = m.startDate > firstVisit ? m.startDate : firstVisit;
      const end = m.endDate < t ? m.endDate : t;
      if (end >= start) memberDays += daysBetween(start, end) + 1;
    });
    const month = t.slice(0, 7);
    let longest = 0, run = 0;
    [...dates].sort().forEach((d, i, arr) => {
      run = i && daysBetween(arr[i - 1], d) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
    });
    let cur = 0;
    for (let i = dates.has(t) ? 0 : 1; i < 400 && dates.has(daysAgo(i)); i++) cur++;
    return { dates, covered, pct: memberDays ? Math.round((dates.size / memberDays) * 100) : 0, month: acc.attendance.filter((a) => a.date.startsWith(month)).length, longest, cur, times: new Map(acc.attendance.map((a) => [a.date, fmtTime(a.checkIn)])) };
  }, [acc]);
  if (!acc || !s) return null;

  return (
    <div>
      <PageHeader title="My Attendance" description="Your monthly calendar, consistency and check-in history." />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Present days" value={s.dates.size} icon={CalendarCheck} hint="all time" />
        <StatCard label="Attendance" value={s.pct} format={(n) => `${Math.round(n)}%`} icon={Percent} tone="info" hint="of membership days since first visit" />
        <StatCard label="This month" value={s.month} icon={CalendarDays} tone="success" />
        <StatCard label="Current streak" value={s.cur} format={(n) => `${Math.round(n)}d`} icon={Flame} tone="warning" hint={`best ${s.longest}d`} />
      </motion.div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-4 sm:p-5"><AttendanceCalendar present={s.dates} covered={s.covered} times={s.times} /></Card>
        <Card>
          <CardHeader><CardTitle>Recent check-ins</CardTitle></CardHeader>
          <CardContent>
            <ul className="scrollbar-thin max-h-[420px] divide-y overflow-y-auto">
              {acc.attendance.slice(0, 40).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-lime-ink" />{fmtDate(a.date)}</span>
                  <span className="tabular text-muted-foreground">{fmtTime(a.checkIn)}</span>
                </li>
              ))}
              {acc.attendance.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">No check-ins yet.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
