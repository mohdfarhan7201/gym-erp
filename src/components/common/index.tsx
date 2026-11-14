import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { ChevronRight, Inbox, type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge, type BadgeVariant, Card, Label } from "@/components/ui/primitives";
import { fadeUp } from "@/animations/motion";
import type { MemberStatus, MembershipStatus } from "@/types";

/* ---------------- Brand ---------------- */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" className="fill-lime" />
      <g className="fill-[#0B0D10]">
        <rect x="7" y="14" width="4" height="12" rx="1.2" />
        <rect x="29" y="14" width="4" height="12" rx="1.2" />
        <rect x="11.5" y="11" width="4" height="18" rx="1.2" />
        <rect x="24.5" y="11" width="4" height="18" rx="1.2" />
        <rect x="15.5" y="18.3" width="9" height="3.4" rx=".8" />
      </g>
    </svg>
  );
}

export function Logo({ name = "PulseFit", sub = "Gym ERP", className, light }: { name?: string; sub?: string; className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <div className="leading-none">
        <div className={cn("font-display text-[22px] font-extrabold uppercase tracking-wide", light ? "text-white" : "text-foreground")}>{name.replace(/ gym$/i, "")}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-ink dark:text-lime">{sub}</div>
      </div>
    </div>
  );
}

/* ---------------- Page header ---------------- */
export function PageHeader({ title, description, actions, crumbs }: { title: string; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; to?: string }[] }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                {c.to ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-[28px] font-bold uppercase leading-none tracking-wide sm:text-[32px]">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Animated number ---------------- */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-IN"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) {
      el.textContent = format(value);
      if (inView) prev.current = value;
      return;
    }
    const ctrl = animate(prev.current, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => (el.textContent = format(v)) });
    prev.current = value;
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce]);
  return <span ref={ref} className={cn("tabular", className)}>{format(0)}</span>;
}

/* ---------------- Stat card ---------------- */
type Tone = "lime" | "dark" | "success" | "warning" | "danger" | "info" | "default";
const toneIcon: Record<Tone, string> = {
  lime: "bg-lime text-lime-foreground",
  dark: "bg-primary text-primary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  default: "bg-muted text-foreground",
};
export function StatCard({ label, value, format, icon: Icon, tone = "default", hint, trend, to, featured }: {
  label: string; value: number; format?: (n: number) => string; icon: LucideIcon; tone?: Tone; hint?: ReactNode; trend?: number; to?: string; featured?: boolean;
}) {
  const body = (
    <Card className={cn(
      "group relative h-full overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5",
      featured && "border-transparent bg-[#0E1116] text-white dark:bg-[#0E1116]",
    )}>
      {featured && <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lime/25 blur-2xl" aria-hidden />}
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-[13px] font-medium", featured ? "text-white/70" : "text-muted-foreground")}>{label}</p>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110", featured ? "bg-lime text-lime-foreground" : toneIcon[tone])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="mt-2 font-display text-[30px] font-bold leading-none tracking-wide sm:text-[34px]">
        <AnimatedNumber value={value} format={format} />
      </div>
      {(hint || trend !== undefined) && (
        <div className={cn("mt-2 flex flex-wrap items-center gap-2 text-xs", featured ? "text-white/60" : "text-muted-foreground")}>
          {trend !== undefined && isFinite(trend) && (
            <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold", trend >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger", featured && trend >= 0 && "bg-lime/15 text-lime")}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend).toFixed(0)}%
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  );
  return (
    <motion.div variants={fadeUp} className="h-full">
      {to ? <Link to={to} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link> : body}
    </motion.div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between"><div className="h-3 w-24 rounded bg-muted" /><div className="h-9 w-9 rounded-lg bg-muted" /></div>
      <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-3 w-20 rounded bg-muted" />
    </Card>
  );
}

/* ---------------- Status badges ---------------- */
const memberStatusMap: Record<MemberStatus | MembershipStatus, [BadgeVariant, string]> = {
  active: ["success", "Active"],
  inactive: ["default", "Inactive"],
  expired: ["danger", "Expired"],
  upcoming: ["info", "Upcoming"],
};
export const StatusBadge = ({ status }: { status: MemberStatus | MembershipStatus }) => {
  const [v, l] = memberStatusMap[status];
  return <Badge variant={v} dot>{l}</Badge>;
};
export const PayBadge = ({ status }: { status: "paid" | "pending" | "partial" }) =>
  status === "paid" ? <Badge variant="success" dot>Paid</Badge> : status === "partial" ? <Badge variant="warning" dot>Partial</Badge> : <Badge variant="danger" dot>Unpaid</Badge>;

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-lime/30 blur-xl" aria-hidden />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border bg-card"><Icon className="h-6 w-6 text-muted-foreground" /></div>
      </div>
      <h3 className="font-display text-lg font-semibold uppercase tracking-wide">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------- Form field ---------------- */
export function Field({ label, error, hint, children, className, required, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string; required?: boolean; htmlFor?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {error ? <p role="alert" className="text-xs font-medium text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ---------------- Section / info rows ---------------- */
export function InfoRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5 text-sm", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}

export function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-all",
        active ? "border-transparent bg-primary text-primary-foreground shadow-sm" : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
