import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck, CalendarDays, TrendingUp, Users } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { usePanel } from "@/contexts/AuthContext";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader, StatCard } from "@/components/common";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { MemberPicker } from "@/components/forms/MemberPicker";
import { Avatar } from "@/components/ui/primitives";
import { stagger } from "@/animations/motion";
import { daysBetween } from "@/utils/date";
import { fmtDate, fmtTime } from "@/utils/format";
import type { Attendance } from "@/types";

export default function AttendanceHistory() {
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const nav = useNavigate();
  const dr = useDateRange("7d");
  const [memberId, setMemberId] = useState<string | undefined>();

  const rows = useMemo(
    () => db.attendance.filter((a) => a.date >= dr.range.from && a.date <= dr.range.to && (!memberId || a.memberId === memberId)),
    [db.attendance, dr.range, memberId],
  );
  const days = daysBetween(dr.range.from, dr.range.to) + 1;
  const unique = new Set(rows.map((r) => r.memberId)).size;

  return (
    <div>
      <PageHeader title="Attendance History" description="Search check-ins by date range or member." actions={<DateRangeFilter {...dr} />} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Check-ins" value={rows.length} icon={CalendarCheck} />
        <StatCard label="Unique members" value={unique} icon={Users} tone="success" />
        <StatCard label="Avg per day" value={Math.round(rows.length / days)} icon={TrendingUp} tone="info" />
        <StatCard label="Days in range" value={days} icon={CalendarDays} />
      </motion.div>
      <div className="mb-4 max-w-xl"><MemberPicker value={memberId} onChange={setMemberId} placeholder="Filter by member (optional)…" /></div>
      <DataTable<Attendance>
        rows={rows}
        loading={loading}
        rowKey={(a) => a.id}
        initialSort={{ key: "time", dir: "desc" }}
        onRowClick={(a) => nav(to(`members/${a.memberId}`))}
        search={(a) => { const m = ix.memberById.get(a.memberId); return `${m?.name} ${m?.code} ${m?.phone}`; }}
        columns={[
          { key: "member", header: "Member", primary: true, sortValue: (a) => ix.memberById.get(a.memberId)?.name ?? "", cell: (a) => { const m = ix.memberById.get(a.memberId); return <div className="flex min-w-0 items-center gap-3"><Avatar name={m?.name ?? "?"} src={m?.photo} /><div className="min-w-0"><div className="truncate font-semibold">{m?.name}</div><div className="truncate text-xs text-muted-foreground">{m?.code}</div></div></div>; } },
          { key: "date", header: "Date", sortValue: (a) => a.date, cell: (a) => fmtDate(a.date) },
          { key: "time", header: "Check-in", sortValue: (a) => a.checkIn, cell: (a) => <span className="tabular">{fmtTime(a.checkIn)}</span> },
          { key: "by", header: "Marked by", cell: (a) => a.markedBy },
        ]}
        exportConfig={{
          filename: `attendance-${dr.range.from}-to-${dr.range.to}`,
          title: "Attendance history",
          subtitle: `${fmtDate(dr.range.from)} – ${fmtDate(dr.range.to)}`,
          summary: [["Check-ins", String(rows.length)], ["Unique members", String(unique)]],
          columns: [
            { header: "Date", value: (a) => a.date },
            { header: "Time", value: (a) => fmtTime(a.checkIn) },
            { header: "Member ID", value: (a) => ix.memberById.get(a.memberId)?.code ?? "" },
            { header: "Name", value: (a) => ix.memberById.get(a.memberId)?.name ?? "" },
            { header: "Marked by", value: (a) => a.markedBy },
          ],
        }}
        empty={{ title: "No attendance in this range" }}
      />
    </div>
  );
}
