import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useGym } from "@/hooks/useGym";
import { Avatar, Input } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/common";
import { cn } from "@/utils/cn";
import type { Member } from "@/types";
import { money } from "@/utils/format";
import { totalDue } from "@/services/selectors";

export function useMemberSearch(q: string, limit = 8, filter?: (m: Member) => boolean) {
  const { db } = useGym(0);
  return useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return db.members
      .filter((m) => (!filter || filter(m)) && (m.name.toLowerCase().includes(s) || m.code.toLowerCase().includes(s) || m.phone.includes(s)))
      .slice(0, limit);
  }, [db.members, q, limit, filter]);
}

export function MemberPicker({ value, onChange, invalid, autoFocus, placeholder = "Search by name, member ID or mobile…" }: { value?: string; onChange: (id: string | undefined) => void; invalid?: boolean; autoFocus?: boolean; placeholder?: string }) {
  const { ix } = useGym(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const results = useMemberSearch(q);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = value ? ix.memberById.get(value) : undefined;

  if (selected) {
    const due = totalDue(selected.id, ix);
    const ms = ix.latestMs.get(selected.id);
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <Avatar name={selected.name} src={selected.photo} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{selected.name}</span>
            <StatusBadge status={ix.status.get(selected.id)!} />
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {selected.code} · {selected.phone}
            {ms && ` · ${ms.planName} till ${ms.endDate}`}
            {due > 0 && <span className="font-semibold text-danger"> · Due {money(due)}</span>}
          </div>
        </div>
        <button type="button" onClick={() => { onChange(undefined); setQ(""); setTimeout(() => inputRef.current?.focus(), 0); }} className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Change member">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const pick = (m: Member) => {
    onChange(m.id);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={q}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-autocomplete="list"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          if (e.key === "Enter" && results[hi]) { e.preventDefault(); pick(results[hi]); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="h-11 pl-9"
      />
      <AnimatePresence>
        {open && q && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute z-40 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lift scrollbar-thin"
          >
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No members match “{q}”</li>}
            {results.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === hi}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                  onMouseEnter={() => setHi(i)}
                  className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left", i === hi && "bg-accent")}
                >
                  <Avatar name={m.name} src={m.photo} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.code} · {m.phone}</div>
                  </div>
                  <StatusBadge status={ix.status.get(m.id)!} />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
