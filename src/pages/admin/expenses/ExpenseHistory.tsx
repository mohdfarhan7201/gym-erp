import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { expenseService } from "@/services/gymService";
import { sum } from "@/services/selectors";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/common";
import { DateRangeFilter, useDateRange } from "@/components/forms/DateRangeFilter";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, Select } from "@/components/ui/overlays";
import { fmtDate, methodLabel, money } from "@/utils/format";
import type { Expense } from "@/types";

export default function ExpenseHistory() {
  const { db, ix, loading } = useGym();
  const confirm = useConfirm();
  const dr = useDateRange("90d");
  const [cat, setCat] = useState("all");
  const [edit, setEdit] = useState<Expense | undefined>();
  const rows = useMemo(() => db.expenses.filter((e) => e.date >= dr.range.from && e.date <= dr.range.to && (cat === "all" || e.categoryId === cat)), [db.expenses, dr.range, cat]);
  const color = (id: string) => db.categories.find((c) => c.id === id)?.color ?? "#999";

  return (
    <div>
      <PageHeader title="Expense History" description="Every expense recorded, with edit and delete." actions={<><DateRangeFilter {...dr} /><Button asChild variant="lime"><Link to="/admin/expenses/new"><Plus /> Add expense</Link></Button></>} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="font-display text-2xl font-bold">{money(sum(rows, (e) => e.amount))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Entries</div><div className="font-display text-2xl font-bold">{rows.length}</div></Card>
        <Card className="col-span-2 p-4 sm:col-span-1"><div className="text-xs text-muted-foreground">Largest</div><div className="truncate font-display text-2xl font-bold">{rows.length ? money(Math.max(...rows.map((e) => e.amount))) : "—"}</div></Card>
      </div>
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(e) => e.id}
        initialSort={{ key: "date", dir: "desc" }}
        search={(e) => `${e.title} ${e.vendor ?? ""} ${ix.categoryName.get(e.categoryId)} ${e.note ?? ""}`}
        toolbar={<div className="w-full sm:w-48"><Select aria-label="Category" value={cat} onValueChange={setCat} options={[{ value: "all", label: "All categories" }, ...db.categories.map((c) => ({ value: c.id, label: c.name }))]} /></div>}
        columns={[
          { key: "title", header: "Expense", primary: true, sortValue: (e) => e.title, cell: (e) => <div className="min-w-0"><div className="truncate font-semibold">{e.title}</div><div className="truncate text-xs text-muted-foreground">{e.vendor ?? "—"}</div></div> },
          { key: "cat", header: "Category", sortValue: (e) => ix.categoryName.get(e.categoryId) ?? "", cell: (e) => <Badge variant="outline"><span className="h-2 w-2 rounded-full" style={{ background: color(e.categoryId) }} />{ix.categoryName.get(e.categoryId)}</Badge> },
          { key: "date", header: "Date", sortValue: (e) => e.date, cell: (e) => fmtDate(e.date) },
          { key: "method", header: "Paid via", cell: (e) => methodLabel[e.method], hideOnMobile: true },
          { key: "amount", header: "Amount", align: "right", sortValue: (e) => e.amount, cell: (e) => <span className="font-semibold tabular">{money(e.amount)}</span> },
        ]}
        actions={(e) => (
          <>
            <Button variant="ghost" size="icon-sm" aria-label="Edit expense" onClick={() => setEdit(e)}><Pencil /></Button>
            <Button variant="ghost" size="icon-sm" aria-label="Delete expense" onClick={async () => { if (await confirm({ title: "Delete expense?", description: `${e.title} · ${money(e.amount)}`, destructive: true, confirmText: "Delete" })) expenseService.remove(e.id).then(() => toast.success("Expense deleted")); }}><Trash2 /></Button>
          </>
        )}
        exportConfig={{
          filename: `expenses-${dr.range.from}-to-${dr.range.to}`,
          title: "Expense history",
          subtitle: `${fmtDate(dr.range.from)} – ${fmtDate(dr.range.to)}`,
          summary: [["Total", money(sum(rows, (e) => e.amount))], ["Entries", String(rows.length)]],
          columns: [
            { header: "Date", value: (e) => e.date },
            { header: "Title", value: (e) => e.title },
            { header: "Category", value: (e) => ix.categoryName.get(e.categoryId) ?? "" },
            { header: "Vendor", value: (e) => e.vendor ?? "" },
            { header: "Method", value: (e) => methodLabel[e.method] },
            { header: "Amount", value: (e) => e.amount },
          ],
        }}
        empty={{ title: "No expenses in range" }}
      />
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(undefined)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Edit expense</DialogTitle></DialogHeader>
          <DialogBody className="pb-5">{edit && <ExpenseForm key={edit.id} expense={edit} onDone={() => setEdit(undefined)} onCancel={() => setEdit(undefined)} />}</DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
