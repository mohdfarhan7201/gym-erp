import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDays, parseISO } from "date-fns";
import { Check, Inbox, Printer, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { SuccessDialog } from "@/components/modals/SuccessDialog";
import { membershipService } from "@/services/gymService";
import { Field, InfoRow, PageHeader } from "@/components/common";
import { MemberPicker } from "@/components/forms/MemberPicker";
import { PaymentMethodPicker } from "@/components/forms/PaymentMethodPicker";
import { Avatar, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Separator } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { calcEndDate, today, toDateStr } from "@/utils/date";
import { fmtDate, money, timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Membership, Payment, PaymentMethod } from "@/types";

export default function RenewPage() {
  const { db, ix } = useGym(0);
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const receipt = useReceipt();
  const [params, setParams] = useSearchParams();
  const [memberId, setMemberId] = useState<string | undefined>(params.get("member") ?? undefined);
  const [planId, setPlanId] = useState(db.plans.find((p) => p.active && p.popular)?.id ?? db.plans[0]?.id);
  const [start, setStart] = useState(today());
  const [discount, setDiscount] = useState(0);
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [requestId, setRequestId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ membership: Membership; payment?: Payment } | null>(null);

  const requests = db.renewals.filter((r) => r.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const plan = db.plans.find((p) => p.id === planId);
  const cur = memberId ? ix.latestMs.get(memberId) : undefined;
  const net = Math.max(0, (plan?.price ?? 0) - discount);

  // default start date = day after current membership ends (if still running) else today
  useEffect(() => {
    if (!memberId) return;
    const c = ix.latestMs.get(memberId);
    setStart(c && c.endDate >= today() ? toDateStr(addDays(parseISO(c.endDate), 1)) : today());
    setParams(memberId ? { member: memberId } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);
  useEffect(() => setAmount(net), [net]);

  const end = plan ? calcEndDate(start, plan.durationMonths) : undefined;
  const paid = Math.min(Number(amount) || 0, net);
  const valid = memberId && plan && start && Number(amount) >= 0 && Number(amount) <= net && discount <= (plan?.price ?? 0);

  const submit = async () => {
    if (!valid || !memberId || !plan) return;
    setBusy(true);
    try {
      const res = await membershipService.renew({ memberId, planId: plan.id, startDate: start, discount: can("giveDiscounts") ? discount : 0, amountPaid: paid, method, reference, requestId });
      setDone(res);
      setRequestId(undefined);
      toast.success("Membership renewed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const member = memberId ? ix.memberById.get(memberId) : undefined;
  const history = useMemo(() => (memberId ? (ix.msByMember.get(memberId) ?? []).slice(0, 3) : []), [ix, memberId]);

  return (
    <div>
      <PageHeader title="Renew Membership" description="Extend a member's plan. The new expiry is calculated from the plan duration." />

      {requests.length > 0 && (
        <Card className="mb-4 border-info/30 bg-info/[0.04]">
          <CardHeader><div><CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5 text-info" /> Renewal requests</CardTitle><CardDescription>Sent by members from the member app</CardDescription></div><Badge variant="info">{requests.length} pending</Badge></CardHeader>
          <CardContent className="space-y-2">
            {requests.map((r) => {
              const m = ix.memberById.get(r.memberId);
              const p = db.plans.find((x) => x.id === r.planId);
              if (!m) return null;
              return (
                <div key={r.id} className={cn("flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center", requestId === r.id && "ring-2 ring-lime")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={m.name} src={m.photo} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{m.name} <span className="font-normal text-muted-foreground">wants</span> {p?.name}</div>
                      <div className="truncate text-xs text-muted-foreground">From {fmtDate(r.preferredStart)} · {timeAgo(r.createdAt)}{r.note && ` · “${r.note}”`}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="lime" disabled={!can("renewMemberships")} onClick={() => { setMemberId(r.memberId); setPlanId(r.planId); setRequestId(r.id); setTimeout(() => setStart(r.preferredStart < today() ? today() : r.preferredStart), 0); }}><Check /> Process</Button>
                    <Button size="sm" variant="outline" onClick={() => membershipService.rejectRequest(r.id).then(() => toast.success("Request declined"))}><X /> Decline</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-5">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>1 · Member</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <MemberPicker value={memberId} onChange={(id) => { setMemberId(id); setRequestId(undefined); }} />
              {history.length > 0 && (
                <div className="rounded-xl border p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent memberships</div>
                  {history.map((h) => <div key={h.id} className="flex justify-between py-1 text-sm"><span>{h.planName}</span><span className="text-muted-foreground">{fmtDate(h.startDate)} – {fmtDate(h.endDate)}</span></div>)}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>2 · Plan & dates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div role="radiogroup" aria-label="Plan" className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                {db.plans.filter((p) => p.active).map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={planId === p.id} onClick={() => setPlanId(p.id)}
                    className={cn("cursor-pointer rounded-xl border p-3.5 text-left transition-all", planId === p.id ? "border-transparent bg-[#0E1116] text-white shadow-glow" : "bg-card hover:border-foreground/25")}>
                    <div className="text-xs opacity-70">{p.durationMonths} mo</div>
                    <div className="font-display text-lg font-bold uppercase leading-tight">{p.name}</div>
                    <div className={cn("font-display text-xl font-bold", planId === p.id && "text-lime")}>{money(p.price)}</div>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date" required htmlFor="rs" hint={cur && cur.endDate >= today() ? `Current plan ends ${fmtDate(cur.endDate)}` : undefined}>
                  <Input id="rs" type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
                </Field>
                <Field label="Discount (₹)" htmlFor="rd" hint={can("giveDiscounts") ? undefined : "Needs owner permission"} error={discount > (plan?.price ?? 0) ? "Discount exceeds price" : undefined}>
                  <Input id="rd" type="number" min={0} value={discount} disabled={!can("giveDiscounts")} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
                </Field>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>3 · Payment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Amount received now (₹)" htmlFor="ra" hint="Enter less than the total for a partial payment, or 0 to pay later." error={Number(amount) > net ? `Max ${money(net)}` : undefined}>
                <Input id="ra" type="number" min={0} max={net} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))} className="h-12 font-display text-xl font-bold" />
              </Field>
              {paid > 0 && (
                <>
                  <PaymentMethodPicker value={method} onChange={setMethod} />
                  {method !== "cash" && <Field label="Reference" htmlFor="rref"><Input id="rref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" /></Field>}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-[#0E1116] p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-white/50">Renewal summary</div>
              <div className="mt-1 truncate font-display text-2xl font-bold uppercase">{member?.name ?? "Select a member"}</div>
              {member && <div className="text-sm text-white/60">{member.code}</div>}
            </div>
            <CardContent className="pt-4">
              <InfoRow label="Plan" value={plan?.name ?? "—"} />
              <InfoRow label="Period" value={`${fmtDate(start)} → ${fmtDate(end)}`} />
              <Separator className="my-1" />
              <InfoRow label="Price" value={money(plan?.price ?? 0)} />
              {discount > 0 && <InfoRow label="Discount" value={`− ${money(discount)}`} />}
              <InfoRow label="Payable" value={<span className="font-display text-lg">{money(net)}</span>} />
              <InfoRow label="Paying now" value={money(paid)} />
              <InfoRow label="Balance" value={<span className={net - paid ? "text-danger" : "text-success"}>{money(net - paid)}</span>} />
              <Button className="mt-4 w-full" size="lg" variant="lime" disabled={!valid} loading={busy} onClick={submit}><RefreshCw /> Confirm renewal</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SuccessDialog open={!!done} onOpenChange={(o) => !o && setDone(null)} title="Membership renewed" description={done && `${ix.memberById.get(done.membership.memberId)?.name}: ${done.membership.planName} until ${fmtDate(done.membership.endDate)}.`}>
        {done?.payment && <Button variant="outline" onClick={() => receipt.open(done.payment!.id)}><Printer /> Receipt</Button>}
        <Button variant="outline" onClick={() => { setDone(null); setMemberId(undefined); }}>Renew another</Button>
        <Button variant="lime" onClick={() => nav(to(`members/${done!.membership.memberId}`))}>View member</Button>
      </SuccessDialog>
    </div>
  );
}
