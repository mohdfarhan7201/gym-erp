import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useMyAccount } from "@/hooks/useMyAccount";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { memberPortalService } from "@/services/gymService";
import { Field, InfoRow, PageHeader, StatusBadge } from "@/components/common";
import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { ChangePasswordCard } from "@/components/forms/ChangePassword";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { optionalPhone, phoneSchema } from "@/utils/schemas";
import { fmtDate, titleCase } from "@/utils/format";

const schema = z.object({
  photo: z.string().nullable().optional(),
  phone: phoneSchema,
  email: z.string().email("Enter a valid email"),
  address: z.string().trim().min(5, "Address is required"),
  emergencyContact: optionalPhone,
  bloodGroup: z.string().optional(),
  occupation: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function MyProfile() {
  const { acc, d } = useMyAccount();
  const { refresh } = useAuth();
  const m = acc?.member;
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema),
    values: m ? { photo: m.photo ?? null, phone: m.phone, email: m.email ?? "", address: m.address, emergencyContact: m.emergencyContact ?? "", bloodGroup: m.bloodGroup ?? "", occupation: m.occupation ?? "" } : undefined,
  });
  if (!acc || !m || !d) return null;
  const submit = async (f: Form) => {
    try {
      await memberPortalService.updateProfile(m.id, { ...f, photo: f.photo ?? null });
      authService.updateSessionName(m.name, f.email);
      refresh();
      reset(f);
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div>
      <PageHeader title="My Profile" description="Keep your contact details up to date." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><div><CardTitle>Contact details</CardTitle><CardDescription>Name and member ID can only be changed by the front desk.</CardDescription></div></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
              <Controller control={control} name="photo" render={({ field }) => <PhotoUpload value={field.value} onChange={field.onChange} name={m.name} />} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name"><Input value={m.name} disabled /></Field>
                <Field label="Member ID"><Input value={m.code} disabled /></Field>
                <Field label="Mobile" error={errors.phone?.message} htmlFor="mp"><Input id="mp" inputMode="numeric" maxLength={10} {...register("phone")} /></Field>
                <Field label="Email (login)" error={errors.email?.message} htmlFor="me"><Input id="me" type="email" {...register("email")} /></Field>
                <Field label="Address" error={errors.address?.message} className="sm:col-span-2" htmlFor="ma"><Textarea id="ma" rows={2} {...register("address")} /></Field>
                <Field label="Emergency contact" error={errors.emergencyContact?.message} htmlFor="mec"><Input id="mec" inputMode="numeric" maxLength={10} {...register("emergencyContact")} /></Field>
                <Field label="Blood group"><Controller control={control} name="bloodGroup" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => ({ value: b, label: b }))} />} /></Field>
                <Field label="Occupation" htmlFor="mo"><Input id="mo" {...register("occupation")} /></Field>
              </div>
              <div className="flex justify-end"><Button type="submit" variant="lime" loading={isSubmitting} disabled={!isDirty}>Save changes</Button></div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Membership card</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Status" value={<StatusBadge status={d.status} />} />
              <InfoRow label="Plan" value={d.current?.planName ?? "—"} />
              <InfoRow label="Valid till" value={fmtDate(d.current?.endDate)} />
              <InfoRow label="Member since" value={fmtDate(m.joinDate)} />
              <InfoRow label="Gender" value={titleCase(m.gender)} />
              <InfoRow label="Date of birth" value={fmtDate(m.dob)} />
            </CardContent>
          </Card>
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
