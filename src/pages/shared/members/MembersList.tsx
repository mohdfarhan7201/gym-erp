import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { MemberActions } from "@/components/tables/MemberActions";
import { PageHeader, Pill, StatusBadge } from "@/components/common";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { daysLeft } from "@/utils/date";
import { fmtDate, money } from "@/utils/format";
import { totalDue } from "@/services/selectors";
import type { Member, MemberStatus } from "@/types";
import { cn } from "@/utils/cn";

type Filter = "all" | MemberStatus;
const titles: Record<Filter, [string, string]> = {
  all: ["All Members", "Everyone registered at the gym"],
  active: ["Active Members", "Members with a running membership"],
  inactive: ["Inactive Members", "Accounts deactivated by staff"],
  expired: ["Expired Members", "Members whose last plan has ended — follow up for renewal"],
};

function MembersPage({ preset }: { preset: Filter }) {
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState<Filter>(preset);
  const [plan, setPlan] = useState("all");

  const counts = useMemo(() => {
    const c = { all: db.members.length, active: 0, inactive: 0, expired: 0 };
    ix.status.forEach((s) => c[s]++);
    return c;
  }, [db.members.length, ix.status]);

  const rows = useMemo(
    () =>
      db.members
        .filter((m) => status === "all" || ix.status.get(m.id) === status)
        .filter((m) => plan === "all" || ix.latestMs.get(m.id)?.planId === plan),
    [db.members, ix, status, plan],
  );

  const columns: Column<Member>[] = [
    {
      key: "name", header: "Member", primary: true, sortValue: (m) => m.name,
      cell: (m) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={m.name} src={m.photo} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{m.name}</div>
            <div className="truncate text-xs text-muted-foreground">{m.code}<span className="md:hidden"> · {m.phone}</span></div>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Mobile", cell: (m) => <span className="tabular">{m.phone}</span>, hideOnMobile: true },
    { key: "plan", header: "Plan", sortValue: (m) => ix.latestMs.get(m.id)?.planName ?? "", cell: (m) => ix.latestMs.get(m.id)?.planName ?? "—" },
    {
      key: "expiry", header: "Expiry", sortValue: (m) => ix.latestMs.get(m.id)?.endDate ?? "",
      cell: (m) => {
        const ms = ix.latestMs.get(m.id);
        if (!ms) return "—";
        const d = daysLeft(ms.endDate);
        return (
          <div>
            <div>{fmtDate(ms.endDate)}</div>
            <div className={cn("text-xs", d < 0 ? "text-danger" : d <= 7 ? "text-warning" : "text-muted-foreground")}>{d < 0 ? `${-d}d ago` : d === 0 ? "today" : `${d}d left`}</div>
          </div>
        );
      },
    },
    { key: "status", header: "Status", sortValue: (m) => ix.status.get(m.id)!, cell: (m) => <StatusBadge status={ix.status.get(m.id)!} /> },
    {
      key: "due", header: "Dues", align: "right", sortValue: (m) => totalDue(m.id, ix),
      cell: (m) => {
        const d = totalDue(m.id, ix);
        return d > 0 ? <span className="font-semibold text-danger tabular">{money(d)}</span> : <span className="text-muted-foreground">—</span>;
      },
    },
  ];

  const [title, desc] = titles[preset];
  return (
    <div>
      <PageHeader
        title={title}
        description={desc}
        actions={can("registerMembers") && <Button asChild variant="lime"><Link to={to("members/new")}><Plus /> Register member</Link></Button>}
      />
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        rowKey={(m) => m.id}
        onRowClick={(m) => nav(to(`members/${m.id}`))}
        search={(m) => `${m.name} ${m.code} ${m.phone} ${m.email ?? ""}`}
        searchPlaceholder="Search name, ID or mobile…"
        initialSort={{ key: "name", dir: "asc" }}
        actions={(m) => <MemberActions member={m} present={ix.presentToday.has(m.id)} />}
        toolbar={
          <>
            <div className="scrollbar-none -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1">
              {(["all", "active", "expired", "inactive"] as Filter[]).map((f) => (
                <Pill key={f} active={status === f} onClick={() => setStatus(f)}>
                  <span className="capitalize">{f}</span>
                  <span className="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/10">{counts[f]}</span>
                </Pill>
              ))}
            </div>
            <div className="w-full sm:w-44">
              <Select aria-label="Filter by plan" value={plan} onValueChange={setPlan} options={[{ value: "all", label: "All plans" }, ...db.plans.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
          </>
        }
        exportConfig={{
          filename: `members-${status}`,
          title: `${status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)} members`,
          columns: [
            { header: "Member ID", value: (m) => m.code },
            { header: "Name", value: (m) => m.name },
            { header: "Mobile", value: (m) => m.phone },
            { header: "Email", value: (m) => m.email ?? "" },
            { header: "Plan", value: (m) => ix.latestMs.get(m.id)?.planName ?? "" },
            { header: "Expiry", value: (m) => ix.latestMs.get(m.id)?.endDate ?? "" },
            { header: "Status", value: (m) => ix.status.get(m.id)! },
            { header: "Dues", value: (m) => totalDue(m.id, ix) },
          ],
        }}
        empty={{ title: "No members found", description: "Try another filter or register a new member." }}
      />
    </div>
  );
}

export default function AllMembers() {
  return <MembersPage preset="all" />;
}
export const ActiveMembers = () => <MembersPage preset="active" />;
export const InactiveMembers = () => <MembersPage preset="inactive" />;
export const ExpiredMembers = () => <MembersPage preset="expired" />;
