import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { CalendarRange, Plus, Receipt, TrendingDown, Wallet } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, StatCard } from "@/components/common";
import { BarsChart, ChartCard, DonutChart, IncomeExpenseChart } from "@/components/charts";
import { ListCard } from "@/components/dashboard/Widgets";
import { Button } from "@/components/ui/button";
import { stagger } from "@/animations/motion";
import { monthlyPL, pctChange } from "@/utils/analytics";
import { fmtShortDate, money } from "@/utils/format";
import { sum } from "@/services/selectors";

export default function ExpenseDashboard() {
  const { db, ix, loading } = useGym();
  const month = format(new Date(), "yyyy-MM");
  const last = format(subMonths(new Date(), 1), "yyyy-MM");
  const d = useMemo(() => {
    const cur = db.expenses.filter((e) => e.date.startsWith(month));
    const prev = db.expenses.filter((e) => e.date.startsWith(last));
    const byCat = db.categories.map((c) => ({ name: c.name, color: c.color, value: sum(cur, (e) => (e.categoryId === c.id ? e.amount : 0)) })).filter((x) => x.value > 0);
    const monthly = monthlyPL(db, 12).map((m) => ({ label: m.label, value: m.expense }));
    const year = sum(db.expenses.filter((e) => e.date.startsWith(String(new Date().getFullYear()))), (e) => e.amount);
    return { cur: sum(cur, (e) => e.amount), prev: sum(prev, (e) => e.amount), byCat, monthly, year, count: cur.length };
  }, [db, month, last]);
  const pl = useMemo(() => monthlyPL(db, 6), [db]);
  const recent = [...db.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  return (
    <div>
      <PageHeader title="Expense Dashboard" description="Where the money goes — by month and category." actions={<Button asChild variant="lime"><Link to="/admin/expenses/new"><Plus /> Add expense</Link></Button>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="This month" value={d.cur} format={money} icon={Wallet} trend={pctChange(d.cur, d.prev)} hint="vs last month" />
        <StatCard label="Last month" value={d.prev} format={money} icon={CalendarRange} tone="info" />
        <StatCard label="Year to date" value={d.year} format={money} icon={TrendingDown} tone="warning" />
        <StatCard label="Entries this month" value={d.count} icon={Receipt} />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Monthly expenses" description="Last 12 months" loading={loading}><BarsChart data={d.monthly} isMoney name="Expenses" /></ChartCard>
        <ChartCard title="By category" description={format(new Date(), "MMMM yyyy")} loading={loading}>{d.byCat.length ? <DonutChart data={d.byCat} /> : <div className="grid h-full place-items-center text-sm text-muted-foreground">No expenses this month</div>}</ChartCard>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Income vs expense" description="Last 6 months" loading={loading}><IncomeExpenseChart data={pl} /></ChartCard>
        <motion.div variants={stagger} initial="initial" animate="enter">
          <ListCard title="Recent expenses" to="/admin/expenses/history" loading={loading}>
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: db.categories.find((c) => c.id === e.categoryId)?.color }} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{e.title}</div><div className="text-xs text-muted-foreground">{ix.categoryName.get(e.categoryId)} · {fmtShortDate(e.date)}</div></div>
                <span className="font-semibold tabular">{money(e.amount)}</span>
              </li>
            ))}
          </ListCard>
        </motion.div>
      </div>
    </div>
  );
}
