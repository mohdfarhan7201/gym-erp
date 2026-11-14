import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, KeyRound, Mail, MoreHorizontal, Pencil, Phone, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { staffService } from "@/services/gymService";
import { PageHeader } from "@/components/common";
import { StaffForm } from "@/components/forms/StaffForm";
import { Avatar, Badge, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { fadeUp, stagger } from "@/animations/motion";
import { fmtDate } from "@/utils/format";
import { today } from "@/utils/date";
import type { Staff } from "@/types";

export default function StaffList() {
  const { db } = useGym();
  const confirm = useConfirm();
  const [edit, setEdit] = useState<Staff | undefined>();
  const t = today();
  const activity = (s: Staff) => ({
    checkins: db.attendance.filter((a) => a.markedBy === s.name && a.date === t).length,
    payments: db.payments.filter((p) => p.collectedBy === s.name && p.date === t).length,
  });

  return (
    <div>
      <PageHeader title="Staff" description="Owner and front-desk accounts. Receptionists sign in to the Front Desk panel." actions={<Button asChild variant="lime"><Link to="/admin/staff/new"><Plus /> Add receptionist</Link></Button>} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.staff.map((s) => {
          const a = activity(s);
          return (
            <motion.div key={s.id} variants={fadeUp}>
              <Card className="relative p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} src={s.photo} className="h-12 w-12" ring={s.role === "admin"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold">{s.name}</span>{s.role === "admin" ? <Badge variant="lime"><Crown className="h-3 w-3" /> Owner</Badge> : <Badge variant="info">Receptionist</Badge>}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{s.shift} · since {fmtDate(s.joinedAt)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Actions for ${s.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEdit(s)}><Pencil /> Edit</DropdownMenuItem>
                      {s.role !== "admin" && <DropdownMenuItem asChild><Link to="/admin/staff/permissions"><KeyRound /> Permissions</Link></DropdownMenuItem>}
                      {s.role !== "admin" && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => staffService.setActive(s.id, !s.active).then(() => toast.success(s.active ? "Staff deactivated" : "Staff activated"))}><Power /> {s.active ? "Deactivate" : "Activate"}</DropdownMenuItem>
                        <DropdownMenuItem destructive onSelect={async () => { if (await confirm({ title: `Delete ${s.name}?`, description: "They will lose access immediately. Past records keep their name.", destructive: true, confirmText: "Delete" })) staffService.remove(s.id).then(() => toast.success("Staff deleted")).catch((e) => toast.error(e.message)); }}><Trash2 /> Delete</DropdownMenuItem>
                      </>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate">{s.email}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{s.phone}</div>
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-muted/50 py-2.5 text-center">
                  <div><div className="font-display text-lg font-bold">{a.checkins}</div><div className="text-[11px] text-muted-foreground">Check-ins today</div></div>
                  <div><div className="font-display text-lg font-bold">{a.payments}</div><div className="text-[11px] text-muted-foreground">Receipts today</div></div>
                  <div className="grid place-items-center">{s.active ? <Badge variant="success" dot>Active</Badge> : <Badge dot>Inactive</Badge>}</div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(undefined)}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>Edit staff</DialogTitle></DialogHeader>
          <DialogBody className="pb-5">{edit && <StaffForm key={edit.id} staff={edit} onDone={() => setEdit(undefined)} onCancel={() => setEdit(undefined)} />}</DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
