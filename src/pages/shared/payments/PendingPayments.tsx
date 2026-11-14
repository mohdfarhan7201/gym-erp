import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CreditCard, MessageCircle, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { msDue, sum } from "@/services/selectors";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader, StatCard, StatusBadge } from "@/components/common";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { stagger } from "@/animations/motion";
import { daysLeft } from "@/utils/date";
import { fmtDate, money } from "@/utils/format";

export default function PendingPayments() {
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();

  const rows = useMemo(
    () =>
      db.members
        .map((m) => {
          const ms = (ix.msByMember.get(m.id) ?? []).filter((x) => msDue(x, ix) > 0);
          const fee = sum(ms, (x) => msDue(x, ix));
          const charges = ix.chargeDue.get(m.id) ?? 0;
          const oldest = ms.length ? ms[ms.length - 1].startDate : undefined;
          return { m, fee, charges, total: fee + charges, oldest, plans: ms.map((x) => x.planName).join(", ") };
        })
        .filter((r) => r.total > 0),
    [db.members, ix],
  );

  return (
    <div>
      <PageHeader title="Pending Payments" description="Members with outstanding membership balances or unpaid extra charges." />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Total outstanding" value={sum(rows, (r) => r.total)} format={money} icon={AlertCircle} />
        <StatCard label="Membership fees" value={sum(rows, (r) => r.fee)} format={money} icon={CreditCard} tone="danger" />
        <StatCard label="Extra charges" value={sum(rows, (r) => r.charges)} format={money} icon={Wrench} tone="warning" />
        <StatCard label="Members with dues" value={rows.length} icon={Users} tone="info" />
      </motion.div>
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(r) => r.m.id}
        initialSort={{ key: "total", dir: "desc" }}
        onRowClick={(r) => nav(to(`members/${r.m.id}`))}
        search={(r) => `${r.m.name} ${r.m.code} ${r.m.phone}`}
        columns={[
          { key: "member", header: "Member", primary: true, sortValue: (r) => r.m.name, cell: (r) => <div className="flex min-w-0 items-center gap-3"><Avatar name={r.m.name} src={r.m.photo} /><div className="min-w-0"><div className="truncate font-semibold">{r.m.name}</div><div className="truncate text-xs text-muted-foreground">{r.m.code} · {r.m.phone}</div></div></div> },
          { key: "status", header: "Status", cell: (r) => <StatusBadge status={ix.status.get(r.m.id)!} /> },
          { key: "plans", header: "For", cell: (r) => <span className="text-muted-foreground">{[r.plans, r.charges ? "extra charges" : ""].filter(Boolean).join(" + ")}</span>, hideOnMobile: true },
          { key: "since", header: "Due since", sortValue: (r) => r.oldest ?? "", cell: (r) => (r.oldest ? <div><div>{fmtDate(r.oldest)}</div><div className="text-xs text-muted-foreground">{-daysLeft(r.oldest)} days</div></div> : "—"), hideOnMobile: true },
          { key: "fee", header: "Fees", align: "right", sortValue: (r) => r.fee, cell: (r) => money(r.fee) },
          { key: "chg", header: "Charges", align: "right", sortValue: (r) => r.charges, cell: (r) => money(r.charges) },
          { key: "total", header: "Total due", align: "right", sortValue: (r) => r.total, cell: (r) => <span className="font-bold text-danger tabular">{money(r.total)}</span> },
        ]}
        actions={(r) => (
          <>
            <Button variant="ghost" size="icon-sm" aria-label="Send reminder" title="Send reminder (simulated)" onClick={() => toast.success(`Reminder queued for ${r.m.name}`, { description: `WhatsApp/SMS to ${r.m.phone} (demo — no message sent)` })}><MessageCircle /></Button>
            {can("collectPayments") && <Button size="sm" variant="lime" onClick={() => nav(to(`payments/collect?member=${r.m.id}`))}>Collect</Button>}
          </>
        )}
        exportConfig={{
          filename: "pending-dues",
          title: "Pending dues",
          summary: [["Outstanding", money(sum(rows, (r) => r.total))], ["Members", String(rows.length)]],
          columns: [
            { header: "Member ID", value: (r) => r.m.code },
            { header: "Name", value: (r) => r.m.name },
            { header: "Mobile", value: (r) => r.m.phone },
            { header: "Membership due", value: (r) => r.fee },
            { header: "Charges due", value: (r) => r.charges },
            { header: "Total", value: (r) => r.total },
          ],
        }}
        empty={{ title: "No pending dues", description: "Every member is fully paid up." }}
      />
    </div>
  );
}
