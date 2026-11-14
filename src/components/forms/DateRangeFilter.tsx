import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { Select } from "@/components/ui/overlays";
import { Input } from "@/components/ui/primitives";
import { rangeFor, type RangePreset } from "@/utils/date";
import type { DateStr } from "@/types";

export interface DateRange { from: DateStr; to: DateStr }

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export function useDateRange(initial: RangePreset = "30d") {
  const [preset, setPreset] = useState<RangePreset>(initial);
  const [range, setRange] = useState<DateRange>(() => rangeFor(initial));
  return { preset, range, setPreset, setRange };
}

export function DateRangeFilter({ preset, range, setPreset, setRange }: ReturnType<typeof useDateRange>) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div className="w-full sm:w-44">
        <Select
          aria-label="Date range"
          value={preset}
          onValueChange={(v) => {
            const p = v as RangePreset;
            setPreset(p);
            if (p !== "custom") setRange(rangeFor(p));
          }}
          options={PRESETS.map((p) => ({ value: p.value, label: <span className="flex items-center gap-2"><CalendarRange className="h-3.5 w-3.5 opacity-60" />{p.label}</span> }))}
        />
      </div>
      {preset === "custom" && (
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input type="date" aria-label="From date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} className="sm:w-[150px]" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" aria-label="To date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} className="sm:w-[150px]" />
        </div>
      )}
    </div>
  );
}
