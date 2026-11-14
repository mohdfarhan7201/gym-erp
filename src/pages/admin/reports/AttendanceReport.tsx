import { useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { CalendarCheck, Clock, Flame, Users } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader, StatCard } from "@/components/common";
import { BarsChart, ChartCard, RevenueChart } from "@/components/charts";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { Avatar, Progress } from "@/components/ui/primitives";
import { stagger } from "@/animations/motion";
import { bucketSeries } from "@/utils/analytics";
import { daysBetween } from "@/utils/date";
import { fmtDate } from "@/utils/format";

export default function AttendanceReport() {
  const { db, ix, loading } = useGym();
  const dr = useDateRange("30d");
  const { from, to } = dr.range;

  const r = useMemo(() => {
    const rows = db.attendance.filter((a) => a.date >= from && a.date <= to);
    const series = bucketSeries(from, to, rows, (a) => a.date);
    const hours = Array.from({ length: 18 }, (_, i) => i + 5).map((h) => ({ label: format(new Date(2000, 0, 1, h), "ha"), value: rows.filter((a) => new Date(a.checkIn).getHours() === h).length }));
    const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => ({ label: d, value: rows.filter((a) => (parseISO(a.date).getDay() + 6) % 7 === i).length }));
    const days = daysBetween(from, to) + 1;
    const perMember = new Map<string, number>();
    rows.forEach((a) => perMember.set(a.memberId, (perMember.get(a.memberId) ?? 0) + 1));
    const table = db.members
      .filter((m) => ix.status.get(m.id) === "active" || perMember.has(m.id))
      .map((m) => {
        // days covered by a membership inside the range
        const covered = (ix.msByMember.get(m.id) ?? []).reduce((s, ms) => {
          const a = ms.startDate > from ? ms.startDate : from;
          const b = ms.endDate < to ? ms.endDate : to;
          return s + (b >= a ? daysBetween(a, b) + 1 : 0);
        }, 0);
        const visits = perMember.get(m.id) ?? 0;
        return { m, visits, covered, pct: covered ? Math.min(100, Math.round((visits / covered) * 100)) : 0 };
      });
    const peak = [...hours].sort((a, b) => b.value - a.value)[0];
    return { rows, series, hours, wd, days, table, peak, unique: perMember.size };
  }, [db, ix, from, to]);

  return (
    <div>
      <PageHeader title="Attendance Reports" description="Footfall trends, peak hours and member consistency." actions={<DateRangeFilter {...dr} />} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Total check-ins" value={r.rows.length} icon={CalendarCheck} />
        <StatCard label="Unique members" value={r.unique} icon={Users} tone="success" />
        <StatCard label="Daily average" value={Math.round(r.rows.length / r.days)} icon={Flame} tone="warning" />
        <StatCard label="Peak hour" value={r.peak?.value ?? 0} format={() => r.peak?.value ? r.peak.label : "—"} icon={Clock} tone="info" />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Check-ins over time" description={r.series.granularity === "day" ? "Daily" : "Monthly"} loading={loading}><RevenueChart data={r.series.series} name="Check-ins" /></ChartCard>
        <ChartCard title="Busiest hours" description="Check-ins by hour of day" loading={loading}><BarsChart data={r.hours} /></ChartCard>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_2fr]">
        <ChartCard title="By weekday" loading={loading}><BarsChart data={r.wd} /></ChartCard>
        <DataTable
          className="min-w-0"
          rows={r.table}
          loading={loading}
          rowKey={(x) => x.m.id}
          initialSort={{ key: "pct", dir: "desc" }}
          pageSize={8}
          search={(x) => `${x.m.name} ${x.m.code}`}
          columns={[
            { key: "m", header: "Member", primary: true, sortValue: (x) => x.m.name, cell: (x) => <div className="flex min-w-0 items-center gap-3"><Avatar name={x.m.name} src={x.m.photo} /><div className="min-w-0"><div className="truncate font-semibold">{x.m.name}</div><div className="text-xs text-muted-foreground">{x.m.code}</div></div></div> },
            { key: "v", header: "Visits", align: "right", sortValue: (x) => x.visits, cell: (x) => x.visits },
            { key: "pct", header: "Attendance %", sortValue: (x) => x.pct, cell: (x) => <div className="flex min-w-[140px] items-center gap-2"><Progress value={x.pct} className="h-1.5" barClassName={x.pct < 30 ? "bg-danger" : x.pct < 60 ? "bg-warning" : undefined} /><span className="w-9 text-right text-xs font-semibold tabular">{x.pct}%</span></div> },
          ]}
          exportConfig={{
            filename: `attendance-report-${from}-to-${to}`,
            title: "Attendance report",
            subtitle: `${fmtDate(from)} – ${fmtDate(to)}`,
            summary: [["Check-ins", String(r.rows.length)], ["Unique members", String(r.unique)], ["Daily average", String(Math.round(r.rows.length / r.days))]],
            columns: [
              { header: "Member ID", value: (x) => x.m.code },
              { header: "Name", value: (x) => x.m.name },
              { header: "Visits", value: (x) => x.visits },
              { header: "Membership days", value: (x) => x.covered },
              { header: "Attendance %", value: (x) => `${x.pct}%` },
            ],
          }}
        />
      </div>
    </div>
  );
}
