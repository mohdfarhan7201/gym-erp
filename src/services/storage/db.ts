import type { DB } from "@/types";
import { buildSeed } from "@/services/mock/seed";
import { localStore } from "./localStore";

/**
 * In-memory cache of the demo database, persisted to localStorage.
 * Components never import this directly — they go through services/* and hooks/useGym.
 */
/** bump when the seed shape/data changes so old demo data is regenerated */
const DB_KEY = "db@3";
type Listener = () => void;
const listeners = new Set<Listener>();
let cache: DB | null = null;

function load(): DB {
  const stored = localStore.get<DB | null>(DB_KEY, null);
  if (stored && stored.members && stored.settings) return stored;
  ["db", "db@2"].forEach((k) => localStore.remove(k)); // drop data from older seed versions
  const seed = buildSeed();
  localStore.set(DB_KEY, seed);
  return seed;
}

export const dbStore = {
  snapshot(): DB {
    if (!cache) cache = load();
    return cache;
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Apply an immutable update and persist. */
  commit(mutator: (draft: DB) => void): DB {
    const next = structuredClone(dbStore.snapshot());
    mutator(next);
    localStore.set(DB_KEY, next);
    cache = next;
    listeners.forEach((l) => l());
    return next;
  },
  replace(next: DB) {
    localStore.set(DB_KEY, next);
    cache = next;
    listeners.forEach((l) => l());
  },
  reset() {
    dbStore.replace(buildSeed());
  },
};

/** Simulated network latency so loading states are exercised. */
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
