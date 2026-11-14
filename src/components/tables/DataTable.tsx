import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { Input, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { EmptyState } from "@/components/common";
import { useDebounce } from "@/hooks/useUtils";
import { ExportMenu, type ExportConfig } from "./ExportMenu";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  /** hidden in mobile card view */
  hideOnMobile?: boolean;
  /** rendered as the card title on mobile */
  primary?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  search?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: { title: string; description?: string; action?: ReactNode };
  exportConfig?: ExportConfig<T>;
  className?: string;
  footer?: ReactNode;
}

export function DataTable<T>({
  rows, columns, rowKey, loading, search, searchPlaceholder = "Search…", toolbar, actions, onRowClick, pageSize: initialPageSize = 10,
  initialSort, empty, exportConfig, className, footer,
}: Props<T>) {
  const [q, setQ] = useState("");
  const dq = useDebounce(q, 150);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    let r = rows;
    if (dq && search) {
      const s = dq.toLowerCase().trim();
      r = r.filter((x) => search(x).toLowerCase().includes(s));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const f = col.sortValue;
        r = [...r].sort((a, b) => {
          const va = f(a), vb = f(b);
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return r;
  }, [rows, dq, search, sort, columns]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => setPage(1), [dq, rows.length, pageSize]);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : undefined) : { key, dir: "asc" }));

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

  return (
    <div className={cn("rounded-xl border bg-card shadow-card", className)}>
      {(search || toolbar || exportConfig) && (
        <div className="flex flex-col gap-2.5 border-b p-3 sm:p-4 lg:flex-row lg:items-center">
          {search && (
            <div className="relative w-full lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="pl-9 pr-9" aria-label="Search table" />
              {q && (
                <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label="Clear search">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:justify-end">
            {toolbar}
            {exportConfig && <ExportMenu config={exportConfig} rows={filtered} />}
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn("whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                  {c.sortValue ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className={cn("inline-flex cursor-pointer items-center gap-1 uppercase hover:text-foreground", sort?.key === c.key && "text-foreground")}>
                      {c.header}
                      {sort?.key === c.key ? sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
              {actions && <th className="w-px px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5"><Skeleton className="h-4 w-[70%]" /></td>
                    ))}
                    {actions && <td className="px-4"><Skeleton className="h-8 w-8" /></td>}
                  </tr>
                ))
              : visible.map((r, i) => (
                  <motion.tr
                    key={rowKey(r)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.015 }}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={cn("border-b transition-colors last:border-0 hover:bg-muted/40", onRowClick && "cursor-pointer")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle", c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>{c.cell(r)}</td>
                    ))}
                    {actions && (
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">{actions(r)}</div>
                      </td>
                    )}
                  </motion.tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y md:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 p-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-2/3" /></div>
            ))
          : (
            <AnimatePresence initial={false}>
              {visible.map((r) => (
                <motion.div
                  key={rowKey(r)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn("p-4", onRowClick && "cursor-pointer active:bg-muted/50")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">{primary.cell(r)}</div>
                    {actions && <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>{actions(r)}</div>}
                  </div>
                  {rest.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {rest.map((c) => (
                        <div key={c.key} className="min-w-0">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{c.header}</dt>
                          <dd className="mt-0.5 min-w-0 truncate text-[13px]">{c.cell(r)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState title={dq ? "No matches" : empty?.title ?? "Nothing here yet"} description={dq ? `Nothing matches “${dq}”. Try a different search.` : empty?.description} action={dq ? <Button variant="outline" size="sm" onClick={() => setQ("")}>Clear search</Button> : empty?.action} />
      )}

      {footer}

      {!loading && filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span>
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="w-[92px]">
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))} options={[10, 25, 50, 100].map((n) => ({ value: String(n), label: `${n} / page` }))} className="h-8 text-xs" aria-label="Rows per page" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft /></Button>
            <span className="min-w-[72px] text-center font-medium text-foreground">Page {page} / {pages}</span>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
