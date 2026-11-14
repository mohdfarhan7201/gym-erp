import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Cloud, DatabaseBackup, Download, HardDrive, History, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { backupService, type BackupMeta } from "@/services/gymService";
import { downloadText } from "@/services/exports/print";
import { EmptyState, PageHeader } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fadeUp, stagger } from "@/animations/motion";
import { fmtDateTime, number, timeAgo } from "@/utils/format";
import { today } from "@/utils/date";

export default function BackupRestore() {
  const { db } = useGym(0);
  const confirm = useConfirm();
  const [backups, setBackups] = useState<BackupMeta[]>(() => backupService.list());
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const size = new Blob([JSON.stringify(db)]).size;

  const simulate = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setProgress(8);
    const iv = setInterval(() => setProgress((p) => Math.min(92, p + 12)), 110);
    try {
      await fn();
      setProgress(100);
    } finally {
      clearInterval(iv);
      setTimeout(() => { setBusy(null); setProgress(0); }, 350);
    }
  };

  const create = () => simulate("create", async () => {
    try {
      await backupService.create(`Manual backup · ${fmtDateTime(new Date())}`);
      setBackups(backupService.list());
      toast.success("Backup created", { description: "Snapshot saved in this browser." });
    } catch (e) {
      toast.error((e as Error).message);
    }
  });

  return (
    <div>
      <PageHeader title="Backup & Restore" description="UI simulation — snapshots are stored in this browser's local storage, not on a server." />
      <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="relative bg-[#0E1116] p-6 text-white">
              <div className="bg-grid absolute inset-0 opacity-40" />
              <div className="relative flex flex-wrap items-center gap-5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-lime-foreground"><DatabaseBackup className="h-7 w-7" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xl font-bold uppercase">Database snapshot</div>
                  <div className="text-sm text-white/60">{number(db.members.length)} members · {number(db.payments.length)} payments · {number(db.attendance.length)} check-ins · {(size / 1024).toFixed(0)} KB</div>
                </div>
                <Button variant="lime" size="lg" onClick={create} loading={busy === "create"}>Create backup</Button>
              </div>
              {busy && <Progress value={progress} className="relative mt-5 h-1.5 bg-white/10" />}
            </div>
            <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
              <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={() => { downloadText(`pulsefit-backup-${today()}.json`, backupService.exportJson()); toast.success("Backup file downloaded"); }}><Download className="!h-5 !w-5" />Download JSON</Button>
              <Button variant="outline" className="h-auto flex-col gap-1.5 py-4" onClick={() => fileRef.current?.click()} loading={busy === "import"}><Upload className="!h-5 !w-5" />Restore from file</Button>
              <Button variant="outline" className="h-auto flex-col gap-1.5 py-4 text-danger hover:text-danger" onClick={async () => {
                if (await confirm({ title: "Reset demo data?", description: "All changes are discarded and the original sample gym data is restored. Your login stays active.", destructive: true, confirmText: "Reset data" }))
                  simulate("reset", () => backupService.resetDemo().then(() => toast.success("Demo data reset")));
              }}><RotateCcw className="!h-5 !w-5" />Reset demo data</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (!(await confirm({ title: "Restore from file?", description: `Current data will be replaced with ${f.name}.`, destructive: true, confirmText: "Restore" }))) return;
                const text = await f.text();
                simulate("import", () => backupService.importJson(text).then(() => toast.success("Data restored from file")).catch((err) => toast.error(err.message)));
              }} />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Card className="h-full">
            <CardHeader><div><CardTitle>Storage</CardTitle><CardDescription>Browser local storage (≈5 MB limit)</CardDescription></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3"><HardDrive className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><Progress value={(size / (5 * 1024 * 1024)) * 100} /><div className="mt-1 text-xs text-muted-foreground">{(size / 1024).toFixed(0)} KB used by live data</div></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"><Cloud className="h-5 w-5 shrink-0" />Cloud backup will be available once the backend is connected.</div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Card className="mt-4">
        <CardHeader><div><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Saved snapshots</CardTitle><CardDescription>The 2 most recent snapshots are kept.</CardDescription></div></CardHeader>
        <CardContent>
          {backups.length === 0 ? <EmptyState title="No snapshots yet" description="Create a backup to be able to roll back later." className="py-8" /> : (
            <ul className="divide-y">
              {backups.map((b) => (
                <li key={b.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold">{b.label}</div><div className="text-xs text-muted-foreground">{timeAgo(b.createdAt)} · {number(b.records)} records · {(b.size / 1024).toFixed(0)} KB</div></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" loading={busy === b.id} onClick={async () => { if (await confirm({ title: "Restore this snapshot?", description: "Current data will be replaced.", destructive: true, confirmText: "Restore" })) simulate(b.id, () => backupService.restore(b.id).then(() => toast.success("Snapshot restored")).catch((e) => toast.error(e.message))); }}><RotateCcw /> Restore</Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete snapshot" onClick={() => { backupService.removeBackup(b.id); setBackups(backupService.list()); toast.success("Snapshot deleted"); }}><Trash2 /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
