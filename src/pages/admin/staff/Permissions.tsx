import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { staffService } from "@/services/gymService";
import { PERMISSIONS } from "@/services/mock/permissions";
import { EmptyState, PageHeader } from "@/components/common";
import { Avatar, Card } from "@/components/ui/primitives";
import { Switch } from "@/components/ui/overlays";
import { fadeUp, stagger } from "@/animations/motion";

export default function Permissions() {
  const { db } = useGym();
  const staff = db.staff.filter((s) => s.role === "receptionist");
  return (
    <div>
      <PageHeader title="Permissions" description="Control what each receptionist can do. Changes apply instantly — pages they can't access show an ‘Access restricted’ message." />
      <div className="mb-4 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        Receptionists never see business profit, expense reports, backups, gym settings, staff management or activity logs — those are owner-only regardless of these toggles.
      </div>
      {staff.length === 0 ? <Card><EmptyState title="No receptionists yet" /></Card> : (
        <>
          {/* Desktop matrix */}
          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                  {staff.map((s) => <th key={s.id} className="px-4 py-3"><div className="flex flex-col items-center gap-1.5"><Avatar name={s.name} src={s.photo} className="h-8 w-8" /><span className="text-xs font-semibold">{s.name}</span></div></th>)}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.key} className="border-b last:border-0">
                    <td className="px-4 py-3"><div className="font-semibold">{p.label}</div><div className="text-xs text-muted-foreground">{p.description}</div></td>
                    {staff.map((s) => (
                      <td key={s.id} className="px-4 py-3 text-center">
                        <Switch aria-label={`${p.label} for ${s.name}`} checked={s.permissions[p.key]} onCheckedChange={(v) => { staffService.setPermission(s.id, p.key, v); toast.success(`${p.label} ${v ? "enabled" : "disabled"} for ${s.name.split(" ")[0]}`); }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Mobile cards */}
          <motion.div variants={stagger} initial="initial" animate="enter" className="space-y-4 lg:hidden">
            {staff.map((s) => (
              <motion.div key={s.id} variants={fadeUp}>
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-3"><Avatar name={s.name} src={s.photo} /><div><div className="font-semibold">{s.name}</div><div className="text-xs text-muted-foreground">{s.email}</div></div></div>
                  <div className="divide-y">
                    {PERMISSIONS.map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-center justify-between gap-3 py-3">
                        <span><span className="block text-sm font-medium">{p.label}</span><span className="block text-xs text-muted-foreground">{p.description}</span></span>
                        <Switch checked={s.permissions[p.key]} onCheckedChange={(v) => { staffService.setPermission(s.id, p.key, v); toast.success(`${p.label} ${v ? "enabled" : "disabled"}`); }} />
                      </label>
                    ))}
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
