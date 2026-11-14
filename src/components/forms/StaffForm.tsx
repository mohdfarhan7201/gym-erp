import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { staffService } from "@/services/gymService";
import { Field } from "@/components/common";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/overlays";
import { PhotoUpload } from "./PhotoUpload";
import { phoneSchema } from "@/utils/schemas";
import { today } from "@/utils/date";
import type { Staff } from "@/types";

const schema = z.object({
  name: z.string().trim().min(3, "Enter full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: phoneSchema,
  password: z.string().min(6, "At least 6 characters"),
  shift: z.string().min(1, "Choose a shift"),
  joinedAt: z.string().min(1),
  active: z.boolean(),
  photo: z.string().nullable().optional(),
});
type Form = z.infer<typeof schema>;
const SHIFTS = ["Morning (5 AM – 1 PM)", "Evening (1 PM – 10 PM)", "Full Day", "Weekends"];

export function StaffForm({ staff, onDone, onCancel }: { staff?: Staff; onDone?: () => void; onCancel?: () => void }) {
  const [show, setShow] = useState(false);
  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: staff
      ? { name: staff.name, email: staff.email, phone: staff.phone, password: staff.password, shift: staff.shift ?? SHIFTS[0], joinedAt: staff.joinedAt, active: staff.active, photo: staff.photo ?? null }
      : { name: "", email: "", phone: "", password: "reception123", shift: SHIFTS[0], joinedAt: today(), active: true, photo: null },
  });
  const submit = async (f: Form) => {
    try {
      await staffService.save({ ...f, id: staff?.id });
      toast.success(staff ? "Staff updated" : "Receptionist added", { description: staff ? undefined : `They can now sign in with ${f.email}` });
      if (!staff) reset();
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <Controller control={control} name="photo" render={({ field }) => <PhotoUpload value={field.value} onChange={field.onChange} name={watch("name")} />} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name?.message} htmlFor="sn"><Input id="sn" {...register("name")} aria-invalid={!!errors.name} /></Field>
        <Field label="Mobile" required error={errors.phone?.message} htmlFor="sp"><Input id="sp" inputMode="numeric" maxLength={10} {...register("phone")} aria-invalid={!!errors.phone} /></Field>
        <Field label="Login email" required error={errors.email?.message} htmlFor="se"><Input id="se" type="email" autoComplete="off" {...register("email")} aria-invalid={!!errors.email} /></Field>
        <Field label="Password" required error={errors.password?.message} hint="Demo only — stored in this browser" htmlFor="spw">
          <div className="relative">
            <Input id="spw" type={show ? "text" : "password"} autoComplete="new-password" className="pr-11" {...register("password")} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </Field>
        <Field label="Shift" required error={errors.shift?.message}><Controller control={control} name="shift" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={SHIFTS.map((s) => ({ value: s, label: s }))} />} /></Field>
        <Field label="Joining date" htmlFor="sj"><Input id="sj" type="date" {...register("joinedAt")} /></Field>
      </div>
      {staff?.role !== "admin" && (
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-sm">
          <span><span className="font-semibold">Account active</span><span className="block text-xs text-muted-foreground">Inactive staff can't sign in</span></span>
          <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
        </label>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="lime" loading={isSubmitting}>{staff ? "Save changes" : "Add receptionist"}</Button>
      </div>
    </form>
  );
}
