import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { profileService } from "@/services/gymService";
import { PERMISSIONS } from "@/services/mock/permissions";
import { Field, InfoRow, PageHeader } from "@/components/common";
import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { ChangePasswordCard } from "@/components/forms/ChangePassword";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { phoneSchema } from "@/utils/schemas";
import { fmtDate, fmtDateTime } from "@/utils/format";
import { CheckCircle2, XCircle } from "lucide-react";

const schema = z.object({ name: z.string().trim().min(3), email: z.string().email(), phone: phoneSchema, photo: z.string().nullable().optional() });
type Form = z.infer<typeof schema>;

export default function StaffProfile() {
  const { db } = useGym(0);
  const { session, refresh } = useAuth();
  const me = db.staff.find((s) => s.id === session?.userId);
  const { register, control, handleSubmit, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Form>({ resolver: zodResolver(schema), values: me ? { name: me.name, email: me.email, phone: me.phone, photo: me.photo ?? null } : undefined });
  if (!me) return null;
  const submit = async (f: Form) => {
    try {
      await profileService.updateStaff(me.id, f);
      authService.updateSessionName(f.name, f.email);
      refresh();
      reset(f);
      toast.success("Profile updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div>
      <PageHeader title="My Profile" description="Your account details and access." />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
              <Controller control={control} name="photo" render={({ field }) => <PhotoUpload value={field.value} onChange={field.onChange} name={watch("name") ?? ""} />} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.name?.message} htmlFor="pn"><Input id="pn" {...register("name")} /></Field>
                <Field label="Mobile" error={errors.phone?.message} htmlFor="pp"><Input id="pp" {...register("phone")} /></Field>
                <Field label="Email (login)" error={errors.email?.message} className="sm:col-span-2" htmlFor="pe"><Input id="pe" {...register("email")} /></Field>
              </div>
              <div className="flex justify-end"><Button type="submit" variant="lime" loading={isSubmitting} disabled={!isDirty}>Save profile</Button></div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Role" value={<Badge variant={me.role === "admin" ? "lime" : "info"}>{me.role === "admin" ? "Owner / Admin" : "Receptionist"}</Badge>} />
              <InfoRow label="Shift" value={me.shift} />
              <InfoRow label="Joined" value={fmtDate(me.joinedAt)} />
              <InfoRow label="Signed in" value={fmtDateTime(session?.loggedInAt)} />
              {me.role === "receptionist" && (
                <div className="mt-3 space-y-1.5 rounded-xl bg-muted/40 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your permissions</div>
                  {PERMISSIONS.map((p) => (
                    <div key={p.key} className="flex items-center gap-2 text-sm">{me.permissions[p.key] ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}<span className={me.permissions[p.key] ? "" : "text-muted-foreground line-through"}>{p.label}</span></div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <ChangePasswordCard />
        </div>
      </div>
    </div>
  );
}
