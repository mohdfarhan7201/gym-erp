import { useMemo, useState } from "react";
import { Download, Eye, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useAuth } from "@/contexts/AuthContext";
import { useReceipt, ReceiptView } from "@/components/modals/ReceiptProvider";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { paymentService } from "@/services/gymService";
import { msDue, sum } from "@/services/selectors";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/common";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { printElement } from "@/services/exports/print";
import { fmtDate, fmtDateTime, fmtShortDate, methodLabel, money } from "@/utils/format";
import type { Payment } from "@/types";

const kindLabel: Record<Payment["kind"], string> = { membership: "Membership", extra_charge: "Extra charge", other: "Other" };

function PaymentsTable({ mode }: { mode: "history" | "receipts" }) {
  const { db, ix, loading } = useGym();
  const { session } = useAuth();
  const receipt = useReceipt();
  const confirm = useConfirm();
  const dr = useDateRange(mode === "receipts" ? "30d" : "30d");
  const [method, setMethod] = useState("all");
  const [kind, setKind] = useState("all");
  const isAdmin = session?.role === "admin";

  const rows = useMemo(
    () => db.payments.filter((p) => p.date >= dr.range.from && p.date <= dr.range.to && (method === "all" || p.method === method) && (kind === "all" || p.kind === kind)),
    [db.payments, dr.range, method, kind],
  );
  const total = sum(rows, (p) => p.amount);

  const extra = (p: Payment) => {
    const ms = p.membershipId ? db.memberships.find((m) => m.id === p.membershipId) : undefined;
    return { balance: ms ? msDue(ms, ix) : undefined, planLine: ms ? `${ms.planName} · ${fmtDate(ms.startDate)} – ${fmtDate(ms.endDate)}` : undefined };
  };
  const download = async (p: Payment) => {
    const { downloadReceiptPdf } = await import("@/services/exports/pdf");
    downloadReceiptPdf(p, ix.memberById.get(p.memberId)!, db.settings, extra(p));
    toast.success("Receipt downloaded", { description: `${p.receiptNo}.pdf` });
  };
  const print = (p: Payment) => printElement(<ReceiptView payment={p} member={ix.memberById.get(p.memberId)!} gym={db.settings} {...extra(p)} />);

  const columns: Column<Payment>[] = [
    { key: "receipt", header: "Receipt", primary: true, sortValue: (p) => p.receiptNo, cell: (p) => {
      const m = ix.memberById.get(p.memberId);
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={m?.name ?? "?"} src={m?.photo} />
          <div className="min-w-0"><div className="truncate font-semibold">{m?.name ?? "Deleted member"}</div><div className="truncate text-xs text-muted-foreground">{p.receiptNo} · {m?.code}</div></div>
        </div>
      );
    } },
    { key: "date", header: "Date", sortValue: (p) => p.createdAt, cell: (p) => <div><div>{fmtDate(p.date)}</div><div className="text-xs text-muted-foreground">{fmtDateTime(p.createdAt).split(", ")[1]}</div></div> },
    { key: "desc", header: "Description", cell: (p) => <div className="max-w-[240px]"><div className="truncate">{p.description}</div><Badge variant="outline" className="mt-1">{kindLabel[p.kind]}</Badge></div>, hideOnMobile: true },
    { key: "method", header: "Method", sortValue: (p) => p.method, cell: (p) => <Badge variant={p.method === "upi" ? "lime" : p.method === "cash" ? "dark" : "info"}>{methodLabel[p.method]}</Badge> },
    { key: "by", header: "Collected by", cell: (p) => p.collectedBy, hideOnMobile: true },
    { key: "amount", header: "Amount", align: "right", sortValue: (p) => p.amount, cell: (p) => <span className="font-semibold tabular">{money(p.amount)}</span> },
    { key: "status", header: "Status", cell: () => <Badge variant="success" dot>Paid</Badge>, hideOnMobile: true },
  ];

  return (
    <div>
      <PageHeader
        title={mode === "receipts" ? "Receipts" : "Payment History"}
        description={mode === "receipts" ? "Preview, download or print any receipt." : "Every payment collected at the gym."}
        actions={<DateRangeFilter {...dr} />}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Collected", money(total)],
          ["Receipts", rows.length.toString()],
          ["UPI", money(sum(rows.filter((p) => p.method === "upi"), (p) => p.amount))],
          ["Cash", money(sum(rows.filter((p) => p.method === "cash"), (p) => p.amount))],
        ].map(([k, v]) => (
          <Card key={k} className="p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-1 font-display text-2xl font-bold">{v}</div><div className="text-[11px] text-muted-foreground">{fmtShortDate(dr.range.from)} – {fmtShortDate(dr.range.to)}</div></Card>
        ))}
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        rowKey={(p) => p.id}
        initialSort={{ key: "date", dir: "desc" }}
        onRowClick={(p) => receipt.open(p.id)}
        search={(p) => { const m = ix.memberById.get(p.memberId); return `${p.receiptNo} ${m?.name} ${m?.code} ${m?.phone} ${p.description} ${p.reference ?? ""}`; }}
        searchPlaceholder="Receipt no, member, mobile…"
        toolbar={
          <>
            <div className="w-[calc(50%-4px)] sm:w-36"><Select aria-label="Method" value={method} onValueChange={setMethod} options={[{ value: "all", label: "All methods" }, ...Object.entries(methodLabel).map(([v, l]) => ({ value: v, label: l }))]} /></div>
            <div className="w-[calc(50%-4px)] sm:w-40"><Select aria-label="Type" value={kind} onValueChange={setKind} options={[{ value: "all", label: "All types" }, ...Object.entries(kindLabel).map(([v, l]) => ({ value: v, label: l }))]} /></div>
          </>
        }
        actions={(p) => (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => receipt.open(p.id)} aria-label="Preview receipt"><Eye /></Button>
            {mode === "receipts" && <Button variant="ghost" size="icon-sm" onClick={() => download(p)} aria-label="Download PDF"><Download /></Button>}
            {mode === "receipts" && <Button variant="ghost" size="icon-sm" onClick={() => print(p)} aria-label="Print"><Printer /></Button>}
            {isAdmin && mode === "history" && (
              <Button variant="ghost" size="icon-sm" aria-label="Void payment" onClick={async () => {
                if (await confirm({ title: `Void ${p.receiptNo}?`, description: `${money(p.amount)} will be removed from collections and the balance becomes due again.`, destructive: true, confirmText: "Void payment" }))
                  paymentService.remove(p.id).then(() => toast.success("Payment voided"));
              }}><Trash2 /></Button>
            )}
          </>
        )}
        exportConfig={{
          filename: `payments-${dr.range.from}-to-${dr.range.to}`,
          title: "Payment history",
          subtitle: `${fmtDate(dr.range.from)} – ${fmtDate(dr.range.to)}`,
          summary: [["Total collected", money(total)], ["Receipts", String(rows.length)]],
          columns: [
            { header: "Receipt", value: (p) => p.receiptNo },
            { header: "Date", value: (p) => p.date },
            { header: "Member", value: (p) => ix.memberById.get(p.memberId)?.name ?? "" },
            { header: "Member ID", value: (p) => ix.memberById.get(p.memberId)?.code ?? "" },
            { header: "Description", value: (p) => p.description },
            { header: "Method", value: (p) => methodLabel[p.method] },
            { header: "Collected by", value: (p) => p.collectedBy },
            { header: "Amount", value: (p) => p.amount },
          ],
        }}
        empty={{ title: "No payments in this range", description: "Try a wider date range." }}
      />
    </div>
  );
}

export default function PaymentHistory() {
  return <PaymentsTable mode="history" />;
}
export const ReceiptsPage = () => <PaymentsTable mode="receipts" />;
