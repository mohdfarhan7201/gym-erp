import { Link, useParams } from "react-router-dom";
import { CreditCard, Receipt, RefreshCw } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { usePanel } from "@/contexts/AuthContext";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { msDue, msNet, msStatus } from "@/services/selectors";
import { EmptyState, InfoRow, PageHeader, StatusBadge } from "@/components/common";
import { Avatar, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { daysBetween, daysLeft } from "@/utils/date";
import { fmtDate, fmtDateTime, methodLabel, money } from "@/utils/format";

export default function MembershipDetails() {
  const { id } = useParams();
  const { db, ix } = useGym(0);
  const { to } = usePanel();
  const receipt = useReceipt();
  const ms = db.memberships.find((x) => x.id === id);
  if (!ms) return <EmptyState title="Membership not found" action={<Button asChild variant="outline"><Link to={to("membership/active")}>Back</Link></Button>} />;
  const m = ix.memberById.get(ms.memberId)!;
  const payments = db.payments.filter((p) => p.membershipId === ms.id);
  const total = daysBetween(ms.startDate, ms.endDate) + 1;
  const left = Math.max(0, daysLeft(ms.endDate));
  const visits = db.attendance.filter((a) => a.memberId === m.id && a.date >= ms.startDate && a.date <= ms.endDate).length;
  const due = msDue(ms, ix);
  const status = msStatus(ms);

  return (
    <div>
      <PageHeader title="Membership Details" crumbs={[{ label: "Memberships", to: to("membership/active") }, { label: `${m.name} · ${ms.planName}` }]}
        actions={<>
          {due > 0 && <Button asChild variant="outline"><Link to={to(`payments/collect?member=${m.id}`)}><CreditCard /> Collect {money(due)}</Link></Button>}
          <Button asChild variant="lime"><Link to={to(`membership/renew?member=${m.id}`)}><RefreshCw /> Renew</Link></Button>
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><div><CardTitle>{ms.planName} plan</CardTitle></div><StatusBadge status={status} /></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-4 text-center">
              <div><div className="font-display text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">Total days</div></div>
              <div><div className="font-display text-2xl font-bold">{status === "active" ? left : status === "upcoming" ? total : 0}</div><div className="text-xs text-muted-foreground">Days left</div></div>
              <div><div className="font-display text-2xl font-bold">{visits}</div><div className="text-xs text-muted-foreground">Visits</div></div>
            </div>
            <Progress className="mt-4" value={status === "expired" ? 100 : status === "upcoming" ? 0 : ((total - left) / total) * 100} />
            <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
              <InfoRow label="Start date" value={fmtDate(ms.startDate)} />
              <InfoRow label="End date" value={fmtDate(ms.endDate)} />
              <InfoRow label="Duration" value={`${ms.durationMonths} month(s)`} />
              <InfoRow label="Created by" value={ms.createdBy} />
              <InfoRow label="Plan price" value={money(ms.price)} />
              <InfoRow label="Discount" value={money(ms.discount)} />
              <InfoRow label="Net amount" value={money(msNet(ms))} />
              <InfoRow label="Balance" value={<span className={due ? "text-danger" : "text-success"}>{money(due)}</span>} />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <Link to={to(`members/${m.id}`)} className="flex items-center gap-3">
              <Avatar name={m.name} src={m.photo} className="h-12 w-12" />
              <div className="min-w-0"><div className="truncate font-semibold">{m.name}</div><div className="text-xs text-muted-foreground">{m.code} · {m.phone}</div></div>
            </Link>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded.</p> : (
                <ul className="divide-y">
                  {payments.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => receipt.open(p.id)} className="flex w-full cursor-pointer items-center gap-3 py-2.5 text-left hover:opacity-80">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{p.receiptNo}</div><div className="text-xs text-muted-foreground">{methodLabel[p.method]} · {fmtDateTime(p.createdAt)}</div></div>
                        <span className="font-semibold">{money(p.amount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
