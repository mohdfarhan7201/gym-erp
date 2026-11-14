import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { useMyAccount } from "@/hooks/useMyAccount";
import { memberPortalService } from "@/services/gymService";
import { Field, PageHeader } from "@/components/common";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";

const FAQ = [
  ["How do I renew my membership?", "Open My Membership → Renew membership, pick a plan and send the request. The front desk confirms it and collects payment by cash or UPI."],
  ["Can I freeze my membership?", "Half-yearly and annual plans include a freeze period. Ask the front desk to apply it — you'll need to give at least a day's notice."],
  ["Where do I get my payment receipt?", "Every payment has a receipt under My Receipts. You can view, download it as a PDF or print it."],
  ["Why is there an extra charge on my account?", "Extra charges are added for damage, lost keys/cards or late fees. See Extra Charges for details; contact us if you think it's a mistake."],
  ["What are the gym timings?", "Check the timings card on this page. Holiday timings are announced in Notifications."],
];

const schema = z.object({ subject: z.string().trim().min(4, "Add a subject"), category: z.string().min(1), message: z.string().trim().min(10, "Tell us a bit more (10+ characters)") });
type Form = z.infer<typeof schema>;

export default function HelpSupport() {
  const { acc } = useMyAccount();
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { subject: "", category: "Membership", message: "" } });
  if (!acc) return null;
  const g = acc.gym;
  const submit = async (f: Form) => {
    await memberPortalService.createTicket(acc.member.id, f);
    toast.success("Message sent", { description: "The gym team will get back to you soon." });
    reset({ subject: "", category: f.category, message: "" });
  };
  return (
    <div>
      <PageHeader title="Help & Support" description="Answers to common questions, or send a message to the gym." />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Frequently asked</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {FAQ.map(([q, a], i) => (
                <div key={q} className="rounded-xl border">
                  <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i} className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left text-sm font-semibold">
                    {q}<ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", openIdx === i && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openIdx === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p></motion.div>}
                  </AnimatePresence>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Send us a message</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <Field label="Subject" error={errors.subject?.message} htmlFor="ss"><Input id="ss" {...register("subject")} /></Field>
                  <Field label="Topic"><Controller control={control} name="category" render={({ field }) => <Select value={field.value} onValueChange={field.onChange} options={["Membership", "Payments", "Equipment", "Trainer", "Other"].map((c) => ({ value: c, label: c }))} />} /></Field>
                </div>
                <Field label="Message" error={errors.message?.message} htmlFor="sm"><Textarea id="sm" rows={4} {...register("message")} /></Field>
                <div className="flex justify-end"><Button type="submit" variant="lime" loading={isSubmitting}><Send /> Send message</Button></div>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-[#0E1116] p-5 text-white">
              <div className="font-display text-2xl font-bold uppercase">{g.name}</div>
              <div className="text-sm text-white/60">{g.tagline}</div>
            </div>
            <CardContent className="space-y-3 pt-4 text-sm">
              <a href={`tel:${g.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 hover:underline"><Phone className="h-4 w-4 text-muted-foreground" />{g.phone}</a>
              <a href={`mailto:${g.email}`} className="flex items-center gap-3 hover:underline"><Mail className="h-4 w-4 text-muted-foreground" />{g.email}</a>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{g.address}</div>
              <div className="flex items-center gap-3"><Clock className="h-4 w-4 text-muted-foreground" />Open {g.openTime} – {g.closeTime}, Mon–Sun</div>
              <Button variant="outline" className="w-full" onClick={() => toast.info("WhatsApp chat will be available once the integration is live.")}><MessageCircle /> Chat on WhatsApp</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>My requests</CardTitle></CardHeader>
            <CardContent>
              {acc.tickets.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No messages sent yet.</p> : (
                <ul className="divide-y">
                  {acc.tickets.map((t) => (
                    <li key={t.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{t.subject}</span><Badge variant={t.status === "open" ? "warning" : "success"}>{t.status}</Badge></div>
                      <div className="text-xs text-muted-foreground">{t.category} · {timeAgo(t.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
