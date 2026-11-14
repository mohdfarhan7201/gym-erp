import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { GymSettings, Member, Payment } from "@/types";
import { fmtDate, fmtDateTime, methodLabel, moneyPdf } from "@/utils/format";
import type { ExportColumn } from "./excel";

const INK: [number, number, number] = [17, 20, 24];
const LIME: [number, number, number] = [198, 244, 50];
const GREY: [number, number, number] = [107, 114, 128];

function brandHeader(doc: jsPDF, gym: GymSettings, title: string, subtitle?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...INK);
  doc.rect(0, 0, w, 26, "F");
  doc.setFillColor(...LIME);
  doc.rect(0, 26, w, 1.4, "F");
  doc.roundedRect(12, 7, 12, 12, 2.5, 2.5, "F");
  doc.setFillColor(...INK);
  doc.rect(14.6, 11.6, 6.8, 2.8, "F");
  doc.rect(14.6, 9.6, 1.6, 6.8, "F");
  doc.rect(19.8, 9.6, 1.6, 6.8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(gym.name.toUpperCase(), 28, 13.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(190, 196, 205);
  doc.text(gym.tagline, 28, 18.5);
  doc.setTextColor(...LIME);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), w - 12, 13.5, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(190, 196, 205);
    doc.text(subtitle, w - 12, 18.5, { align: "right" });
  }
}

const pdfSafe = (s: string) => s.replace(/₹/g, "Rs. ").replace(/[–—]/g, "-").replace(/→/g, "->");

export function exportReportPdf<T>(opts: {
  filename: string; title: string; subtitle?: string; gym: GymSettings; columns: ExportColumn<T>[]; rows: T[]; summary?: [string, string][];
}) {
  const landscape = opts.columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
  brandHeader(doc, opts.gym, opts.title, opts.subtitle);
  let y = 35;
  if (opts.summary?.length) {
    opts.summary.forEach(([k, v], i) => {
      const x = 12 + (i % 4) * 46;
      if (i && i % 4 === 0) y += 12;
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.setFont("helvetica", "normal");
      doc.text(pdfSafe(k), x, y);
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.setFont("helvetica", "bold");
      doc.text(pdfSafe(v), x, y + 5);
    });
    y += 11;
  }
  autoTable(doc, {
    startY: y,
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((r) => opts.columns.map((c) => pdfSafe(String(c.value(r))))),
    styles: { fontSize: 8, cellPadding: 2.2, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    margin: { left: 12, right: 12 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      doc.text(`Generated ${fmtDateTime(new Date())} - Page ${doc.getNumberOfPages()}`, 12, h - 6);
    },
  });
  doc.save(`${opts.filename}.pdf`);
}

export function buildReceiptPdf(p: Payment, member: Member, gym: GymSettings, extra?: { balance?: number; planLine?: string }) {
  const doc = new jsPDF({ unit: "mm", format: "a5" });
  const w = doc.internal.pageSize.getWidth();
  brandHeader(doc, gym, "Payment Receipt", p.receiptNo);
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "normal");
  doc.text([gym.address, `${gym.phone}  |  ${gym.email}`, `GSTIN: ${gym.gstin}`], 12, 34);

  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(12, 48, w - 24, 26, 2, 2, "S");
  const field = (label: string, value: string, x: number, y: number) => {
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(value), x, y + 5);
  };
  field("Received from", member.name, 16, 55);
  field("Member ID", member.code, w / 2 + 4, 55);
  field("Date", fmtDate(p.date), 16, 66);
  field("Payment mode", `${methodLabel[p.method]}${p.reference ? " - " + p.reference : ""}`, w / 2 + 4, 66);

  autoTable(doc, {
    startY: 80,
    head: [["Description", "Amount"]],
    body: [[pdfSafe(p.description + (extra?.planLine ? `\n${extra.planLine}` : "")), moneyPdf(p.amount)]],
    styles: { fontSize: 9, cellPadding: 3, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255] },
    columnStyles: { 1: { halign: "right", cellWidth: 34 } },
    margin: { left: 12, right: 12 },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFillColor(246, 247, 249);
  doc.roundedRect(w - 12 - 70, y, 70, extra?.balance ? 20 : 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.setFont("helvetica", "normal");
  doc.text("Amount paid", w - 78, y + 7.5);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.text(moneyPdf(p.amount), w - 16, y + 7.5, { align: "right" });
  if (extra?.balance) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(185, 28, 28);
    doc.text("Balance due", w - 78, y + 15);
    doc.text(moneyPdf(extra.balance), w - 16, y + 15, { align: "right" });
  }
  doc.setDrawColor(22, 163, 74);
  doc.setTextColor(22, 163, 74);
  doc.setLineWidth(0.8);
  doc.roundedRect(16, y + 1, 26, 11, 2, 2, "S");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PAID", 29, y + 8.6, { align: "center" });

  y += 34;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GREY);
  doc.text(`Collected by ${p.collectedBy} - ${fmtDateTime(p.createdAt)}`, 12, y);
  doc.text(doc.splitTextToSize(pdfSafe(gym.receiptFooter), w - 24), 12, y + 6);
  doc.setFontSize(7);
  doc.text("This is a computer-generated receipt and does not require a signature.", w / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  return doc;
}

export function downloadReceiptPdf(...args: Parameters<typeof buildReceiptPdf>) {
  buildReceiptPdf(...args).save(`${args[0].receiptNo}.pdf`);
}
