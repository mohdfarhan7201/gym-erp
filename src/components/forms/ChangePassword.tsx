import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { Field } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

const schema = z
  .object({ current: z.string().min(1, "Enter current password"), next: z.string().min(6, "At least 6 characters"), confirm: z.string() })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type Form = z.infer<typeof schema>;

export function ChangePasswordCard() {
  const { session } = useAuth();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });
  const submit = async (f: Form) => {
    try {
      await authService.changePassword(session!, f.current, f.next);
      toast.success("Password changed");
      reset({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Change password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3">
          <Field label="Current password" error={errors.current?.message} htmlFor="cp1"><Input id="cp1" type="password" autoComplete="current-password" {...register("current")} /></Field>
          <Field label="New password" error={errors.next?.message} htmlFor="cp2"><Input id="cp2" type="password" autoComplete="new-password" {...register("next")} /></Field>
          <Field label="Confirm new password" error={errors.confirm?.message} htmlFor="cp3"><Input id="cp3" type="password" autoComplete="new-password" {...register("confirm")} /></Field>
          <Button type="submit" variant="outline" loading={isSubmitting} className="w-full sm:w-auto">Update password</Button>
        </form>
      </CardContent>
    </Card>
  );
}
