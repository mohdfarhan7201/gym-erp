import { useMemo } from "react";
import { motion } from "framer-motion";
import { Layers, Receipt, TrendingDown, Wallet } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, StatCard } from "@/components/common";
import { BarsChart, ChartCard, DonutChart } from "@/components/charts";
import { DataTable } from "@/components/tables/DataTable";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { Progress } from "@/components/ui/primitives";
import { stagger } from "@/animations/motion";
import { bucketSeries } from "@/utils/analytics";
import { fmtDate, money } from "@/utils/format";
import { sum } from "@/services/selectors";

export default function ExpenseReport() {
  const { db, loading } = useGym();
  const dr = useDateRange("year");
  const { from, to } = dr.range;
  const d = useMemo(() => {
    const ex = db.expenses.filter((e) => e.date >= from && e.date <= to);
    const total = sum(ex, (e) => e.amount);
    const cats = db.categories
      .map((c) => {
        const items = ex.filter((e) => e.categoryId === c.id);
        return { id: c.id, name: c.name, color: c.color, count: items.length, value: sum(items, (e) => e.amount), max: items.length ? Math.max(...items.map((e) => e.amount)) : 0 };
      })
      .filter((c) => c.count > 0);
    const series = bucketSeries(from, to, ex, (e) => e.date, (e) => e.amount);
    return { ex, total, cats, series };
  }, [db, from, to]);
  const top = [...d.cats].sort((a, b) => b.value - a.value)[0];

  return (
    <div>
      <PageHeader title="Expense Reports" description="Monthly expense report and category breakdown." actions={<DateRangeFilter {...dr} />} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Total expenses" value={d.total} format={money} icon={Wallet} />
        <StatCard label="Entries" value={d.ex.length} icon={Receipt} tone="info" />
        <StatCard label="Categories used" value={d.cats.length} icon={Layers} />
        <StatCard label="Top category" value={top?.value ?? 0} format={money} icon={TrendingDown} tone="warning" hint={top?.name} />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Expenses over time" description={d.series.granularity === "day" ? "Daily" : "Monthly"} loading={loading}><BarsChart data={d.series.series} isMoney name="Expenses" /></ChartCard>
        <ChartCard title="Category share" loading={loading}><DonutChart data={d.cats} /></ChartCard>
      </div>
      <div className="mt-4">
        <DataTable
          rows={d.cats}
          loading={loading}
          rowKey={(c) => c.id}
          initialSort={{ key: "value", dir: "desc" }}
          columns={[
            { key: "name", header: "Category", primary: true, sortValue: (c) => c.name, cell: (c) => <span className="flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span> },
            { key: "count", header: "Entries", align: "right", sortValue: (c) => c.count, cell: (c) => c.count },
            { key: "max", header: "Largest", align: "right", sortValue: (c) => c.max, cell: (c) => money(c.max), hideOnMobile: true },
            { key: "share", header: "Share", sortValue: (c) => c.value, cell: (c) => <div className="flex min-w-[140px] items-center gap-2"><Progress value={d.total ? (c.value / d.total) * 100 : 0} className="h-1.5" /><span className="w-10 text-right text-xs tabular">{d.total ? Math.round((c.value / d.total) * 100) : 0}%</span></div> },
            { key: "value", header: "Total", align: "right", sortValue: (c) => c.value, cell: (c) => <span className="font-bold tabular">{money(c.value)}</span> },
          ]}
          footer={!loading && <div className="flex justify-between border-t bg-muted/40 px-4 py-3 text-sm font-semibold"><span>Total</span><span>{money(d.total)}</span></div>}
          exportConfig={{
            filename: `expense-report-${from}-to-${to}`,
            title: "Expense report",
            subtitle: `${fmtDate(from)} – ${fmtDate(to)}`,
            summary: [["Total", money(d.total)], ["Entries", String(d.ex.length)]],
            columns: [
              { header: "Category", value: (c) => c.name },
              { header: "Entries", value: (c) => c.count },
              { header: "Largest", value: (c) => c.max },
              { header: "Share %", value: (c) => (d.total ? Math.round((c.value / d.total) * 100) : 0) },
              { header: "Total", value: (c) => c.value },
            ],
          }}
          empty={{ title: "No expenses in this range" }}
        />
      </div>
    </div>
  );
}
