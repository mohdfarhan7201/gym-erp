import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Printer, UserPlus } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { memberService } from "@/services/gymService";
import { EmptyState, Field, InfoRow, PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Separator, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Select } from "@/components/ui/overlays";
import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { PaymentMethodPicker, SegmentedControl } from "@/components/forms/PaymentMethodPicker";
import { memberProfileSchema } from "@/utils/schemas";
import { calcEndDate, today } from "@/utils/date";
import { fmtDate, money } from "@/utils/format";
import { toast } from "sonner";
import type { Member, Payment } from "@/types";

const registerSchema = memberProfileSchema.extend({
  planId: z.string().min(1, "Choose a membership plan"),
  startDate: z.string().min(1, "Start date is required"),
  discount: z.coerce.number().min(0, "Can't be negative"),
  paymentStatus: z.enum(["paid", "partial", "unpaid"]),
  amountPaid: z.coerce.number().min(0),
  method: z.enum(["cash", "upi", "card", "bank"]),
  reference: z.string().optional(),
});
type RegisterForm = z.infer<typeof registerSchema>;
type ProfileForm = z.infer<typeof memberProfileSchema>;

const BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

/** Shared profile fieldset (used by register + edit). */
function ProfileFields({ form }: { form: ReturnType<typeof useForm<RegisterForm>> | ReturnType<typeof useForm<ProfileForm>> }) {
  // both forms share the same profile keys
  const f = form as unknown as ReturnType<typeof useForm<ProfileForm>>;
  const { register, control, formState: { errors } } = f;
  const name = useWatch({ control, name: "name" });
  return (
    <Card>
      <CardHeader><div><CardTitle>Personal details</CardTitle><CardDescription>Basic information for the member card</CardDescription></div></CardHeader>
      <CardContent className="space-y-5">
        <Controller control={control} name="photo" render={({ field }) => <PhotoUpload value={field.value} onChange={field.onChange} name={name} />} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name?.message} htmlFor="name"><Input id="name" placeholder="e.g. Rahul Sharma" aria-invalid={!!errors.name} {...register("name")} /></Field>
          <Field label="Mobile number" required error={errors.phone?.message} htmlFor="phone"><Input id="phone" inputMode="numeric" maxLength={10} placeholder="10-digit mobile" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
          <Field label="Email" error={errors.email?.message} hint="Lets the member log into the member app" htmlFor="email"><Input id="email" type="email" placeholder="optional" aria-invalid={!!errors.email} {...register("email")} /></Field>
          <Field label="Gender" required error={errors.gender?.message}>
            <Controller control={control} name="gender" render={({ field }) => (
              <SegmentedControl value={field.value} onChange={field.onChange} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
            )} />
          </Field>
          <Field label="Address" required error={errors.address?.message} className="sm:col-span-2" htmlFor="address"><Textarea id="address" rows={2} className="min-h-[64px]" placeholder="House no, area, city" aria-invalid={!!errors.address} {...register("address")} /></Field>
        </div>
        <details className="group rounded-xl border bg-muted/20 p-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
            Optional details
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">DOB, blood group, emergency contact…</span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth" htmlFor="dob"><Input id="dob" type="date" max={today()} {...register("dob")} /></Field>
            <Field label="Blood group">
              <Controller control={control} name="bloodGroup" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} placeholder="Select" options={BLOOD.map((b) => ({ value: b, label: b }))} />} />
            </Field>
            <Field label="Emergency contact" error={errors.emergencyContact?.message} htmlFor="ec"><Input id="ec" inputMode="numeric" maxLength={10} {...register("emergencyContact")} /></Field>
            <Field label="Occupation" htmlFor="occ"><Input id="occ" {...register("occupation")} /></Field>
            <Field label="Notes" className="sm:col-span-2" htmlFor="notes"><Textarea id="notes" rows={2} placeholder="Injuries, goals, preferences…" {...register("notes")} /></Field>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export default function RegisterMemberPage() {
  const { db } = useGym(0);
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const receipt = useReceipt();
  const activePlans = db.plans.filter((p) => p.active);
  const [done, setDone] = useState<{ member: Member; payment?: Payment } | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", phone: "", email: "", gender: "male", address: "", photo: null, planId: activePlans[0]?.id ?? "", startDate: today(), discount: 0, paymentStatus: "paid", amountPaid: 0, method: "upi", reference: "" },
  });
  const { control, register, handleSubmit, formState: { errors, isSubmitting }, reset, setError } = form;
  const v = useWatch({ control });
  const plan = db.plans.find((p) => p.id === v.planId);
  const net = Math.max(0, (plan?.price ?? 0) - (Number(v.discount) || 0));
  const paid = v.paymentStatus === "paid" ? net : v.paymentStatus === "partial" ? Math.min(Number(v.amountPaid) || 0, net) : 0;
  const end = plan && v.startDate ? calcEndDate(v.startDate, plan.durationMonths) : undefined;

  const onSubmit = async (data: RegisterForm) => {
    if (data.paymentStatus === "partial" && (data.amountPaid <= 0 || data.amountPaid >= net)) {
      setError("amountPaid", { message: `Enter an amount between ₹1 and ${money(net - 1)}` });
      return;
    }
    if (data.discount > (plan?.price ?? 0)) {
      setError("discount", { message: "Discount can't exceed plan price" });
      return;
    }
    try {
      const res = await memberService.register({ ...data, email: data.email || undefined, discount: can("giveDiscounts") ? data.discount : 0 });
      setDone(res);
      toast.success("Member registered", { description: `${res.member.name} · ${res.member.code}` });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Register Member" description="Create a member profile and start their first membership." crumbs={[{ label: "Members", to: to("members") }, { label: "Register" }]} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 lg:grid-cols-[1fr_380px] lg:gap-5">
        <div className="min-w-0 space-y-4 lg:space-y-5">
          <ProfileFields form={form} />
          <Card>
            <CardHeader><div><CardTitle>Membership & payment</CardTitle><CardDescription>Expiry is calculated automatically from the plan</CardDescription></div></CardHeader>
            <CardContent className="space-y-5">
              <Controller control={control} name="planId" render={({ field }) => (
                <div role="radiogroup" aria-label="Plan" className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                  {activePlans.map((p) => (
                    <button key={p.id} type="button" role="radio" aria-checked={field.value === p.id} onClick={() => field.onChange(p.id)}
                      className={`relative cursor-pointer rounded-xl border p-3.5 text-left transition-all ${field.value === p.id ? "border-transparent bg-[#0E1116] text-white shadow-glow" : "bg-card hover:border-foreground/25"}`}>
                      {p.popular && <span className="absolute right-2 top-2 rounded-full bg-lime px-1.5 py-0.5 text-[9px] font-bold uppercase text-lime-foreground">Popular</span>}
                      <div className="text-xs font-medium opacity-70">{p.durationMonths} month{p.durationMonths > 1 ? "s" : ""}</div>
                      <div className="font-display text-lg font-bold uppercase leading-tight">{p.name}</div>
                      <div className={`mt-1 font-display text-xl font-bold ${field.value === p.id ? "text-lime" : ""}`}>{money(p.price)}</div>
                    </button>
                  ))}
                </div>
              )} />
              {errors.planId && <p className="text-xs font-medium text-danger">{errors.planId.message}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date" required error={errors.startDate?.message} htmlFor="start"><Input id="start" type="date" {...register("startDate")} /></Field>
                <Field label="Discount (₹)" error={errors.discount?.message} hint={can("giveDiscounts") ? undefined : "Discounts need owner permission"} htmlFor="disc">
                  <Input id="disc" type="number" min={0} disabled={!can("giveDiscounts")} {...register("discount")} />
                </Field>
              </div>
              <Separator />
              <Field label="Payment status">
                <Controller control={control} name="paymentStatus" render={({ field }) => (
                  <SegmentedControl value={field.value} onChange={field.onChange} options={[{ value: "paid", label: "Full payment" }, { value: "partial", label: "Partial" }, { value: "unpaid", label: "Pay later" }]} />
                )} />
              </Field>
              {v.paymentStatus === "partial" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Field label="Amount received (₹)" required error={errors.amountPaid?.message} htmlFor="amt"><Input id="amt" type="number" min={1} {...register("amountPaid")} /></Field>
                </motion.div>
              )}
              {v.paymentStatus !== "unpaid" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Payment method" className="sm:col-span-2">
                    <Controller control={control} name="method" render={({ field }) => <PaymentMethodPicker value={field.value} onChange={field.onChange} />} />
                  </Field>
                  {v.method !== "cash" && <Field label="Transaction reference" htmlFor="ref"><Input id="ref" placeholder="UPI / card ref (optional)" {...register("reference")} /></Field>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-[#0E1116] p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-white/50">New member ID</div>
              <div className="font-display text-3xl font-bold tracking-wide text-lime">{db.settings.memberPrefix}{db.counters.member}</div>
              <div className="mt-1 truncate text-sm text-white/70">{v.name || "Member name"}</div>
            </div>
            <CardContent className="pt-4">
              <InfoRow label="Plan" value={plan ? `${plan.name} (${plan.durationMonths} mo)` : "—"} />
              <InfoRow label="Starts" value={fmtDate(v.startDate)} />
              <InfoRow label="Expires" value={<span className="text-lime-ink">{fmtDate(end)}</span>} />
              <Separator className="my-1" />
              <InfoRow label="Plan price" value={money(plan?.price ?? 0)} />
              {Number(v.discount) > 0 && <InfoRow label="Discount" value={`− ${money(Number(v.discount))}`} />}
              <InfoRow label="Payable" value={<span className="font-display text-lg">{money(net)}</span>} />
              <InfoRow label="Paying now" value={money(paid)} />
              <InfoRow label="Balance" value={<span className={net - paid > 0 ? "text-danger" : "text-success"}>{money(net - paid)}</span>} />
              <div className="mt-4 flex flex-col gap-2">
                <Button type="submit" variant="lime" size="lg" loading={isSubmitting}><UserPlus /> {isSubmitting ? "Registering…" : "Register member"}</Button>
                <Button type="button" variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent size="sm">
          <DialogHeader className="items-center pt-8 text-center">
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} className="mx-auto mb-2 grid h-16 w-16 place-items-center rounded-full bg-lime text-lime-foreground">
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <DialogTitle>Member registered!</DialogTitle>
            <DialogDescription>
              {done?.member.name} has been assigned member ID <strong className="text-foreground">{done?.member.code}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3 sm:justify-center">
            <Button variant="outline" onClick={() => { setDone(null); reset(); }}>Register another</Button>
            {done?.payment && <Button variant="outline" onClick={() => receipt.open(done.payment!.id)}><Printer /> Receipt</Button>}
            <Button variant="lime" onClick={() => nav(to(`members/${done!.member.id}`))}>View profile</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function EditMemberPage() {
  const { id } = useParams();
  const { db } = useGym(0);
  const { to } = usePanel();
  const nav = useNavigate();
  const member = db.members.find((m) => m.id === id);
  const defaults = useMemo<ProfileForm | undefined>(
    () => member && { photo: member.photo ?? null, name: member.name, phone: member.phone, email: member.email ?? "", gender: member.gender, dob: member.dob ?? "", address: member.address, bloodGroup: member.bloodGroup ?? "", emergencyContact: member.emergencyContact ?? "", occupation: member.occupation ?? "", notes: member.notes ?? "" },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member?.id],
  );
  const form = useForm<ProfileForm>({ resolver: zodResolver(memberProfileSchema), values: defaults });
  if (!member) return <EmptyState title="Member not found" action={<Button asChild variant="outline"><Link to={to("members")}>Back to members</Link></Button>} />;

  const onSubmit = async (d: ProfileForm) => {
    try {
      await memberService.update(member.id, { ...d, email: d.email || undefined, photo: d.photo ?? null });
      toast.success("Member updated");
      nav(to(`members/${member.id}`));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div>
      <PageHeader title="Edit Member" description={`${member.name} · ${member.code}`} crumbs={[{ label: "Members", to: to("members") }, { label: member.name, to: to(`members/${member.id}`) }, { label: "Edit" }]} />
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-4">
        <ProfileFields form={form} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button>
          <Button type="submit" variant="lime" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}
