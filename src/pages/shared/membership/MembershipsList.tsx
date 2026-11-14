import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { PageHeader, PayBadge, Pill } from "@/components/common";
import { Avatar, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { daysLeft } from "@/utils/date";
import { fmtDate, money } from "@/utils/format";
import { msDue, msNet } from "@/services/selectors";
import type { Membership } from "@/types";

function MembershipsPage({ kind }: { kind: "active" | "expired" }) {
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const [plan, setPlan] = useState("all");
  const [range, setRange] = useState<"all" | "7" | "30">("all");

  // one row per member: their current (latest) membership
  const rows = useMemo(() => {
    const list = [...ix.latestMs.values()].filter((ms) => {
      const st = ix.status.get(ms.memberId);
      if (kind === "active" ? st !== "active" : st !== "expired") return false;
      if (plan !== "all" && ms.planId !== plan) return false;
      const d = daysLeft(ms.endDate);
      if (range !== "all") return kind === "active" ? d <= Number(range) : -d <= Number(range);
      return true;
    });
    return list;
  }, [ix, kind, plan, range]);

  const columns: Column<Membership>[] = [
    {
      key: "member", header: "Member", primary: true, sortValue: (x) => ix.memberById.get(x.memberId)?.name ?? "",
      cell: (x) => {
        const m = ix.memberById.get(x.memberId)!;
        return <div className="flex min-w-0 items-center gap-3"><Avatar name={m.name} src={m.photo} /><div className="min-w-0"><div className="truncate font-semibold">{m.name}</div><div className="truncate text-xs text-muted-foreground">{m.code} · {m.phone}</div></div></div>;
      },
    },
    { key: "plan", header: "Plan", sortValue: (x) => x.planName, cell: (x) => x.planName },
    { key: "start", header: "Start", sortValue: (x) => x.startDate, cell: (x) => fmtDate(x.startDate), hideOnMobile: true },
    { key: "end", header: kind === "active" ? "Expires" : "Expired on", sortValue: (x) => x.endDate, cell: (x) => fmtDate(x.endDate) },
    {
      key: "left", header: kind === "active" ? "Days left" : "Overdue", sortValue: (x) => daysLeft(x.endDate),
      cell: (x) => {
        const d = daysLeft(x.endDate);
        return kind === "active" ? <Badge variant={d <= 3 ? "danger" : d <= 7 ? "warning" : "success"}>{d} days</Badge> : <Badge variant="danger">{-d} days ago</Badge>;
      },
    },
    { key: "amount", header: "Amount", align: "right", sortValue: (x) => msNet(x), cell: (x) => money(msNet(x)), hideOnMobile: true },
    { key: "pay", header: "Payment", cell: (x) => <PayBadge status={msDue(x, ix) === 0 ? "paid" : (ix.paidByMs.get(x.id) ?? 0) > 0 ? "partial" : "pending"} /> },
  ];

  return (
    <div>
      <PageHeader
        title={kind === "active" ? "Active Memberships" : "Expired Memberships"}
        description={kind === "active" ? "Running memberships, sorted by what expires first." : "Members whose plan ended — renew them to bring them back."}
      />
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        rowKey={(x) => x.id}
        initialSort={{ key: "end", dir: kind === "active" ? "asc" : "desc" }}
        onRowClick={(x) => nav(to(`membership/${x.id}`))}
        search={(x) => { const m = ix.memberById.get(x.memberId)!; return `${m.name} ${m.code} ${m.phone} ${x.planName}`; }}
        actions={(x) => can("renewMemberships") && <Button size="sm" variant={kind === "expired" ? "lime" : "outline"} onClick={() => nav(to(`membership/renew?member=${x.memberId}`))}><RefreshCw /> Renew</Button>}
        toolbar={
          <>
            <div className="flex gap-1.5">
              {(["all", "7", "30"] as const).map((w) => (
                <Pill key={w} active={range === w} onClick={() => setRange(w)}>{w === "all" ? "All" : kind === "active" ? `Next ${w} days` : `Last ${w} days`}</Pill>
              ))}
            </div>
            <div className="w-full sm:w-44"><Select aria-label="Plan" value={plan} onValueChange={setPlan} options={[{ value: "all", label: "All plans" }, ...db.plans.map((p) => ({ value: p.id, label: p.name }))]} /></div>
          </>
        }
        exportConfig={{
          filename: `${kind}-memberships`,
          title: `${kind === "active" ? "Active" : "Expired"} memberships`,
          columns: [
            { header: "Member ID", value: (x) => ix.memberById.get(x.memberId)!.code },
            { header: "Name", value: (x) => ix.memberById.get(x.memberId)!.name },
            { header: "Mobile", value: (x) => ix.memberById.get(x.memberId)!.phone },
            { header: "Plan", value: (x) => x.planName },
            { header: "Start", value: (x) => x.startDate },
            { header: "End", value: (x) => x.endDate },
            { header: "Amount", value: (x) => msNet(x) },
            { header: "Balance", value: (x) => msDue(x, ix) },
          ],
        }}
        empty={{ title: kind === "active" ? "No active memberships" : "No expired memberships" }}
      />
      <p className="sr-only">{db.memberships.length} memberships total</p>
    </div>
  );
}

export default function ActiveMemberships() {
  return <MembershipsPage kind="active" />;
}
export const ExpiredMemberships = () => <MembershipsPage kind="expired" />;
