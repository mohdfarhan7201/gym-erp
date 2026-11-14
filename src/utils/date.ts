import { addMonths, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import type { DateStr } from "@/types";

export const toDateStr = (d: Date): DateStr => format(d, "yyyy-MM-dd");
/** Gym day = local calendar date */
export const today = (): DateStr => toDateStr(new Date());
export const daysAgo = (n: number): DateStr => toDateStr(subDays(new Date(), n));
export const parse = (d: DateStr) => parseISO(d);

/** Membership end date: start + N months - 1 day (inclusive) */
export const calcEndDate = (start: DateStr, months: number): DateStr =>
  toDateStr(subDays(addMonths(parseISO(start), months), 1));

export const daysBetween = (from: DateStr, to: DateStr) => differenceInCalendarDays(parseISO(to), parseISO(from));
export const daysLeft = (end: DateStr) => differenceInCalendarDays(parseISO(end), parseISO(today()));
export const monthKey = (d: DateStr) => d.slice(0, 7);
export const inRange = (d: DateStr, from?: DateStr, to?: DateStr) => (!from || d >= from) && (!to || d <= to);

export type RangePreset = "today" | "7d" | "30d" | "month" | "lastMonth" | "90d" | "year" | "custom";
export const rangeFor = (p: RangePreset): { from: DateStr; to: DateStr } => {
  const now = new Date();
  const t = toDateStr(now);
  switch (p) {
    case "today":
      return { from: t, to: t };
    case "7d":
      return { from: daysAgo(6), to: t };
    case "30d":
      return { from: daysAgo(29), to: t };
    case "90d":
      return { from: daysAgo(89), to: t };
    case "month":
      return { from: format(now, "yyyy-MM-01"), to: t };
    case "lastMonth": {
      const lm = addMonths(now, -1);
      const first = format(lm, "yyyy-MM-01");
      return { from: first, to: toDateStr(subDays(addMonths(parseISO(first), 1), 1)) };
    }
    case "year":
      return { from: format(now, "yyyy-01-01"), to: t };
    default:
      return { from: daysAgo(29), to: t };
  }
};
