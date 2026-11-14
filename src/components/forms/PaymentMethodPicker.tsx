import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import { cn } from "@/utils/cn";
import type { PaymentMethod } from "@/types";

const opts: { v: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { v: "cash", label: "Cash", icon: Banknote },
  { v: "upi", label: "UPI", icon: Smartphone },
  { v: "card", label: "Card", icon: CreditCard },
  { v: "bank", label: "Bank", icon: Landmark },
];

export function PaymentMethodPicker({ value, onChange, methods = ["cash", "upi", "card"] }: { value: PaymentMethod; onChange: (v: PaymentMethod) => void; methods?: PaymentMethod[] }) {
  return (
    <div role="radiogroup" aria-label="Payment method" className={cn("grid gap-2", methods.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
      {opts.filter((o) => methods.includes(o.v)).map(({ v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-all",
            value === v ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" /> {label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div role="radiogroup" className={cn("grid gap-1 rounded-xl bg-muted p-1", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-9 cursor-pointer rounded-lg text-[13px] font-semibold transition-all", value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
