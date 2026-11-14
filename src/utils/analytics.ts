import { addDays, differenceInCalendarDays, format, parseISO, subMonths } from "date-fns";
import type { DB } from "@/types";
import { toDateStr } from "./date";

export type Granularity = "day" | "month";

/** Bucket items into day or month series between two dates (auto-switches to monthly for long ranges). */
export function bucketSeries<T>(from: string, to: string, items: T[], dateOf: (x: T) => string, valueOf: (x: T) => number = () => 1) {
  const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const g: Granularity = span > 62 ? "month" : "day";
  const keyOf = (d: string) => (g === "day" ? d : d.slice(0, 7));
  const map = new Map<string, number>();
  for (const it of items) {
    const d = dateOf(it);
    if (d < from || d > to) continue;
    map.set(keyOf(d), (map.get(keyOf(d)) ?? 0) + valueOf(it));
  }
  const out: { key: string; label: string; value: number }[] = [];
  if (g === "day") {
    for (let i = 0; i < span; i++) {
      const d = toDateStr(addDays(parseISO(from), i));
      out.push({ key: d, label: format(parseISO(d), span > 14 ? "dd MMM" : "EEE dd"), value: map.get(d) ?? 0 });
    }
  } else {
    let cur = parseISO(from.slice(0, 7) + "-01");
    const end = to.slice(0, 7);
    while (format(cur, "yyyy-MM") <= end) {
      const k = format(cur, "yyyy-MM");
      out.push({ key: k, label: format(cur, "MMM yy"), value: map.get(k) ?? 0 });
      cur = parseISO(format(addDays(cur, 32), "yyyy-MM") + "-01");
    }
  }
  return { granularity: g, series: out };
}

/** Last N months income vs expense vs profit. */
export function monthlyPL(db: DB, months = 6, endDate = new Date()) {
  const out: { key: string; label: string; income: number; expense: number; profit: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(endDate, i);
    const k = format(d, "yyyy-MM");
    const income = db.payments.filter((p) => p.date.startsWith(k)).reduce((s, p) => s + p.amount, 0);
    const expense = db.expenses.filter((e) => e.date.startsWith(k)).reduce((s, e) => s + e.amount, 0);
    out.push({ key: k, label: format(d, "MMM"), income, expense, profit: income - expense });
  }
  return out;
}

export const pctChange = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100);
