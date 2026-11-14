import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleCheck, IndianRupee, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { chargeService, paymentService } from "@/services/gymService";
import { msDue } from "@/services/selectors";
import { EmptyState, Field, InfoRow, PageHeader } from "@/components/common";
import { MemberPicker } from "@/components/forms/MemberPicker";
import { PaymentMethodPicker } from "@/components/forms/PaymentMethodPicker";
import { Card, CardContent, CardHeader, CardTitle, Input, Separator, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate, money } from "@/utils/format";
import { today } from "@/utils/date";
import { cn } from "@/utils/cn";
import type { PaymentMethod } from "@/types";

type Item = { key: string; kind: "membership" | "charge" | "other"; id?: string; title: string; sub: string; due: number };

export default function CollectPayment() {
  const { db, ix } = useGym(0);
  const receipt = useReceipt();
  const [params, setParams] = useSearchParams();
  const [memberId, setMemberId] = useState<string | undefined>(params.get("member") ?? undefined);
  const [sel, setSel] = useState<string>("");
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [otherDesc, setOtherDesc] = useState("Personal training session");
  const [busy, setBusy] = useState(false);

  const items = useMemo<Item[]>(() => {
    if (!memberId) return [];
    const ms = (ix.msByMember.get(memberId) ?? []).filter((x) => msDue(x, ix) > 0).map<Item>((x) => ({ key: `m:${x.id}`, kind: "membership", id: x.id, title: `${x.planName} membership balance`, sub: `${fmtDate(x.startDate)} – ${fmtDate(x.endDate)}`, due: msDue(x, ix) }));
    const ch = db.charges.filter((c) => c.memberId === memberId && c.status === "pending").map<Item>((c) => ({ key: `c:${c.id}`, kind: "charge", id: c.id, title: c.type, sub: `${c.description} · ${fmtDate(c.date)}`, due: c.amount }));
    return [...ms, ...ch, { key: "other", kind: "other", title: "Other payment", sub: "PT session, merchandise, guest pass…", due: 0 }];
  }, [memberId, ix, db.charges]);

  useEffect(() => {
    const first = items[0];
    setSel(first?.key ?? "");
    setAmount(first?.due || "");
    if (memberId) setParams({ member: memberId }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, items.length]);

  const item = items.find((i) => i.key === sel);
  const amt = Number(amount) || 0;
  const error = !item ? undefined : item.kind === "charge" ? undefined : amt <= 0 ? "Enter an amount" : item.kind === "membership" && amt > item.due ? `Max ${money(item.due)}` : undefined;
  const canSubmit = memberId && item && !error && (item.kind !== "other" || otherDesc.trim().length > 2);

  const submit = async () => {
    if (!canSubmit || !item || !memberId) return;
    setBusy(true);
    try {
      const p = item.kind === "charge"
        ? await chargeService.markPaid(item.id!, method, reference)
        : await paymentService.collect({ memberId, membershipId: item.kind === "membership" ? item.id : undefined, amount: amt, method, reference, note, description: item.kind === "other" ? otherDesc : undefined, date: today() });
      toast.success(`${money(p.amount)} collected`, { description: p.receiptNo });
      receipt.open(p.id);
      setReference("");
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Collect Payment" description="Collect membership balances, extra charges or other payments. A receipt is generated instantly." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-5">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Member</CardTitle></CardHeader>
            <CardContent><MemberPicker value={memberId} onChange={setMemberId} autoFocus={!memberId} /></CardContent>
          </Card>
          {memberId && (
            <Card>
              <CardHeader><CardTitle>What is being paid?</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.length === 1 && <div className="mb-2 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success"><CircleCheck className="h-4 w-4" /> No pending dues for this member.</div>}
                {items.map((i) => (
                  <button key={i.key} type="button" onClick={() => { setSel(i.key); setAmount(i.due || ""); }} aria-pressed={sel === i.key}
                    className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-left transition-all", sel === i.key ? "border-transparent bg-lime/15 ring-2 ring-lime" : "hover:border-foreground/25")}>
                    <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", sel === i.key ? "border-lime-ink" : "border-input")}>{sel === i.key && <span className="h-2.5 w-2.5 rounded-full bg-lime-ink" />}</span>
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{i.title}</div><div className="truncate text-xs text-muted-foreground">{i.sub}</div></div>
                    {i.due > 0 && <span className="shrink-0 font-semibold text-danger">{money(i.due)}</span>}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
          {memberId && item && (
            <Card>
              <CardHeader><CardTitle>Payment</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {item.kind === "other" && <Field label="Description" required htmlFor="od"><Input id="od" value={otherDesc} onChange={(e) => setOtherDesc(e.target.value)} /></Field>}
                <Field label="Amount (₹)" htmlFor="pa" error={error} hint={item.kind === "membership" ? "Enter less than the balance for a partial payment" : item.kind === "charge" ? "Extra charges are collected in full" : undefined}>
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input id="pa" type="number" min={1} value={amount} disabled={item.kind === "charge"} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} className="h-14 pl-10 font-display text-2xl font-bold" aria-invalid={!!error} />
                  </div>
                </Field>
                {item.kind === "membership" && (
                  <div className="flex flex-wrap gap-2">
                    {[item.due, Math.round(item.due / 2)].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                      <Button key={v} type="button" size="sm" variant="secondary" onClick={() => setAmount(v)}>{v === item.due ? "Full" : "Half"} · {money(v)}</Button>
                    ))}
                  </div>
                )}
                <Field label="Payment method"><PaymentMethodPicker value={method} onChange={setMethod} /></Field>
                {method !== "cash" && <Field label="Transaction reference" htmlFor="pr"><Input id="pr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref / last 4 digits (optional)" /></Field>}
                <Field label="Note" htmlFor="pn"><Textarea id="pn" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional internal note" /></Field>
              </CardContent>
            </Card>
          )}
          {!memberId && <Card><EmptyState icon={Wallet} title="Select a member" description="Search for a member to see their pending dues." /></Card>}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-[#0E1116] p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-white/50">Collecting</div>
              <div className="font-display text-4xl font-extrabold text-lime">{money(item?.kind === "charge" ? item.due : amt)}</div>
              <div className="mt-1 truncate text-sm text-white/60">{memberId ? ix.memberById.get(memberId)?.name : "No member selected"}</div>
            </div>
            <CardContent className="pt-4">
              <InfoRow label="For" value={item?.kind === "other" ? otherDesc : item?.title ?? "—"} />
              <InfoRow label="Method" value={method.toUpperCase()} />
              {item?.kind === "membership" && (<><Separator className="my-1" /><InfoRow label="Balance after" value={<span className={item.due - amt > 0 ? "text-danger" : "text-success"}>{money(Math.max(0, item.due - amt))}</span>} /></>)}
              <InfoRow label="Next receipt no." value={`${db.settings.receiptPrefix}${db.counters.receipt}`} />
              <Button className="mt-4 w-full" size="lg" variant="lime" disabled={!canSubmit} loading={busy} onClick={submit}>{busy ? "Processing…" : "Collect & generate receipt"}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
