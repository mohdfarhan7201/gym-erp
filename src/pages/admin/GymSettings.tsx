import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Monitor, Moon, Receipt, Sun } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useTheme } from "@/contexts/ThemeContext";
import { settingsService } from "@/services/gymService";
import { Field, PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const schema = z.object({
  name: z.string().trim().min(2, "Gym name is required"),
  tagline: z.string().max(60),
  phone: z.string().min(6, "Phone is required"),
  email: z.string().email("Enter a valid email"),
  address: z.string().min(5, "Address is required"),
  gstin: z.string().max(20),
  memberPrefix: z.string().trim().min(1).max(8),
  receiptPrefix: z.string().trim().min(1).max(8),
  openTime: z.string(),
  closeTime: z.string(),
  expiryReminderDays: z.coerce.number().int().min(1).max(30),
  receiptFooter: z.string().max(200),
});
type Form = z.infer<typeof schema>;

export default function GymSettings() {
  const { db } = useGym(0);
  const { mode, setMode } = useTheme();
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<Form>({ resolver: zodResolver(schema), values: db.settings });
  const submit = async (f: Form) => {
    await settingsService.update(f);
    reset(f);
    toast.success("Settings saved");
  };
  return (
    <div>
      <PageHeader title="Gym Settings" description="Branding, receipts and operating preferences." />
      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Gym profile</CardTitle><CardDescription>Shown on receipts, reports and the sidebar.</CardDescription></div></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Gym name" required error={errors.name?.message} htmlFor="gn"><Input id="gn" {...register("name")} /></Field>
            <Field label="Tagline" htmlFor="gt"><Input id="gt" {...register("tagline")} /></Field>
            <Field label="Phone" required error={errors.phone?.message} htmlFor="gp"><Input id="gp" {...register("phone")} /></Field>
            <Field label="Email" required error={errors.email?.message} htmlFor="ge"><Input id="ge" type="email" {...register("email")} /></Field>
            <Field label="Address" required error={errors.address?.message} className="sm:col-span-2" htmlFor="ga"><Textarea id="ga" rows={2} {...register("address")} /></Field>
            <Field label="GSTIN" htmlFor="gg"><Input id="gg" {...register("gstin")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens" htmlFor="go"><Input id="go" type="time" {...register("openTime")} /></Field>
              <Field label="Closes" htmlFor="gc"><Input id="gc" type="time" {...register("closeTime")} /></Field>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><div><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> IDs, receipts & reminders</CardTitle></div></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Member ID prefix" hint={`Next: ${db.settings.memberPrefix}${db.counters.member}`} error={errors.memberPrefix?.message} htmlFor="mp"><Input id="mp" {...register("memberPrefix")} /></Field>
              <Field label="Receipt prefix" hint={`Next: ${db.settings.receiptPrefix}${db.counters.receipt}`} error={errors.receiptPrefix?.message} htmlFor="rp"><Input id="rp" {...register("receiptPrefix")} /></Field>
              <Field label="Expiry reminder (days before)" error={errors.expiryReminderDays?.message} htmlFor="er"><Input id="er" type="number" min={1} max={30} {...register("expiryReminderDays")} /></Field>
              <Field label="Receipt footer" className="sm:col-span-2" htmlFor="rf"><Textarea id="rf" rows={2} {...register("receiptFooter")} /></Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Appearance</CardTitle><CardDescription>Saved per device.</CardDescription></div></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([m, I, l]) => (
                <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-4 text-sm font-semibold transition", mode === m ? "border-transparent bg-primary text-primary-foreground" : "hover:bg-accent")}>
                  <I className="h-5 w-5" />{l}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-xl border bg-card/90 p-3 shadow-lift backdrop-blur md:bottom-4 lg:col-span-2">
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset(db.settings)}>Discard</Button>
          <Button type="submit" variant="lime" loading={isSubmitting} disabled={!isDirty}>Save settings</Button>
        </div>
      </form>
    </div>
  );
}
