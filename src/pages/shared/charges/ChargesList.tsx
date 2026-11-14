import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Plus, Receipt, RotateCcw, Trash2, Wrench, AlertCircle, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { chargeService } from "@/services/gymService";
import { CHARGE_TYPES } from "@/services/mock/seed";
import { sum } from "@/services/selectors";
import { DataTable } from "@/components/tables/DataTable";
import { Field, InfoRow, PageHeader, PayBadge, Pill, StatCard } from "@/components/common";
import { PaymentMethodPicker } from "@/components/forms/PaymentMethodPicker";
import { Avatar, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Select } from "@/components/ui/overlays";
import { stagger } from "@/animations/motion";
import { fmtDate, money } from "@/utils/format";
import type { ExtraCharge, PaymentMethod } from "@/types";

type Filter = "all" | "pending" | "paid";

function CollectChargeDialog({ charge, onClose }: { charge?: ExtraCharge; onClose: () => void }) {
  const { ix } = useGym(0);
  const receipt = useReceipt();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const m = charge ? ix.memberById.get(charge.memberId) : undefined;
  const pay = async () => {
    if (!charge) return;
    setBusy(true);
    try {
      const p = await chargeService.markPaid(charge.id, method, ref);
      toast.success("Charge marked paid", { description: p.receiptNo });
      onClose();
      receipt.open(p.id);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!charge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader><DialogTitle>Collect charge</DialogTitle><DialogDescription>{m?.name} · {m?.code}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-4 pb-4">
          <div className="rounded-xl bg-muted/50 p-3">
            <InfoRow label="Type" value={charge?.type} />
            <InfoRow label="Description" value={charge?.description} />
            <InfoRow label="Amount" value={<span className="font-display text-xl">{money(charge?.amount ?? 0)}</span>} />
          </div>
          <PaymentMethodPicker value={method} onChange={setMethod} />
          {method !== "cash" && <Field label="Reference" htmlFor="ccr"><Input id="ccr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" /></Field>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="lime" loading={busy} onClick={pay}><CheckCircle2 /> Mark paid & receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChargesPage({ preset }: { preset: Filter }) {
  const { db, ix, loading } = useGym();
  const { to, isAdmin } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const receipt = useReceipt();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<Filter>(preset);
  const [type, setType] = useState("all");
  const [collect, setCollect] = useState<ExtraCharge | undefined>();

  useEffect(() => {
    const id = params.get("charge");
    if (id) {
      setCollect(db.charges.find((c) => c.id === id && c.status === "pending"));
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => db.charges.filter((c) => (status === "all" || c.status === status) && (type === "all" || c.type === type)), [db.charges, status, type]);
  const pending = db.charges.filter((c) => c.status === "pending");
  const paid = db.charges.filter((c) => c.status === "paid");
  const titles: Record<Filter, [string, string]> = {
    all: [isAdmin ? "All Charges" : "Charge History", "Damage, fines and replacement charges across members."],
    pending: [isAdmin ? "Pending Charges" : "Collect Extra Charges", "Unpaid charges — collect them to generate a receipt."],
    paid: ["Paid Charges", "Charges that have been settled."],
  };

  return (
    <div>
      <PageHeader title={titles[preset][0]} description={titles[preset][1]} actions={can("addExtraCharges") && <Button asChild variant="lime"><Link to={to("charges/new")}><Plus /> Add charge</Link></Button>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Pending amount" value={sum(pending, (c) => c.amount)} format={money} icon={AlertCircle} />
        <StatCard label="Collected" value={sum(paid, (c) => c.amount)} format={money} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending charges" value={pending.length} icon={Wrench} tone="warning" />
        <StatCard label="Total charges" value={db.charges.length} icon={ListChecks} tone="info" />
      </motion.div>
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(c) => c.id}
        initialSort={{ key: "date", dir: "desc" }}
        search={(c) => { const m = ix.memberById.get(c.memberId); return `${m?.name} ${m?.code} ${c.type} ${c.description}`; }}
        toolbar={
          <>
            <div className="flex gap-1.5">{(["all", "pending", "paid"] as Filter[]).map((f) => <Pill key={f} active={status === f} onClick={() => setStatus(f)}><span className="capitalize">{f}</span></Pill>)}</div>
            <div className="w-full sm:w-48"><Select aria-label="Charge type" value={type} onValueChange={setType} options={[{ value: "all", label: "All types" }, ...CHARGE_TYPES.map((t) => ({ value: t, label: t }))]} /></div>
          </>
        }
        columns={[
          { key: "member", header: "Member", primary: true, sortValue: (c) => ix.memberById.get(c.memberId)?.name ?? "", cell: (c) => { const m = ix.memberById.get(c.memberId); return <Link to={to(`members/${c.memberId}`)} className="flex min-w-0 items-center gap-3"><Avatar name={m?.name ?? "?"} src={m?.photo} /><div className="min-w-0"><div className="truncate font-semibold">{m?.name}</div><div className="truncate text-xs text-muted-foreground">{m?.code}</div></div></Link>; } },
          { key: "type", header: "Charge", sortValue: (c) => c.type, cell: (c) => <div className="max-w-[260px]"><div className="font-medium">{c.type}</div><div className="truncate text-xs text-muted-foreground">{c.description}</div></div> },
          { key: "date", header: "Date", sortValue: (c) => c.date, cell: (c) => fmtDate(c.date) },
          { key: "amount", header: "Amount", align: "right", sortValue: (c) => c.amount, cell: (c) => <span className="font-semibold tabular">{money(c.amount)}</span> },
          { key: "status", header: "Status", sortValue: (c) => c.status, cell: (c) => <PayBadge status={c.status === "paid" ? "paid" : "pending"} /> },
          { key: "receipt", header: "Receipt", cell: (c) => (c.paymentId ? <button type="button" className="cursor-pointer text-xs font-semibold text-lime-ink hover:underline" onClick={(e) => { e.stopPropagation(); receipt.open(c.paymentId!); }}>{db.payments.find((p) => p.id === c.paymentId)?.receiptNo}</button> : "—"), hideOnMobile: true },
        ]}
        actions={(c) =>
          c.status === "pending" ? (
            <>
              {can("collectPayments") && <Button size="sm" variant="lime" onClick={() => setCollect(c)}>Collect</Button>}
              {can("addExtraCharges") && <Button variant="ghost" size="icon-sm" aria-label="Delete" onClick={async () => { if (await confirm({ title: "Delete charge?", description: `${c.type} · ${money(c.amount)}`, destructive: true, confirmText: "Delete" })) chargeService.remove(c.id).then(() => toast.success("Charge deleted")).catch((e) => toast.error(e.message)); }}><Trash2 /></Button>}
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon-sm" aria-label="Receipt" onClick={() => c.paymentId && receipt.open(c.paymentId)}><Receipt /></Button>
              {isAdmin && <Button variant="ghost" size="icon-sm" aria-label="Mark unpaid" title="Mark unpaid (voids receipt)" onClick={async () => { if (await confirm({ title: "Mark as unpaid?", description: "The linked receipt will be voided and the charge becomes pending again.", destructive: true, confirmText: "Mark unpaid" })) chargeService.markPending(c.id).then(() => toast.success("Charge marked unpaid")); }}><RotateCcw /></Button>}
            </>
          )
        }
        onRowClick={(c) => nav(to(`members/${c.memberId}`))}
        exportConfig={{
          filename: `extra-charges-${status}`,
          title: `Extra charges (${status})`,
          summary: [["Total", money(sum(rows, (c) => c.amount))], ["Count", String(rows.length)]],
          columns: [
            { header: "Member ID", value: (c) => ix.memberById.get(c.memberId)?.code ?? "" },
            { header: "Member", value: (c) => ix.memberById.get(c.memberId)?.name ?? "" },
            { header: "Type", value: (c) => c.type },
            { header: "Description", value: (c) => c.description },
            { header: "Date", value: (c) => c.date },
            { header: "Amount", value: (c) => c.amount },
            { header: "Status", value: (c) => c.status },
          ],
        }}
        empty={{ title: status === "pending" ? "No pending charges" : "No charges", description: "Nice — nothing to collect here." }}
      />
      <CollectChargeDialog charge={collect} onClose={() => setCollect(undefined)} />
    </div>
  );
}

export default function AllCharges() {
  return <ChargesPage preset="all" />;
}
export const PendingCharges = () => <ChargesPage preset="pending" />;
export const PaidCharges = () => <ChargesPage preset="paid" />;
