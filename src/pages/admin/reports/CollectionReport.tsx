import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, IndianRupee, Receipt, TrendingUp } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, Pill, StatCard } from "@/components/common";
import { BarsChart, ChartCard, CHART, DonutChart, RevenueChart } from "@/components/charts";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { stagger } from "@/animations/motion";
import { bucketSeries } from "@/utils/analytics";
import { daysBetween } from "@/utils/date";
import { fmtDate, methodLabel, money } from "@/utils/format";
import { sum } from "@/services/selectors";

type Row = { key: string; label: string; count: number; membership: number; charges: number; other: number; upi: number; cash: number; card: number; total: number };

export default function CollectionReport() {
  const { db, loading } = useGym();
  const dr = useDateRange("30d");
  const { from, to } = dr.range;
  const [gran, setGran] = useState<"day" | "month">("day");

  const d = useMemo(() => {
    const ps = db.payments.filter((p) => p.date >= from && p.date <= to);
    const series = bucketSeries(from, to, ps, (p) => p.date, (p) => p.amount);
    const map = new Map<string, Row>();
    for (const p of ps) {
      const key = gran === "day" ? p.date : p.date.slice(0, 7);
      const r = map.get(key) ?? { key, label: gran === "day" ? fmtDate(p.date) : new Date(key + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }), count: 0, membership: 0, charges: 0, other: 0, upi: 0, cash: 0, card: 0, total: 0 };
      r.count++;
      r.total += p.amount;
      if (p.kind === "membership") r.membership += p.amount; else if (p.kind === "extra_charge") r.charges += p.amount; else r.other += p.amount;
      if (p.method === "upi") r.upi += p.amount; else if (p.method === "cash") r.cash += p.amount; else r.card += p.amount;
      map.set(key, r);
    }
    const methods = (["upi", "cash", "card", "bank"] as const).map((m) => ({ name: methodLabel[m], value: sum(ps.filter((p) => p.method === m), (p) => p.amount), color: { upi: CHART.lime, cash: CHART.ink, card: CHART.blue, bank: CHART.amber }[m] }));
    const types = [
      { label: "Membership", value: sum(ps.filter((p) => p.kind === "membership"), (p) => p.amount) },
      { label: "Extra charges", value: sum(ps.filter((p) => p.kind === "extra_charge"), (p) => p.amount) },
      { label: "Other", value: sum(ps.filter((p) => p.kind === "other"), (p) => p.amount) },
    ];
    const total = sum(ps, (p) => p.amount);
    return { ps, series, rows: [...map.values()], methods, types, total };
  }, [db.payments, from, to, gran]);
  const days = daysBetween(from, to) + 1;

  return (
    <div>
      <PageHeader title="Collection Reports" description="Daily & monthly collection, payment method analysis and revenue mix." actions={<DateRangeFilter {...dr} />} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Total collected" value={d.total} format={money} icon={IndianRupee} />
        <StatCard label="Receipts" value={d.ps.length} icon={Receipt} tone="info" />
        <StatCard label="Avg per day" value={d.total / days} format={money} icon={TrendingUp} tone="success" />
        <StatCard label="Avg ticket" value={d.ps.length ? d.total / d.ps.length : 0} format={money} icon={CreditCard} tone="warning" />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Collection trend" description={d.series.granularity === "day" ? "Daily" : "Monthly"} loading={loading}><RevenueChart data={d.series.series} /></ChartCard>
        <ChartCard title="Payment methods" loading={loading}><DonutChart data={d.methods.filter((m) => m.value > 0)} /></ChartCard>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_2fr]">
        <ChartCard title="Revenue mix" description="By payment type" loading={loading}><BarsChart data={d.types} isMoney name="Collected" /></ChartCard>
        <DataTable
          className="min-w-0"
          rows={d.rows}
          loading={loading}
          rowKey={(r) => r.key}
          initialSort={{ key: "key", dir: "desc" }}
          toolbar={<div className="flex gap-1.5"><Pill active={gran === "day"} onClick={() => setGran("day")}>Daily</Pill><Pill active={gran === "month"} onClick={() => setGran("month")}>Monthly</Pill></div>}
          columns={[
            { key: "key", header: gran === "day" ? "Date" : "Month", primary: true, sortValue: (r) => r.key, cell: (r) => <span className="font-semibold">{r.label}</span> },
            { key: "count", header: "Receipts", align: "right", sortValue: (r) => r.count, cell: (r) => r.count },
            { key: "upi", header: "UPI", align: "right", sortValue: (r) => r.upi, cell: (r) => money(r.upi), hideOnMobile: true },
            { key: "cash", header: "Cash", align: "right", sortValue: (r) => r.cash, cell: (r) => money(r.cash), hideOnMobile: true },
            { key: "card", header: "Card/Bank", align: "right", sortValue: (r) => r.card, cell: (r) => money(r.card), hideOnMobile: true },
            { key: "total", header: "Total", align: "right", sortValue: (r) => r.total, cell: (r) => <span className="font-bold tabular">{money(r.total)}</span> },
          ]}
          footer={!loading && d.rows.length > 0 && (
            <div className="flex justify-between border-t bg-muted/40 px-4 py-3 text-sm font-semibold"><span>Total ({d.rows.length} {gran === "day" ? "days" : "months"})</span><span className="tabular">{money(d.total)}</span></div>
          )}
          exportConfig={{
            filename: `collection-${gran}-${from}-to-${to}`,
            title: `${gran === "day" ? "Daily" : "Monthly"} collection report`,
            subtitle: `${fmtDate(from)} – ${fmtDate(to)}`,
            summary: [["Total", money(d.total)], ["Receipts", String(d.ps.length)], ...d.methods.filter((m) => m.value).map((m) => [m.name, money(m.value)] as [string, string])],
            columns: [
              { header: gran === "day" ? "Date" : "Month", value: (r) => r.label },
              { header: "Receipts", value: (r) => r.count },
              { header: "Membership", value: (r) => r.membership },
              { header: "Extra charges", value: (r) => r.charges },
              { header: "Other", value: (r) => r.other },
              { header: "UPI", value: (r) => r.upi },
              { header: "Cash", value: (r) => r.cash },
              { header: "Card/Bank", value: (r) => r.card },
              { header: "Total", value: (r) => r.total },
            ],
          }}
          empty={{ title: "No collections in range" }}
        />
      </div>
    </div>
  );
}
