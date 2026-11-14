import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Receipt } from "lucide-react";
import { useMyAccount } from "@/hooks/useMyAccount";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader, PayBadge, StatCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { stagger } from "@/animations/motion";
import { fmtDate, fmtDateTime, money } from "@/utils/format";

export default function MyCharges() {
  const { acc, loading } = useMyAccount();
  const receipt = useReceipt();
  if (!acc) return null;
  const pending = acc.charges.filter((c) => c.status === "pending");
  const paid = acc.charges.filter((c) => c.status === "paid");
  return (
    <div>
      <PageHeader title="Extra Charges" description="Damage, replacement and fine charges on your account. Pending charges can be paid at the front desk." />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Unpaid" value={pending.reduce((s, c) => s + c.amount, 0)} format={money} icon={AlertCircle} tone={pending.length ? "danger" : "default"} hint={`${pending.length} charge(s)`} />
        <StatCard label="Paid" value={paid.reduce((s, c) => s + c.amount, 0)} format={money} icon={CheckCircle2} tone="success" hint={`${paid.length} charge(s)`} />
      </motion.div>
      <DataTable
        rows={acc.charges}
        loading={loading}
        rowKey={(c) => c.id}
        initialSort={{ key: "date", dir: "desc" }}
        columns={[
          { key: "desc", header: "Charge", primary: true, cell: (c) => <div className="min-w-0"><div className="font-semibold">{c.type}</div><div className="truncate text-xs text-muted-foreground">{c.description}</div></div> },
          { key: "date", header: "Date", sortValue: (c) => c.date, cell: (c) => fmtDate(c.date) },
          { key: "amount", header: "Amount", align: "right", sortValue: (c) => c.amount, cell: (c) => <span className="font-semibold">{money(c.amount)}</span> },
          { key: "status", header: "Status", cell: (c) => <PayBadge status={c.status === "paid" ? "paid" : "pending"} /> },
          { key: "receipt", header: "Receipt", cell: (c) => (c.paymentId ? <span className="text-xs">{acc.payments.find((p) => p.id === c.paymentId)?.receiptNo} · {fmtDateTime(c.paidAt)}</span> : <span className="text-xs text-muted-foreground">Pay at front desk</span>) },
        ]}
        actions={(c) => c.paymentId ? <Button variant="ghost" size="icon-sm" aria-label="View receipt" onClick={() => receipt.open(c.paymentId!)}><Receipt /></Button> : null}
        empty={{ title: "No extra charges", description: "You have a clean record. Keep it up!" }}
      />
    </div>
  );
}
