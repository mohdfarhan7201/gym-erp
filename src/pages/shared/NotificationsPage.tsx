import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, Megaphone, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useAuth, usePanel } from "@/contexts/AuthContext";
import { notificationService } from "@/services/gymService";
import { EmptyState, Field, PageHeader, Pill } from "@/components/common";
import { Card, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Select } from "@/components/ui/overlays";
import { SegmentedControl } from "@/components/forms/PaymentMethodPicker";
import { fmtDateTime, timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { NotificationType } from "@/types";

const icon: Record<NotificationType, [typeof Info, string]> = {
  info: [Info, "bg-info/10 text-info"],
  success: [CheckCircle2, "bg-success/10 text-success"],
  warning: [AlertTriangle, "bg-warning/15 text-warning"],
  danger: [XCircle, "bg-danger/10 text-danger"],
};

function Broadcast() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [audience, setAudience] = useState<"members" | "staff" | "all">("members");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (title.trim().length < 3 || message.trim().length < 5) return toast.error("Add a title and a message");
    setBusy(true);
    await notificationService.broadcast({ title, message, type, audience });
    setBusy(false);
    toast.success("Announcement sent", { description: "Delivered as in-app notifications (no SMS/WhatsApp in demo)." });
    setOpen(false);
    setTitle("");
    setMessage("");
  };
  return (
    <>
      <Button variant="lime" onClick={() => setOpen(true)}><Megaphone /> Announcement</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New announcement</DialogTitle><DialogDescription>Sends an in-app notification to the selected audience.</DialogDescription></DialogHeader>
          <DialogBody className="space-y-4 pb-4">
            <Field label="Audience"><SegmentedControl value={audience} onChange={setAudience} options={[{ value: "members", label: "All members" }, { value: "staff", label: "Front desk" }, { value: "all", label: "Everyone" }]} /></Field>
            <Field label="Title" required htmlFor="bt"><Input id="bt" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gym closed on Sunday" /></Field>
            <Field label="Message" required htmlFor="bm"><Textarea id="bm" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
            <Field label="Type"><Select value={type} onValueChange={(v) => setType(v as NotificationType)} options={[{ value: "info", label: "Info" }, { value: "success", label: "Good news" }, { value: "warning", label: "Warning" }, { value: "danger", label: "Urgent" }]} /></Field>
          </DialogBody>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="lime" loading={busy} onClick={send}>Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function NotificationsPage() {
  const { db } = useGym();
  const { session } = useAuth();
  const { role, base, isAdmin } = usePanel();
  const nav = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const list = useMemo(() => notificationService.forUser(db, role, session?.userId), [db, role, session?.userId]);
  const shown = filter === "unread" ? list.filter((n) => !n.read) : list;
  const unread = list.filter((n) => !n.read);

  return (
    <div>
      <PageHeader title="Notifications" description={`${unread.length} unread of ${list.length}`} actions={<>
        {unread.length > 0 && <Button variant="outline" onClick={() => notificationService.markRead(unread.map((n) => n.id)).then(() => toast.success("All marked as read"))}><CheckCheck /> Mark all read</Button>}
        {isAdmin && <Broadcast />}
      </>} />
      <div className="mb-4 flex gap-1.5"><Pill active={filter === "all"} onClick={() => setFilter("all")}>All · {list.length}</Pill><Pill active={filter === "unread"} onClick={() => setFilter("unread")}>Unread · {unread.length}</Pill></div>
      <Card className="overflow-hidden">
        {shown.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" description="New alerts about payments, expiries and announcements appear here." /> : (
          <ul className="divide-y">
            <AnimatePresence initial={false}>
              {shown.map((n) => {
                const [I, cls] = icon[n.type];
                return (
                  <motion.li key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={cn("group flex items-start gap-3 p-4 transition-colors hover:bg-muted/40", !n.read && "bg-lime/[0.06]")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", cls)}><I className="h-5 w-5" /></span>
                    <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => { notificationService.markRead([n.id]); if (n.link) nav(`${base}/${n.link}`); }}>
                      <div className="flex items-center gap-2"><span className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</span>{!n.read && <span className="h-2 w-2 rounded-full bg-lime-ink" aria-label="unread" />}</div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground/80" title={fmtDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</p>
                    </button>
                    <div className="flex shrink-0 gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      {!n.read && <Button variant="ghost" size="icon-sm" aria-label="Mark read" onClick={() => notificationService.markRead([n.id])}><CheckCheck /></Button>}
                      <Button variant="ghost" size="icon-sm" aria-label="Delete notification" onClick={() => notificationService.remove(n.id)}><Trash2 /></Button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}
