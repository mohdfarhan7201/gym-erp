/**
 * Thin wrapper around localStorage. This is the ONLY module that touches
 * browser storage for business data; swap it for HTTP calls when the backend lands.
 */
const PREFIX = "gymerp:v1:";

export const localStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage write failed", e);
      throw new Error("Browser storage is full or unavailable. Try removing photos or resetting demo data.");
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};
