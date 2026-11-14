import { motion } from "framer-motion";
import { Download, Eye, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useMyAccount } from "@/hooks/useMyAccount";
import { useReceipt, ReceiptView } from "@/components/modals/ReceiptProvider";
import { DataTable } from "@/components/tables/DataTable";
import { EmptyState, PageHeader } from "@/components/common";
import { Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { printElement } from "@/services/exports/print";
import { fadeUp, stagger } from "@/animations/motion";
import { fmtDate, methodLabel, money } from "@/utils/format";
import type { Payment } from "@/types";

function useReceiptActions() {
  const { acc, d } = useMyAccount();
  const extra = (p: Payment) => {
    const ms = p.membershipId ? acc?.memberships.find((m) => m.id === p.membershipId) : undefined;
    return { balance: ms ? d?.msDue(ms.id) : undefined, planLine: ms ? `${ms.planName} · ${fmtDate(ms.startDate)} – ${fmtDate(ms.endDate)}` : undefined };
  };
  const download = async (p: Payment) => {
    if (!acc) return;
    const { downloadReceiptPdf } = await import("@/services/exports/pdf");
    downloadReceiptPdf(p, acc.member, acc.gym, extra(p));
    toast.success("Receipt downloaded");
  };
  const print = (p: Payment) => acc && printElement(<ReceiptView payment={p} member={acc.member} gym={acc.gym} {...extra(p)} />);
  return { download, print };
}

export default function MyPayments() {
  const { acc, loading } = useMyAccount();
  const receipt = useReceipt();
  const { download } = useReceiptActions();
  if (!acc) return null;
  const total = acc.payments.reduce((s, p) => s + p.amount, 0);
  return (
    <div>
      <PageHeader title="Payment History" description={`${acc.payments.length} payments · ${money(total)} paid in total`} />
      <DataTable
        rows={acc.payments}
        loading={loading}
        rowKey={(p) => p.id}
        initialSort={{ key: "date", dir: "desc" }}
        onRowClick={(p) => receipt.open(p.id)}
        search={(p) => `${p.receiptNo} ${p.description}`}
        searchPlaceholder="Search receipts…"
        columns={[
          { key: "desc", header: "Description", primary: true, cell: (p) => <div className="min-w-0"><div className="truncate font-semibold">{p.description}</div><div className="text-xs text-muted-foreground">{p.receiptNo}</div></div> },
          { key: "date", header: "Date", sortValue: (p) => p.createdAt, cell: (p) => fmtDate(p.date) },
          { key: "method", header: "Method", cell: (p) => methodLabel[p.method] },
          { key: "amount", header: "Amount", align: "right", sortValue: (p) => p.amount, cell: (p) => <span className="font-semibold">{money(p.amount)}</span> },
          { key: "status", header: "Status", cell: () => <Badge variant="success" dot>Paid</Badge> },
        ]}
        actions={(p) => <><Button variant="ghost" size="icon-sm" onClick={() => receipt.open(p.id)} aria-label="Preview"><Eye /></Button><Button variant="ghost" size="icon-sm" onClick={() => download(p)} aria-label="Download PDF"><Download /></Button></>}
        exportConfig={{ filename: `my-payments-${acc.member.code}`, title: `Payments — ${acc.member.name}`, columns: [
          { header: "Receipt", value: (p) => p.receiptNo }, { header: "Date", value: (p) => p.date }, { header: "Description", value: (p) => p.description }, { header: "Method", value: (p) => methodLabel[p.method] }, { header: "Amount", value: (p) => p.amount },
        ] }}
        empty={{ title: "No payments yet" }}
      />
    </div>
  );
}

export function MyReceipts() {
  const { acc } = useMyAccount();
  const receipt = useReceipt();
  const { download, print } = useReceiptActions();
  if (!acc) return null;
  return (
    <div>
      <PageHeader title="My Receipts" description="Preview, download or print your receipts." />
      {acc.payments.length === 0 ? <Card><EmptyState icon={Receipt} title="No receipts yet" /></Card> : (
        <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {acc.payments.map((p) => (
            <motion.div key={p.id} variants={fadeUp}>
              <Card className="group relative overflow-hidden p-4 transition-shadow hover:shadow-lift">
                <div className="absolute inset-x-0 top-0 h-1 bg-lime" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="font-mono text-xs text-muted-foreground">{p.receiptNo}</div><div className="mt-0.5 truncate font-semibold">{p.description}</div><div className="text-xs text-muted-foreground">{fmtDate(p.date)} · {methodLabel[p.method]}</div></div>
                  <div className="font-display text-2xl font-bold">{money(p.amount)}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => receipt.open(p.id)}><Eye /> View</Button>
                  <Button size="sm" variant="outline" onClick={() => download(p)}><Download /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => print(p)}><Printer /> Print</Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
