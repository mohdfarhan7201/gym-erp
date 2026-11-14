import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { expenseService } from "@/services/gymService";
import { sum } from "@/services/selectors";
import { Field, PageHeader } from "@/components/common";
import { Badge, Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { fadeUp, stagger } from "@/animations/motion";
import { money } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ExpenseCategory } from "@/types";

const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6", "#84CC16", "#F97316"];

export default function ExpenseCategories() {
  const { db } = useGym();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<ExpenseCategory | undefined>();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const start = (c?: ExpenseCategory) => {
    setEdit(c);
    setName(c?.name ?? "");
    setColor(c?.color ?? COLORS[db.categories.length % COLORS.length]);
    setOpen(true);
  };
  const save = async () => {
    if (name.trim().length < 2) return toast.error("Category name is too short");
    setBusy(true);
    try {
      await expenseService.saveCategory({ id: edit?.id, name: name.trim(), color });
      toast.success(edit ? "Category updated" : "Category added");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Expense Categories" description="Organise spending. Default categories can be renamed but not deleted." actions={<Button variant="lime" onClick={() => start()}><Plus /> New category</Button>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {db.categories.map((c) => {
          const items = db.expenses.filter((e) => e.categoryId === c.id);
          return (
            <motion.div key={c.id} variants={fadeUp}>
              <Card className="flex items-center gap-4 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate font-semibold">{c.name}</span>{c.isDefault && <Badge variant="outline">Default</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{items.length} entries · {money(sum(items, (e) => e.amount))}</div>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => start(c)}><Pencil /></Button>
                {!c.isDefault && <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} onClick={async () => { if (await confirm({ title: `Delete ${c.name}?`, description: "Its expenses will move to the “Other” category.", destructive: true, confirmText: "Delete" })) expenseService.removeCategory(c.id).then(() => toast.success("Category deleted")).catch((e) => toast.error(e.message)); }}><Trash2 /></Button>}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{edit ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4 pb-4">
            <Field label="Name" required htmlFor="cn"><Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing" onKeyDown={(e) => e.key === "Enter" && save()} /></Field>
            <Field label="Colour">
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn("h-9 w-9 cursor-pointer rounded-full transition", color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-card")} style={{ background: c }} />)}
              </div>
            </Field>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="lime" loading={busy} onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
