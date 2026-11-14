import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useGym } from "@/hooks/useGym";
import { usePanel } from "@/contexts/AuthContext";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader, Pill } from "@/components/common";
import { Avatar, Badge } from "@/components/ui/primitives";
import { today } from "@/utils/date";
import { fmtDate, fmtDateTime, fmtTime } from "@/utils/format";

type Row = { id: string; memberId: string; time?: string; by?: string };

export default function TodayAttendance() {
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const nav = useNavigate();
  const [tab, setTab] = useState<"present" | "absent">("present");
  const t = today();

  const present = useMemo<Row[]>(() => db.attendance.filter((a) => a.date === t).map((a) => ({ id: a.id, memberId: a.memberId, time: a.checkIn, by: a.markedBy })), [db.attendance, t]);
  const absent = useMemo<Row[]>(() => db.members.filter((m) => ix.status.get(m.id) === "active" && !ix.presentToday.has(m.id)).map((m) => ({ id: m.id, memberId: m.id })), [db.members, ix]);
  const rows = tab === "present" ? present : absent;

  return (
    <div>
      <PageHeader title="Today's Attendance" description={format(new Date(), "EEEE, dd MMMM yyyy")} />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => nav(to(`members/${r.memberId}`))}
        initialSort={tab === "present" ? { key: "time", dir: "desc" } : { key: "member", dir: "asc" }}
        search={(r) => { const m = ix.memberById.get(r.memberId)!; return `${m.name} ${m.code} ${m.phone}`; }}
        toolbar={<div className="flex gap-1.5"><Pill active={tab === "present"} onClick={() => setTab("present")}>Present · {present.length}</Pill><Pill active={tab === "absent"} onClick={() => setTab("absent")}>Absent (active) · {absent.length}</Pill></div>}
        columns={[
          { key: "member", header: "Member", primary: true, sortValue: (r) => ix.memberById.get(r.memberId)!.name, cell: (r) => { const m = ix.memberById.get(r.memberId)!; return <div className="flex min-w-0 items-center gap-3"><Avatar name={m.name} src={m.photo} /><div className="min-w-0"><div className="truncate font-semibold">{m.name}</div><div className="truncate text-xs text-muted-foreground">{m.code} · {m.phone}</div></div></div>; } },
          { key: "plan", header: "Plan", cell: (r) => ix.latestMs.get(r.memberId)?.planName ?? "—" },
          { key: "time", header: tab === "present" ? "Check-in" : "Last visit", sortValue: (r) => r.time ?? ix.lastVisit.get(r.memberId) ?? "", cell: (r) => r.time ? <span className="font-semibold tabular">{fmtTime(r.time)}</span> : ix.lastVisit.get(r.memberId) ? fmtDateTime(ix.lastVisit.get(r.memberId)) : "Never" },
          { key: "by", header: tab === "present" ? "Marked by" : "Expires", cell: (r) => r.by ?? fmtDate(ix.latestMs.get(r.memberId)?.endDate) },
          { key: "status", header: "Status", cell: () => tab === "present" ? <Badge variant="success" dot>Present</Badge> : <Badge dot>Absent</Badge> },
        ]}
        exportConfig={{
          filename: `attendance-${t}-${tab}`,
          title: `Attendance ${fmtDate(t)} — ${tab}`,
          columns: [
            { header: "Member ID", value: (r) => ix.memberById.get(r.memberId)!.code },
            { header: "Name", value: (r) => ix.memberById.get(r.memberId)!.name },
            { header: "Mobile", value: (r) => ix.memberById.get(r.memberId)!.phone },
            { header: "Check-in", value: (r) => (r.time ? fmtTime(r.time) : "") },
            { header: "Marked by", value: (r) => r.by ?? "" },
          ],
        }}
        empty={{ title: tab === "present" ? "No check-ins yet today" : "Everyone active has checked in!" }}
      />
    </div>
  );
}
