import * as XLSX from "xlsx";

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

export function exportExcel<T>(filename: string, sheet: string, columns: ExportColumn<T>[], rows: T[]) {
  const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.header, c.value(r)])));
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  ws["!cols"] = columns.map((c) => ({
    wch: Math.max(c.header.length + 2, ...data.slice(0, 200).map((d) => String(d[c.header] ?? "").length + 2)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
