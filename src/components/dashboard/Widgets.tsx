import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { EmptyState } from "@/components/common";
import { fadeUp } from "@/animations/motion";
import { cn } from "@/utils/cn";

export function ListCard({ title, to, linkLabel = "View all", children, loading, empty, className }: { title: string; to?: string; linkLabel?: string; children: ReactNode; loading?: boolean; empty?: boolean; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={cn("min-w-0", className)}>
      <Card className="h-full">
        <CardHeader className="items-center">
          <CardTitle>{title}</CardTitle>
          {to && (
            <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
              {linkLabel} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </CardHeader>
        <CardContent className="pb-3 sm:pb-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-5 w-14" /></div>)}</div>
          ) : empty ? (
            <EmptyState title="Nothing to show" className="py-6" />
          ) : (
            <ul className="-mx-2 divide-y divide-border/60">{children}</ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PersonRow({ name, photo, sub, right, to }: { name: string; photo?: string | null; sub: ReactNode; right?: ReactNode; to?: string }) {
  const inner = (
    <>
      <Avatar name={name} src={photo} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </>
  );
  return (
    <li>
      {to ? <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">{inner}</Link> : <div className="flex items-center gap-3 px-2 py-2.5">{inner}</div>}
    </li>
  );
}

export function QuickAction({ icon: Icon, label, hint, to, tone = "default" }: { icon: LucideIcon; label: string; hint: string; to: string; tone?: "lime" | "dark" | "default" }) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
      <Link
        to={to}
        className={cn(
          "group flex h-full min-h-[112px] flex-col justify-between gap-3 rounded-2xl border p-4 shadow-card transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[128px] sm:p-5",
          tone === "lime" && "border-transparent bg-lime text-lime-foreground",
          tone === "dark" && "border-transparent bg-[#0E1116] text-white",
          tone === "default" && "bg-card",
        )}
      >
        <div className="flex items-start justify-between">
          <span className={cn("grid h-11 w-11 place-items-center rounded-xl", tone === "lime" ? "bg-black/10" : tone === "dark" ? "bg-lime text-lime-foreground" : "bg-muted")}>
            <Icon className="h-5 w-5" />
          </span>
          <ArrowUpRight className="h-4 w-4 opacity-40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
        </div>
        <div>
          <div className="font-display text-lg font-bold uppercase leading-tight tracking-wide">{label}</div>
          <div className={cn("text-xs", tone === "default" ? "text-muted-foreground" : "opacity-70")}>{hint}</div>
        </div>
      </Link>
    </motion.div>
  );
}

export const DaysBadge = ({ days }: { days: number }) => (
  <Badge variant={days <= 2 ? "danger" : days <= 5 ? "warning" : "info"}>{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}</Badge>
);
