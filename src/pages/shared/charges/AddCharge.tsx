import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, KeyRound, Lock, Siren, Timer, Wrench, Hammer, IdCard } from "lucide-react";
import { toast } from "sonner";
import { usePanel } from "@/contexts/AuthContext";
import { chargeService } from "@/services/gymService";
import { CHARGE_TYPES } from "@/services/mock/seed";
import { Field, PageHeader } from "@/components/common";
import { MemberPicker } from "@/components/forms/MemberPicker";
import { Card, CardContent, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { SuccessDialog } from "@/components/modals/SuccessDialog";
import { today } from "@/utils/date";
import { money } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ChargeType } from "@/types";

const icons: Record<ChargeType, typeof Wrench> = {
  "Equipment Damage": Hammer, "Machine Repair": Wrench, "Locker Damage": Lock, "Lost Key": KeyRound, "Access Card": IdCard, "Late Payment Fine": Timer, "Other Penalties": Siren,
};
const presets: Partial<Record<ChargeType, number>> = { "Lost Key": 250, "Access Card": 200, "Late Payment Fine": 100 };

const schema = z.object({
  memberId: z.string({ required_error: "Select a member" }).min(1, "Select a member"),
  type: z.enum(CHARGE_TYPES as [ChargeType, ...ChargeType[]]),
  description: z.string().trim().min(3, "Describe the charge"),
  amount: z.coerce.number().min(1, "Enter an amount"),
  date: z.string().min(1).refine((d) => d <= today(), "Date can't be in the future"),
});
type Form = z.infer<typeof schema>;

export default function AddCharge() {
  const [params] = useSearchParams();
  const { to } = usePanel();
  const nav = useNavigate();
  const [done, setDone] = useState<Form | null>(null);
  const { control, register, handleSubmit, setValue, reset, watch, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { memberId: params.get("member") ?? "", type: "Equipment Damage", description: "", amount: undefined as unknown as number, date: today() },
  });
  const type = watch("type");

  const submit = async (f: Form) => {
    try {
      await chargeService.add(f);
      setDone(f);
      toast.success("Extra charge added");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Add Extra Charge" description="Raise a damage, fine or replacement charge on a member's account." crumbs={[{ label: "Extra charges", to: to("charges") }, { label: "Add" }]} />
      <form onSubmit={handleSubmit(submit)} noValidate className="mx-auto max-w-3xl space-y-4">
        <Card><CardContent className="space-y-5 pt-5">
          <Field label="Member" required error={errors.memberId?.message}>
            <Controller control={control} name="memberId" render={({ field }) => <MemberPicker value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} invalid={!!errors.memberId} />} />
          </Field>
          <Field label="Charge type" required>
            <Controller control={control} name="type" render={({ field }) => (
              <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CHARGE_TYPES.map((t) => {
                  const Icon = icons[t];
                  return (
                    <button key={t} type="button" role="radio" aria-checked={field.value === t} onClick={() => { field.onChange(t); if (presets[t]) setValue("amount", presets[t]!); }}
                      className={cn("flex min-h-[76px] cursor-pointer flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left text-[13px] font-semibold transition-all", field.value === t ? "border-transparent bg-[#0E1116] text-white shadow-glow" : "hover:border-foreground/25")}>
                      <Icon className={cn("h-5 w-5", field.value === t ? "text-lime" : "text-muted-foreground")} />{t}
                    </button>
                  );
                })}
              </div>
            )} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (₹)" required error={errors.amount?.message} htmlFor="ca" hint={presets[type] ? `Standard: ${money(presets[type]!)}` : undefined}><Input id="ca" type="number" min={1} {...register("amount")} aria-invalid={!!errors.amount} /></Field>
            <Field label="Date" required error={errors.date?.message} htmlFor="cd"><Input id="cd" type="date" max={today()} {...register("date")} /></Field>
            <Field label="Description" required error={errors.description?.message} className="sm:col-span-2" htmlFor="cdesc"><Textarea id="cdesc" rows={3} placeholder="What happened? e.g. Dropped 20kg dumbbell on mirror" {...register("description")} aria-invalid={!!errors.description} /></Field>
          </div>
        </CardContent></Card>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button>
          <Button type="submit" variant="lime" loading={isSubmitting}>Add charge</Button>
        </div>
      </form>
      <SuccessDialog open={!!done} onOpenChange={(o) => !o && setDone(null)} title="Charge added" description={done && `${done.type} · ${money(done.amount)} is now pending on the member's account.`}>
        <Button variant="outline" onClick={() => { setDone(null); reset({ memberId: "", type: "Equipment Damage", description: "", amount: undefined as unknown as number, date: today() }); }}>Add another</Button>
        <Button variant="outline" onClick={() => nav(to(`charges/pending`))}>View pending</Button>
        <Button variant="lime" onClick={() => nav(to(`payments/collect?member=${done!.memberId}`))}><CreditCard /> Collect now</Button>
      </SuccessDialog>
    </div>
  );
}
