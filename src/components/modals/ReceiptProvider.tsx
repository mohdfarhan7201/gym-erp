import { createContext, useContext, useState, type ReactNode } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { useGym } from "@/hooks/useGym";
import type { GymSettings, Member, Payment } from "@/types";
import { fmtDate, fmtDateTime, methodLabel, money } from "@/utils/format";
import { msDue } from "@/services/selectors";
import { printElement } from "@/services/exports/print";

export function ReceiptView({ payment: p, member, gym, balance, planLine }: { payment: Payment; member: Member; gym: GymSettings; balance?: number; planLine?: string }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#111418", background: "#fff", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ background: "#0E1116", color: "#fff", padding: "18px 20px", borderBottom: "4px solid #C6F432", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 40 40" width="34" height="34"><rect width="40" height="40" rx="11" fill="#C6F432" /><g fill="#0B0D10"><rect x="7" y="14" width="4" height="12" rx="1.2" /><rect x="29" y="14" width="4" height="12" rx="1.2" /><rect x="11.5" y="11" width="4" height="18" rx="1.2" /><rect x="24.5" y="11" width="4" height="18" rx="1.2" /><rect x="15.5" y="18.3" width="9" height="3.4" rx=".8" /></g></svg>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', Inter, sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 1, lineHeight: 1 }}>{gym.name.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: "#aab0ba", marginTop: 3 }}>{gym.tagline}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#C6F432", fontWeight: 700, fontSize: 12, letterSpacing: 1.5 }}>RECEIPT</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{p.receiptNo}</div>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
          {gym.address}<br />{gym.phone} · {gym.email} · GSTIN {gym.gstin}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, padding: 14, border: "1px solid #e5e7eb", borderRadius: 10 }}>
          {[
            ["Received from", member.name],
            ["Member ID", member.code],
            ["Payment date", fmtDate(p.date)],
            ["Mode", `${methodLabel[p.method]}${p.reference ? ` · ${p.reference}` : ""}`],
          ].map(([k, v]) => (
            <div key={k} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, wordBreak: "break-word" }}>{v}</div>
            </div>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>DESCRIPTION</th>
              <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 11, color: "#6b7280" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "10px", borderBottom: "1px solid #e5e7eb" }}>
                {p.description}
                {planLine && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{planLine}</div>}
              </td>
              <td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>{money(p.amount)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 12 }}>
          <div style={{ border: "2px solid #16a34a", color: "#16a34a", borderRadius: 8, padding: "4px 12px", fontWeight: 800, letterSpacing: 2, transform: "rotate(-4deg)" }}>PAID</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Amount paid</div>
            <div style={{ fontFamily: "'Barlow Condensed', Inter, sans-serif", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{money(p.amount)}</div>
            {!!balance && <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600, marginTop: 4 }}>Balance due: {money(balance)}</div>}
          </div>
        </div>
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px dashed #d1d5db", fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
          Collected by {p.collectedBy} · {fmtDateTime(p.createdAt)}
          <br />
          {gym.receiptFooter}
        </div>
      </div>
    </div>
  );
}

const Ctx = createContext<{ open: (paymentId: string) => void } | null>(null);

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const { db, ix } = useGym(0);
  const p = id ? db.payments.find((x) => x.id === id) : undefined;
  const member = p ? ix.memberById.get(p.memberId) : undefined;
  const ms = p?.membershipId ? db.memberships.find((m) => m.id === p.membershipId) : undefined;
  const balance = ms ? msDue(ms, ix) : undefined;
  const planLine = ms ? `${ms.planName} · ${fmtDate(ms.startDate)} – ${fmtDate(ms.endDate)}` : undefined;

  const download = async () => {
    if (!p || !member) return;
    const { downloadReceiptPdf } = await import("@/services/exports/pdf");
    downloadReceiptPdf(p, member, db.settings, { balance, planLine });
    toast.success("Receipt downloaded", { description: `${p.receiptNo}.pdf` });
  };
  const print = () => p && member && printElement(<ReceiptView payment={p} member={member} gym={db.settings} balance={balance} planLine={planLine} />);

  return (
    <Ctx.Provider value={{ open: setId }}>
      {children}
      <Dialog open={!!p} onOpenChange={(o) => !o && setId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Receipt preview</DialogTitle>
            <DialogDescription>{p?.receiptNo} · {member?.name}</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-4">{p && member && <ReceiptView payment={p} member={member} gym={db.settings} balance={balance} planLine={planLine} />}</DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={print}><Printer /> Print</Button>
            <Button variant="lime" onClick={download}><Download /> Download PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useReceipt() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useReceipt outside ReceiptProvider");
  return c;
}
