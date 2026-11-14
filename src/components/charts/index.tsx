import type { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { compactMoney, money } from "@/utils/format";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/utils/cn";

export const CHART = {
  lime: "#B4E21F",
  limeDark: "#C6F432",
  ink: "#111418",
  navy: "#1E3A8A",
  blue: "#3B82F6",
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#10B981",
  slate: "#94A3B8",
};

function useChartColors() {
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  return {
    primary: dark ? CHART.limeDark : CHART.ink,
    accent: dark ? "#7DD3FC" : CHART.lime,
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(17,20,24,0.06)",
    axis: dark ? "#8B93A1" : "#6B7280",
    dark,
  };
}

export function ChartCard({ title, description, action, children, className, loading, height = 280 }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string; loading?: boolean; height?: number }) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full min-w-0">
          {loading ? <Skeleton className="h-full w-full rounded-lg" /> : children}
        </div>
      </CardContent>
    </Card>
  );
}

function TooltipBox({ active, payload, label, money: isMoney = true }: { active?: boolean; payload?: { name: string; value: number; color: string; dataKey: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2.5 text-xs shadow-lift">
      <div className="mb-1.5 font-semibold text-foreground">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}</span>
          <span className="font-semibold tabular-nums text-foreground">{isMoney ? money(p.value) : p.value.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

const axisProps = (color: string) => ({ tick: { fill: color, fontSize: 11 }, tickLine: false, axisLine: false });

export function RevenueChart({ data, dataKey = "value", name = "Revenue" }: { data: { label: string; [k: string]: number | string }[]; dataKey?: string; name?: string }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -8, right: 6, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.dark ? CHART.limeDark : CHART.lime} stopOpacity={0.45} />
            <stop offset="100%" stopColor={c.dark ? CHART.limeDark : CHART.lime} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="label" {...axisProps(c.axis)} minTickGap={18} />
        <YAxis {...axisProps(c.axis)} tickFormatter={compactMoney} width={52} />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: c.axis, strokeDasharray: "3 3" }} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={c.dark ? CHART.limeDark : "#7FA30F"} strokeWidth={2.5} fill="url(#rev-fill)" animationDuration={900} activeDot={{ r: 5, strokeWidth: 2, stroke: c.dark ? "#000" : "#fff" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarsChart({ data, dataKey = "value", name = "Check-ins", isMoney = false, color }: { data: { label: string; [k: string]: number | string }[]; dataKey?: string; name?: string; isMoney?: boolean; color?: string }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -14, right: 6, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="label" {...axisProps(c.axis)} minTickGap={10} />
        <YAxis {...axisProps(c.axis)} allowDecimals={false} tickFormatter={isMoney ? compactMoney : undefined} width={isMoney ? 56 : 40} />
        <Tooltip content={<TooltipBox money={isMoney} />} cursor={{ fill: c.grid }} />
        <Bar dataKey={dataKey} name={name} fill={color ?? c.primary} radius={[6, 6, 2, 2]} maxBarSize={34} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseChart({ data }: { data: { label: string; income: number; expense: number; profit: number }[] }) {
  const c = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ left: -6, right: 6, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={c.grid} />
        <XAxis dataKey="label" {...axisProps(c.axis)} />
        <YAxis {...axisProps(c.axis)} tickFormatter={compactMoney} width={54} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: c.grid }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="income" name="Income" fill={c.dark ? CHART.limeDark : CHART.lime} radius={[6, 6, 2, 2]} maxBarSize={26} animationDuration={800} />
        <Bar dataKey="expense" name="Expense" fill={c.dark ? "#475569" : CHART.ink} radius={[6, 6, 2, 2]} maxBarSize={26} animationDuration={800} />
        <Line type="monotone" dataKey="profit" name="Profit" stroke={CHART.blue} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1000} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, isMoney = true, centerLabel }: { data: { name: string; value: number; color: string }[]; isMoney?: boolean; centerLabel?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" animationDuration={800}>
              {data.filter((d) => d.value > 0).map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip content={<TooltipBox money={isMoney} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-display text-xl font-bold">{isMoney ? compactMoney(total) : total.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-muted-foreground">{centerLabel ?? "Total"}</div>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: d.color }} /><span className="truncate">{d.name}</span></span>
            <span className="shrink-0 font-semibold tabular-nums">
              {isMoney ? money(d.value) : d.value}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
