import { useState } from "react";
import { addDays, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Check, Clock, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { useMyAccount } from "@/hooks/useMyAccount";
import { memberPortalService } from "@/services/gymService";
import { EmptyState, Field, InfoRow, PageHeader, PayBadge, StatusBadge } from "@/components/common";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Progress, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { calcEndDate, daysBetween, daysLeft, today, toDateStr } from "@/utils/date";
import { fmtDate, money, timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function MyMembership() {
  const { acc, d } = useMyAccount();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [planId, setPlanId] = useState<string>();
  const [start, setStart] = useState(today());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!acc || !d) return null;
  const cur = d.current;
  const left = cur ? Math.max(0, daysLeft(cur.endDate)) : 0;
  const total = cur ? daysBetween(cur.startDate, cur.endDate) + 1 : 1;
  const pendingReq = acc.renewals.find((r) => r.status === "pending");
  const plan = acc.plans.find((p) => p.id === planId);

  const begin = () => {
    setPlanId(cur?.planId ?? acc.plans[0]?.id);
    setStart(cur && cur.endDate >= today() ? toDateStr(addDays(parseISO(cur.endDate), 1)) : today());
    setStep(1);
    setNote("");
    setOpen(true);
  };
  const submit = async () => {
    if (!planId) return;
    setBusy(true);
    try {
      await memberPortalService.requestRenewal(acc.member.id, planId, start, note || undefined);
      toast.success("Renewal request sent", { description: "The front desk will confirm and collect payment." });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Membership" description="Your current plan, renewal and membership history." actions={!pendingReq && <Button variant="lime" onClick={begin}><RefreshCw /> Renew membership</Button>} />
      {pendingReq && (
        <Card className="mb-4 flex items-center gap-3 border-info/30 bg-info/[0.05] p-4">
          <Clock className="h-5 w-5 shrink-0 text-info" />
          <div className="text-sm"><span className="font-semibold">Renewal request pending</span> — {acc.plans.find((p) => p.id === pendingReq.planId)?.name ?? "plan"} from {fmtDate(pendingReq.preferredStart)}, sent {timeAgo(pendingReq.createdAt)}. Visit the front desk to complete payment.</div>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <div className="relative bg-[#0E1116] p-6 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime/25 blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50">Current plan</div>
                <div className="font-display text-4xl font-extrabold uppercase">{cur?.planName ?? "No plan"}</div>
                {cur && <div className="text-sm text-white/60">{cur.durationMonths} month{cur.durationMonths > 1 ? "s" : ""} · {money(cur.price)}</div>}
              </div>
              <StatusBadge status={d.status} />
            </div>
            {cur && (
              <div className="relative mt-6">
                <div className="flex items-end justify-between"><span className="font-display text-5xl font-extrabold text-lime">{left}</span><span className="text-sm text-white/60">days remaining</span></div>
                <Progress value={((total - left) / total) * 100} className="mt-3 h-2 bg-white/10" />
              </div>
            )}
          </div>
          {cur ? (
            <CardContent className="grid gap-x-8 pt-4 sm:grid-cols-2">
              <InfoRow label="Start date" value={fmtDate(cur.startDate)} />
              <InfoRow label="End date" value={fmtDate(cur.endDate)} />
              <InfoRow label="Plan amount" value={money(cur.price)} />
              <InfoRow label="Discount" value={money(cur.discount)} />
              <InfoRow label="Paid" value={money(d.msNet(cur) - d.msDue(cur.id))} />
              <InfoRow label="Balance" value={<span className={d.msDue(cur.id) ? "text-danger" : "text-success"}>{money(d.msDue(cur.id))}</span>} />
            </CardContent>
          ) : <EmptyState title="No membership" description="Request a plan to get started." />}
        </Card>
        <Card>
          <CardHeader><CardTitle>Membership history</CardTitle></CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-5">
              {acc.memberships.map((m) => (
                <li key={m.id} className="relative">
                  <span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card", d.msStatus(m) === "active" ? "bg-lime" : "bg-muted-foreground/40")} />
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{m.planName}</span><StatusBadge status={d.msStatus(m)} /></div>
                  <div className="text-xs text-muted-foreground">{fmtDate(m.startDate)} – {fmtDate(m.endDate)}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs"><span>{money(d.msNet(m))}</span><PayBadge status={d.msDue(m.id) === 0 ? "paid" : d.msDue(m.id) < d.msNet(m) ? "partial" : "pending"} /></div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Renew membership</DialogTitle>
            <DialogDescription>Step {step} of 2 · {step === 1 ? "Choose a plan" : "Confirm your request"}</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-4">
            {step === 1 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {acc.plans.map((p) => (
                  <motion.button key={p.id} type="button" whileTap={{ scale: 0.98 }} onClick={() => setPlanId(p.id)} aria-pressed={planId === p.id}
                    className={cn("relative cursor-pointer rounded-2xl border p-4 text-left transition-all", planId === p.id ? "border-transparent bg-[#0E1116] text-white shadow-glow" : "hover:border-foreground/25")}>
                    {p.popular && <Badge variant="lime" className="absolute right-3 top-3">Popular</Badge>}
                    <div className="text-xs opacity-60">{p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}</div>
                    <div className="font-display text-xl font-bold uppercase">{p.name}</div>
                    <div className={cn("font-display text-2xl font-extrabold", planId === p.id && "text-lime")}>{money(p.price)}</div>
                    <ul className="mt-2 space-y-1 text-xs opacity-80">{p.features.slice(0, 3).map((f) => <li key={f} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0" />{f}</li>)}</ul>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-4">
                  <InfoRow label="Plan" value={plan?.name} />
                  <InfoRow label="Period" value={`${fmtDate(start)} → ${fmtDate(plan ? calcEndDate(start, plan.durationMonths) : undefined)}`} />
                  <InfoRow label="Amount" value={<span className="font-display text-xl">{money(plan?.price ?? 0)}</span>} />
                </div>
                <Field label="Preferred start date" htmlFor="ps"><Input id="ps" type="date" min={today()} value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></Field>
                <Field label="Note for the front desk" htmlFor="pnote"><Textarea id="pnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></Field>
                <p className="text-xs text-muted-foreground">No online payment is taken — pay at the front desk (cash/UPI) when they confirm your renewal.</p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            {step === 2 ? <Button variant="outline" onClick={() => setStep(1)}>Back</Button> : <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>}
            {step === 1 ? <Button variant="lime" disabled={!planId} onClick={() => setStep(2)}>Continue</Button> : <Button variant="lime" loading={busy} onClick={submit}><Send /> Send request</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
