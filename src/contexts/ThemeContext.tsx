import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
const KEY = "gymerp:theme";
const Ctx = createContext<{ mode: ThemeMode; resolved: "light" | "dark"; setMode: (m: ThemeMode) => void; toggle: () => void } | null>(null);

const sysDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem(KEY) as ThemeMode) || "system";
    } catch {
      return "system";
    }
  });
  const [systemDark, setSystemDark] = useState(sysDark);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setSystemDark(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0B0D10" : "#F5F6F8");
  }, [resolved]);
  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  };
  return <Ctx.Provider value={{ mode, resolved, setMode, toggle: () => setMode(resolved === "dark" ? "light" : "dark") }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside ThemeProvider");
  return c;
}
