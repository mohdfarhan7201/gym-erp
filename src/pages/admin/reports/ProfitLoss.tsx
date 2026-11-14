import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { IndianRupee, Percent, PiggyBank, Wallet } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { PageHeader, StatCard } from "@/components/common";
import { ChartCard, IncomeExpenseChart } from "@/components/charts";
import { DataTable } from "@/components/tables/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Select } from "@/components/ui/overlays";
import { stagger } from "@/animations/motion";
import { monthlyPL } from "@/utils/analytics";
import { money } from "@/utils/format";
import { sum } from "@/services/selectors";
import { cn } from "@/utils/cn";

export default function ProfitLoss() {
  const { db, loading } = useGym();
  const [months, setMonths] = useState("6");
  const [focus, setFocus] = useState(format(new Date(), "yyyy-MM"));
  const data = useMemo(() => monthlyPL(db, Number(months)).map((r) => ({ ...r, margin: r.income ? (r.profit / r.income) * 100 : 0, monthName: format(new Date(r.key + "-01"), "MMMM yyyy") })), [db, months]);
  const income = sum(data, (r) => r.income);
  const expense = sum(data, (r) => r.expense);

  const statement = useMemo(() => {
    const ps = db.payments.filter((p) => p.date.startsWith(focus));
    const ex = db.expenses.filter((e) => e.date.startsWith(focus));
    const inc = [
      ["Membership fees", sum(ps.filter((p) => p.kind === "membership"), (p) => p.amount)],
      ["Extra charges & fines", sum(ps.filter((p) => p.kind === "extra_charge"), (p) => p.amount)],
      ["Other income", sum(ps.filter((p) => p.kind === "other"), (p) => p.amount)],
    ] as [string, number][];
    const exp = db.categories.map((c) => [c.name, sum(ex.filter((e) => e.categoryId === c.id), (e) => e.amount)] as [string, number]).filter(([, v]) => v > 0);
    const ti = sum(inc, ([, v]) => v);
    const te = sum(exp, ([, v]) => v);
    return { inc, exp, ti, te, net: ti - te };
  }, [db, focus]);

  const monthOptions = Array.from({ length: 12 }, (_, i) => format(subMonths(new Date(), i), "yyyy-MM")).map((k) => ({ value: k, label: format(new Date(k + "-01"), "MMMM yyyy") }));

  return (
    <div>
      <PageHeader title="Profit & Loss" description="Income from collections minus recorded expenses."
        actions={<div className="w-40"><Select aria-label="Period" value={months} onValueChange={setMonths} options={[{ value: "3", label: "Last 3 months" }, { value: "6", label: "Last 6 months" }, { value: "12", label: "Last 12 months" }]} /></div>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard featured label="Net profit" value={income - expense} format={money} icon={PiggyBank} hint={`last ${months} months`} />
        <StatCard label="Income" value={income} format={money} icon={IndianRupee} tone="success" />
        <StatCard label="Expenses" value={expense} format={money} icon={Wallet} tone="warning" />
        <StatCard label="Profit margin" value={income ? ((income - expense) / income) * 100 : 0} format={(n) => `${n.toFixed(1)}%`} icon={Percent} tone="info" />
      </motion.div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartCard title="Income vs expense" description="Bars: income & expense · line: profit" loading={loading} height={300}><IncomeExpenseChart data={data} /></ChartCard>
        <Card>
          <CardHeader className="items-center">
            <CardTitle>Statement</CardTitle>
            <div className="w-40"><Select aria-label="Statement month" value={focus} onValueChange={setFocus} options={monthOptions} /></div>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Income</div>
            {statement.inc.map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><span>{k}</span><span className="tabular">{money(v)}</span></div>)}
            <div className="flex justify-between border-t py-2 font-semibold"><span>Total income</span><span className="tabular text-success">{money(statement.ti)}</span></div>
            <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expenses</div>
            {statement.exp.length === 0 && <div className="py-1.5 text-muted-foreground">No expenses</div>}
            {statement.exp.map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><span>{k}</span><span className="tabular">{money(v)}</span></div>)}
            <div className="flex justify-between border-t py-2 font-semibold"><span>Total expenses</span><span className="tabular text-danger">{money(statement.te)}</span></div>
            <div className={cn("mt-3 flex items-center justify-between rounded-xl p-3 font-display text-xl font-bold uppercase", statement.net >= 0 ? "bg-lime text-lime-foreground" : "bg-danger/10 text-danger")}>
              <span>Net {statement.net >= 0 ? "profit" : "loss"}</span><span className="tabular">{money(statement.net)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4">
        <DataTable
          rows={[...data].reverse()}
          loading={loading}
          rowKey={(r) => r.key}
          columns={[
            { key: "m", header: "Month", primary: true, sortValue: (r) => r.key, cell: (r) => <span className="font-semibold">{r.monthName}</span> },
            { key: "i", header: "Income", align: "right", sortValue: (r) => r.income, cell: (r) => <span className="text-success tabular">{money(r.income)}</span> },
            { key: "e", header: "Expense", align: "right", sortValue: (r) => r.expense, cell: (r) => <span className="tabular">{money(r.expense)}</span> },
            { key: "p", header: "Profit", align: "right", sortValue: (r) => r.profit, cell: (r) => <span className={cn("font-bold tabular", r.profit < 0 && "text-danger")}>{money(r.profit)}</span> },
            { key: "mg", header: "Margin", align: "right", sortValue: (r) => r.margin, cell: (r) => `${r.margin.toFixed(1)}%` },
          ]}
          footer={<div className="grid grid-cols-2 gap-2 border-t bg-muted/40 px-4 py-3 text-sm font-semibold sm:flex sm:justify-between"><span>Total</span><span className="text-right">{money(income)} − {money(expense)} = {money(income - expense)}</span></div>}
          exportConfig={{
            filename: `profit-loss-${months}m`,
            title: "Profit & loss",
            subtitle: `Last ${months} months`,
            summary: [["Income", money(income)], ["Expense", money(expense)], ["Net", money(income - expense)]],
            columns: [
              { header: "Month", value: (r) => r.monthName },
              { header: "Income", value: (r) => r.income },
              { header: "Expense", value: (r) => r.expense },
              { header: "Profit", value: (r) => r.profit },
              { header: "Margin %", value: (r) => r.margin.toFixed(1) },
            ],
          }}
        />
      </div>
    </div>
  );
}
