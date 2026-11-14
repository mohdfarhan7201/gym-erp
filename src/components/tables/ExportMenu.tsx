import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import type { ExportColumn } from "@/services/exports/excel";
import { printElement } from "@/services/exports/print";
import { useDB } from "@/hooks/useGym";
import { fmtDateTime } from "@/utils/format";
import type { GymSettings } from "@/types";

export interface ExportConfig<T> {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn<T>[];
  summary?: [string, string][];
}

export function PrintableReport<T>({ gym, config, rows }: { gym: GymSettings; config: ExportConfig<T>; rows: T[] }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#111418", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "3px solid #C6F432", paddingBottom: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>{gym.name.toUpperCase()}</div>
          <div style={{ color: "#6b7280" }}>{gym.address}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{config.title}</div>
          {config.subtitle && <div style={{ color: "#6b7280" }}>{config.subtitle}</div>}
        </div>
      </div>
      {config.summary && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 12 }}>
          {config.summary.map(([k, v]) => (
            <div key={k}><div style={{ color: "#6b7280", fontSize: 10 }}>{k}</div><div style={{ fontWeight: 700, fontSize: 13 }}>{v}</div></div>
          ))}
        </div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{config.columns.map((c) => <th key={c.header} style={{ textAlign: "left", background: "#111418", color: "#fff", padding: "6px 8px", fontSize: 10 }}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "#f6f7f9" : "#fff" }}>
              {config.columns.map((c) => <td key={c.header} style={{ padding: "5px 8px", borderBottom: "1px solid #e5e7eb" }}>{c.value(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, color: "#9ca3af", fontSize: 9 }}>Generated {fmtDateTime(new Date())} · {rows.length} records</div>
    </div>
  );
}

export function ExportMenu<T>({ config, rows }: { config: ExportConfig<T>; rows: T[] }) {
  const db = useDB();
  const [busy, setBusy] = useState(false);
  const run = async (kind: "xlsx" | "pdf" | "print") => {
    if (!rows.length) return toast.error("There is no data to export.");
    if (kind === "print") return printElement(<PrintableReport gym={db.settings} config={config} rows={rows} />);
    setBusy(true);
    try {
      if (kind === "xlsx") {
        const { exportExcel } = await import("@/services/exports/excel");
        exportExcel(config.filename, config.title, config.columns, rows);
      } else {
        const { exportReportPdf } = await import("@/services/exports/pdf");
        exportReportPdf({ ...config, gym: db.settings, rows });
      }
      toast.success(`${kind === "xlsx" ? "Excel" : "PDF"} exported`, { description: `${rows.length} rows · ${config.filename}` });
    } catch (e) {
      toast.error("Export failed", { description: String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" loading={busy}>
          {!busy && <Download />} Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run("xlsx")}><FileSpreadsheet /> Export to Excel</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("pdf")}><FileText /> Export to PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("print")}><Printer /> Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
