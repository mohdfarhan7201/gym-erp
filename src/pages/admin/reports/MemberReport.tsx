import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, Pill, StatCard, StatusBadge } from "@/components/common";
import { BarsChart, ChartCard, CHART, DonutChart } from "@/components/charts";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { Avatar } from "@/components/ui/primitives";
import { stagger } from "@/animations/motion";
import { bucketSeries } from "@/utils/analytics";
import { fmtDate, money } from "@/utils/format";
import { totalDue } from "@/services/selectors";
import type { Member, MemberStatus } from "@/types";

type View = "all" | MemberStatus | "new" | "dues";

export default function MemberReport() {
  const { db, ix, loading } = useGym();
  const nav = useNavigate();
  const dr = useDateRange("90d");
  const { from, to } = dr.range;
  const [view, setView] = useState<View>("all");

  const d = useMemo(() => {
    const counts = { active: 0, inactive: 0, expired: 0 };
    ix.status.forEach((s) => counts[s]++);
    const joined = db.members.filter((m) => m.joinDate >= from && m.joinDate <= to);
    const growth = bucketSeries(from, to, db.members, (m) => m.joinDate);
    const planDist = db.plans.map((p, i) => ({ name: p.name, value: [...ix.latestMs.values()].filter((ms) => ms.planId === p.id && ix.status.get(ms.memberId) === "active").length, color: [CHART.lime, CHART.ink, CHART.blue, CHART.amber, CHART.green, CHART.red][i % 6] }));
    const gender = (["male", "female", "other"] as const).map((g, i) => ({ name: g[0].toUpperCase() + g.slice(1), value: db.members.filter((m) => m.gender === g).length, color: [CHART.blue, "#EC4899", CHART.slate][i] }));
    return { counts, joined, growth, planDist, gender };
  }, [db, ix, from, to]);

  const rows = useMemo<Member[]>(() => {
    if (view === "new") return d.joined;
    if (view === "dues") return db.members.filter((m) => totalDue(m.id, ix) > 0);
    if (view === "all") return db.members;
    return db.members.filter((m) => ix.status.get(m.id) === view);
  }, [view, d.joined, db.members, ix]);

  return (
    <div>
      <PageHeader title="Member Reports" description="Membership health: active, expired, new joins, plan mix and dues." actions={<DateRangeFilter {...dr} />} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Total members" value={db.members.length} icon={Users} />
        <StatCard label="Active" value={d.counts.active} icon={UserCheck} tone="success" />
        <StatCard label="Expired" value={d.counts.expired} icon={UserX} tone="danger" />
        <StatCard label="New in range" value={d.joined.length} icon={UserPlus} tone="info" hint={`${fmtDate(from)} – ${fmtDate(to)}`} />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="New registrations" description={d.growth.granularity === "day" ? "Daily" : "Monthly"} loading={loading}><BarsChart data={d.growth.series} name="Joined" /></ChartCard>
        <ChartCard title="Active by plan" loading={loading}><DonutChart data={d.planDist} isMoney={false} centerLabel="Active" /></ChartCard>
        <ChartCard title="Gender split" loading={loading}><DonutChart data={d.gender} isMoney={false} centerLabel="Members" /></ChartCard>
      </div>
      <div className="mt-4">
        <DataTable
          rows={rows}
          loading={loading}
          rowKey={(m) => m.id}
          onRowClick={(m) => nav(`/admin/members/${m.id}`)}
          initialSort={{ key: "name", dir: "asc" }}
          search={(m) => `${m.name} ${m.code} ${m.phone}`}
          toolbar={
            <div className="scrollbar-none -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1">
              {([["all", "All"], ["active", "Active"], ["expired", "Expired"], ["inactive", "Inactive"], ["new", "New joins"], ["dues", "Pending fees"]] as [View, string][]).map(([v, l]) => <Pill key={v} active={view === v} onClick={() => setView(v)}>{l}</Pill>)}
            </div>
          }
          columns={[
            { key: "name", header: "Member", primary: true, sortValue: (m) => m.name, cell: (m) => <div className="flex min-w-0 items-center gap-3"><Avatar name={m.name} src={m.photo} /><div className="min-w-0"><div className="truncate font-semibold">{m.name}</div><div className="text-xs text-muted-foreground">{m.code}</div></div></div> },
            { key: "join", header: "Joined", sortValue: (m) => m.joinDate, cell: (m) => fmtDate(m.joinDate) },
            { key: "plan", header: "Plan", cell: (m) => ix.latestMs.get(m.id)?.planName ?? "—" },
            { key: "end", header: "Expiry", sortValue: (m) => ix.latestMs.get(m.id)?.endDate ?? "", cell: (m) => fmtDate(ix.latestMs.get(m.id)?.endDate) },
            { key: "visits", header: "Visits", align: "right", sortValue: (m) => ix.attendanceCount.get(m.id) ?? 0, cell: (m) => ix.attendanceCount.get(m.id) ?? 0, hideOnMobile: true },
            { key: "due", header: "Dues", align: "right", sortValue: (m) => totalDue(m.id, ix), cell: (m) => money(totalDue(m.id, ix)) },
            { key: "status", header: "Status", cell: (m) => <StatusBadge status={ix.status.get(m.id)!} /> },
          ]}
          exportConfig={{
            filename: `member-report-${view}`,
            title: `Member report — ${view}`,
            summary: [["Members", String(rows.length)], ["Active", String(d.counts.active)], ["Expired", String(d.counts.expired)]],
            columns: [
              { header: "Member ID", value: (m) => m.code },
              { header: "Name", value: (m) => m.name },
              { header: "Mobile", value: (m) => m.phone },
              { header: "Joined", value: (m) => m.joinDate },
              { header: "Plan", value: (m) => ix.latestMs.get(m.id)?.planName ?? "" },
              { header: "Expiry", value: (m) => ix.latestMs.get(m.id)?.endDate ?? "" },
              { header: "Visits", value: (m) => ix.attendanceCount.get(m.id) ?? 0 },
              { header: "Dues", value: (m) => totalDue(m.id, ix) },
              { header: "Status", value: (m) => ix.status.get(m.id)! },
            ],
          }}
        />
      </div>
    </div>
  );
}
