import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

/* ---------------- Input / Textarea / Label ---------------- */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-[inset_0_1px_1px_rgba(0,0,0,.02)] transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/25 file:border-0 file:bg-transparent file:text-sm file:font-medium",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[88px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring aria-[invalid=true]:border-danger",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-[13px] font-medium leading-none text-foreground/90", className)} {...props} />
);

/* ---------------- Card ---------------- */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)} {...props} />
));
Card.displayName = "Card";
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-wrap items-start justify-between gap-3 p-4 pb-2 sm:p-5 sm:pb-3", className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-display text-lg font-semibold uppercase tracking-wide", className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-[13px] text-muted-foreground", className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />
);

/* ---------------- Badge ---------------- */
const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-secondary text-secondary-foreground",
      success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
      warning: "bg-warning/15 text-warning ring-1 ring-inset ring-warning/25",
      danger: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20",
      info: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
      lime: "bg-lime text-lime-foreground",
      outline: "border text-muted-foreground",
      dark: "bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});
export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
export const Badge = ({ className, variant, dot, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
    {props.children}
  </span>
);

/* ---------------- Skeleton ---------------- */
export const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("relative overflow-hidden rounded-md bg-muted", className)} {...props}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent" />
  </div>
);

/* ---------------- Avatar ---------------- */
const palette = ["bg-indigo-500", "bg-emerald-600", "bg-amber-500", "bg-rose-500", "bg-sky-600", "bg-violet-600", "bg-teal-600", "bg-orange-500"];
export function Avatar({ name, src, className, ring }: { name: string; src?: string | null; className?: string; ring?: boolean }) {
  const color = palette[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length];
  return (
    <span className={cn("relative inline-flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white", !src && color, ring && "ring-2 ring-lime ring-offset-2 ring-offset-background", className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

/* ---------------- Separator / Progress ---------------- */
export const Separator = ({ className }: { className?: string }) => <div role="separator" className={cn("h-px w-full bg-border", className)} />;

export const Progress = ({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) => (
  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <div className={cn("h-full rounded-full bg-lime transition-[width] duration-700 ease-out", barClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);
