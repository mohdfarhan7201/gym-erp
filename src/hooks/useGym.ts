import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { dbStore } from "@/services/storage/db";
import { buildIndex } from "@/services/selectors";

/** Subscribe to the data store (re-renders on any mutation). */
export function useDB() {
  return useSyncExternalStore(dbStore.subscribe, dbStore.snapshot);
}

/**
 * Main data hook for pages: snapshot + derived index + a short simulated
 * fetch so skeleton states show on navigation like they would with a real API.
 */
export function useGym(simulate = 380) {
  const db = useDB();
  const ix = useMemo(() => buildIndex(db), [db]);
  const [loading, setLoading] = useState(simulate > 0);
  useEffect(() => {
    if (!simulate) return;
    const t = setTimeout(() => setLoading(false), simulate);
    return () => clearTimeout(t);
  }, [simulate]);
  return { db, ix, loading };
}

/** Wrap an async service call with loading state + toast feedback. */
export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>, opts: { success?: string | ((r: R) => string); onSuccess?: (r: R) => void } = {}) {
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (...args: A) => {
      setPending(true);
      try {
        const r = await fn(...args);
        if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success);
        opts.onSuccess?.(r);
        return r;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, opts.success, opts.onSuccess],
  );
  return { run, pending };
}
