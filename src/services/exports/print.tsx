import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

/** Render a React element into #print-root, open the print dialog, then clean up. */
export function printElement(el: ReactElement) {
  const host = document.getElementById("print-root");
  if (!host) return;
  const root = createRoot(host);
  root.render(el);
  document.body.classList.add("printing");
  const cleanup = () => {
    document.body.classList.remove("printing");
    root.unmount();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  requestAnimationFrame(() => setTimeout(() => window.print(), 80));
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
