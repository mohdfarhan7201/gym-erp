import { Link } from "react-router-dom";
import { useMemo } from "react";
import { format } from "date-fns";
import { useGym } from "@/hooks/useGym";
import { PageHeader } from "@/components/common";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { fmtShortDate, money } from "@/utils/format";
import { sum } from "@/services/selectors";

export default function AddExpense() {
  const { db, ix } = useGym(0);
  const month = format(new Date(), "yyyy-MM");
  const recent = useMemo(() => [...db.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [db.expenses]);
  const monthTotal = sum(db.expenses.filter((e) => e.date.startsWith(month)), (e) => e.amount);
  return (
    <div>
      <PageHeader title="Add Expense" description="Record rent, bills, salaries, equipment and other outgoings." crumbs={[{ label: "Expenses", to: "/admin/expenses" }, { label: "Add" }]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card><CardContent className="pt-5"><ExpenseForm /></CardContent></Card>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-[#0E1116] p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-white/50">Spent this month</div>
              <div className="font-display text-4xl font-extrabold text-lime">{money(monthTotal)}</div>
            </div>
          </Card>
          <Card>
            <CardHeader className="items-center"><CardTitle>Recently added</CardTitle><Link to="/admin/expenses/history" className="text-xs font-semibold text-muted-foreground hover:text-foreground">View all</Link></CardHeader>
            <CardContent>
              <ul className="divide-y">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0"><div className="truncate font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{ix.categoryName.get(e.categoryId)} · {fmtShortDate(e.date)}</div></div>
                    <span className="shrink-0 font-semibold">{money(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
