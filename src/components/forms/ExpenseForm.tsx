import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { expenseService } from "@/services/gymService";
import { Field } from "@/components/common";
import { Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PaymentMethodPicker } from "./PaymentMethodPicker";
import { today } from "@/utils/date";
import { cn } from "@/utils/cn";
import type { Expense } from "@/types";

const schema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().trim().min(3, "Add a short title"),
  amount: z.coerce.number().min(1, "Enter an amount"),
  date: z.string().min(1, "Date is required").refine((d) => d <= today(), "Date can't be in the future"),
  method: z.enum(["cash", "upi", "card", "bank"]),
  vendor: z.string().optional(),
  note: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export function ExpenseForm({ expense, onDone, onCancel }: { expense?: Expense; onDone?: () => void; onCancel?: () => void }) {
  const { db } = useGym(0);
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? { categoryId: expense.categoryId, title: expense.title, amount: expense.amount, date: expense.date, method: expense.method, vendor: expense.vendor ?? "", note: expense.note ?? "" }
      : { categoryId: "", title: "", amount: undefined as unknown as number, date: today(), method: "upi", vendor: "", note: "" },
  });
  const submit = async (f: Form) => {
    try {
      await expenseService.save({ ...f, id: expense?.id });
      toast.success(expense ? "Expense updated" : "Expense added");
      if (!expense) reset({ categoryId: f.categoryId, title: "", amount: undefined as unknown as number, date: today(), method: f.method, vendor: "", note: "" });
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <Field label="Category" required error={errors.categoryId?.message}>
        <Controller control={control} name="categoryId" render={({ field }) => (
          <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {db.categories.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={field.value === c.id} onClick={() => field.onChange(c.id)}
                className={cn("flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-all", field.value === c.id ? "border-transparent bg-primary text-primary-foreground" : "hover:border-foreground/25")}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} /><span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required error={errors.title?.message} className="sm:col-span-2" htmlFor="et"><Input id="et" placeholder="e.g. Treadmill servicing" {...register("title")} aria-invalid={!!errors.title} /></Field>
        <Field label="Amount (₹)" required error={errors.amount?.message} htmlFor="ea"><Input id="ea" type="number" min={1} {...register("amount")} aria-invalid={!!errors.amount} /></Field>
        <Field label="Date" required error={errors.date?.message} htmlFor="ed"><Input id="ed" type="date" max={today()} {...register("date")} /></Field>
        <Field label="Paid via" className="sm:col-span-2"><Controller control={control} name="method" render={({ field }) => <PaymentMethodPicker value={field.value} onChange={field.onChange} methods={["cash", "upi", "card", "bank"]} />} /></Field>
        <Field label="Vendor / paid to" htmlFor="ev"><Input id="ev" placeholder="Optional" {...register("vendor")} /></Field>
        <Field label="Note" htmlFor="en"><Textarea id="en" rows={1} className="min-h-[40px]" placeholder="Optional" {...register("note")} /></Field>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="lime" loading={isSubmitting}>{expense ? "Save changes" : "Add expense"}</Button>
      </div>
    </form>
  );
}
