import { format, parseISO, formatDistanceToNowStrict } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN");

export const money = (n: number) => inr.format(Math.round(n || 0));
/** Plain "Rs." form for PDF fonts that lack the rupee glyph */
export const moneyPdf = (n: number) => "Rs. " + num.format(Math.round(n || 0));
export const number = (n: number) => num.format(n || 0);
export const compactMoney = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

const toDate = (d: string | Date) => (typeof d === "string" ? parseISO(d) : d);
export const fmtDate = (d?: string | Date | null) => (d ? format(toDate(d), "dd MMM yyyy") : "—");
export const fmtShortDate = (d?: string | Date | null) => (d ? format(toDate(d), "dd MMM") : "—");
export const fmtTime = (d?: string | Date | null) => (d ? format(toDate(d), "hh:mm a") : "—");
export const fmtDateTime = (d?: string | Date | null) => (d ? format(toDate(d), "dd MMM yyyy, hh:mm a") : "—");
export const timeAgo = (d: string | Date) => formatDistanceToNowStrict(toDate(d), { addSuffix: true });

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export const methodLabel: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank Transfer" };
