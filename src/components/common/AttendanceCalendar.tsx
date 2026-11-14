import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { toDateStr, today } from "@/utils/date";

/** Monthly attendance calendar. `present` = set of yyyy-MM-dd; `covered(d)` marks days inside a membership. */
export function AttendanceCalendar({ present, covered, times }: { present: Set<string>; covered?: (d: string) => boolean; times?: Map<string, string> }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });
  const t = today();
  const monthDays = days.filter((d) => isSameMonth(d, month) && toDateStr(d) <= t);
  const presentInMonth = monthDays.filter((d) => present.has(toDateStr(d))).length;
  const isCurrent = format(month, "yyyy-MM") === t.slice(0, 7);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="font-display text-xl font-bold uppercase tracking-wide">{format(month, "MMMM yyyy")}</div>
          <div className="text-xs text-muted-foreground">{presentInMonth} of {monthDays.length} days present</div>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month"><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, 1))} disabled={isCurrent} aria-label="Next month"><ChevronRight /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d.slice(0, 2)}</div>)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={format(month, "yyyy-MM")} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }} className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const ds = toDateStr(d);
            const inMonth = isSameMonth(d, month);
            const isPresent = present.has(ds);
            const future = ds > t;
            const absent = inMonth && !future && !isPresent && (!covered || covered(ds));
            return (
              <div
                key={ds}
                title={isPresent ? `Present${times?.get(ds) ? ` · ${times.get(ds)}` : ""}` : absent ? "Absent" : undefined}
                className={cn(
                  "relative grid aspect-square place-items-center rounded-lg text-[13px] font-medium transition-colors",
                  !inMonth && "opacity-0",
                  isPresent && "bg-lime font-bold text-lime-foreground",
                  absent && "bg-muted/60 text-muted-foreground",
                  future && "text-muted-foreground/40",
                  !isPresent && !absent && !future && "text-muted-foreground/60",
                  ds === t && "ring-2 ring-foreground/70 ring-offset-1 ring-offset-card",
                )}
              >
                {format(d, "d")}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-foreground/70" /> Today</span>
      </div>
    </div>
  );
}
