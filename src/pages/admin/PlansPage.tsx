import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { planService } from "@/services/gymService";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { Field, PageHeader } from "@/components/common";
import { Badge, Card, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Switch } from "@/components/ui/overlays";
import { fadeUp, stagger } from "@/animations/motion";
import { money } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Plan } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  durationMonths: z.coerce.number().int().min(1, "At least 1 month").max(36),
  price: z.coerce.number().min(1, "Enter a price"),
  description: z.string().trim().max(140),
  features: z.string(),
  active: z.boolean(),
  popular: z.boolean(),
});
type Form = z.infer<typeof schema>;

function PlanDialog({ plan, open, onOpenChange }: { plan?: Plan; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open)
      reset(plan ? { ...plan, features: plan.features.join("\n"), popular: !!plan.popular } : { name: "", durationMonths: 1, price: 700, description: "", features: "", active: true, popular: false });
  }, [open, plan, reset]);
  const submit = async (f: Form) => {
    try {
      await planService.save({ ...f, id: plan?.id, features: f.features.split("\n").map((s) => s.trim()).filter(Boolean) });
      toast.success(plan ? "Plan updated" : "Plan created");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(submit)} noValidate className="flex max-h-[inherit] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle>
            <DialogDescription>Price changes apply to new registrations and renewals.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4 pb-4">
            <Field label="Plan name" required error={errors.name?.message} htmlFor="pn"><Input id="pn" {...register("name")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (months)" required error={errors.durationMonths?.message} htmlFor="pd"><Input id="pd" type="number" min={1} {...register("durationMonths")} /></Field>
              <Field label="Price (₹)" required error={errors.price?.message} htmlFor="pp"><Input id="pp" type="number" min={1} {...register("price")} /></Field>
            </div>
            <Field label="Short description" error={errors.description?.message} htmlFor="pdesc"><Input id="pdesc" {...register("description")} /></Field>
            <Field label="Features" hint="One per line" htmlFor="pf"><Textarea id="pf" rows={4} {...register("features")} /></Field>
            <div className="flex flex-col gap-3 rounded-xl border p-3.5">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span><span className="font-semibold">Active</span><span className="block text-xs text-muted-foreground">Available for new memberships</span></span><Switch checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} /></label>
              <label className="flex cursor-pointer items-center justify-between gap-3 text-sm"><span><span className="font-semibold">Mark as popular</span><span className="block text-xs text-muted-foreground">Highlights the plan in pickers</span></span><Switch checked={watch("popular")} onCheckedChange={(v) => setValue("popular", v)} /></label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="lime" loading={isSubmitting}>{plan ? "Save plan" : "Create plan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlansPage() {
  const { db, ix } = useGym();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<Plan | undefined>();
  const [open, setOpen] = useState(false);
  const activeCount = (pid: string) => [...ix.latestMs.values()].filter((m) => m.planId === pid && ix.status.get(m.memberId) === "active").length;

  return (
    <div>
      <PageHeader title="Membership Plans" description="Set durations and prices. Membership expiry is calculated automatically from the plan." actions={<Button variant="lime" onClick={() => { setEdit(undefined); setOpen(true); }}><Plus /> New plan</Button>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...db.plans].sort((a, b) => a.durationMonths - b.durationMonths).map((p) => {
          const perMonth = p.price / p.durationMonths;
          const featured = p.popular;
          return (
            <motion.div key={p.id} variants={fadeUp} whileHover={{ y: -4 }}>
              <Card className={cn("relative flex h-full flex-col overflow-hidden p-5", featured && "border-transparent bg-[#0E1116] text-white shadow-glow", !p.active && "opacity-60")}>
                {featured && <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/25 blur-2xl" />}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className={cn("text-xs font-semibold uppercase tracking-widest", featured ? "text-lime" : "text-muted-foreground")}>{p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}</div>
                    <h3 className="font-display text-2xl font-bold uppercase">{p.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {featured && <Badge variant="lime">Popular</Badge>}
                    {!p.active && <Badge>Inactive</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="font-display text-4xl font-extrabold">{money(p.price)}</span>
                </div>
                <div className={cn("text-xs", featured ? "text-white/60" : "text-muted-foreground")}>{money(perMonth)}/month · {p.description}</div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => <li key={f} className="flex gap-2"><Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-lime" : "text-success")} />{f}</li>)}
                </ul>
                <div className={cn("mt-4 flex items-center gap-1.5 text-xs", featured ? "text-white/60" : "text-muted-foreground")}><Users className="h-3.5 w-3.5" /> {activeCount(p.id)} active members</div>
                <div className="mt-4 flex gap-2">
                  <Button variant={featured ? "lime" : "outline"} className="flex-1" onClick={() => { setEdit(p); setOpen(true); }}><Pencil /> Edit</Button>
                  <Button variant="ghost" size="icon" className={featured ? "text-white hover:bg-white/10 hover:text-white" : ""} aria-label={`Delete ${p.name}`} onClick={async () => {
                    if (await confirm({ title: `Delete ${p.name}?`, description: "Plans used by memberships can't be deleted — deactivate them instead.", destructive: true, confirmText: "Delete" }))
                      planService.remove(p.id).then(() => toast.success("Plan deleted")).catch((e) => toast.error(e.message));
                  }}><Trash2 /></Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
      <PlanDialog plan={edit} open={open} onOpenChange={setOpen} />
    </div>
  );
}
