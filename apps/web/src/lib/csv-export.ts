import { NextResponse } from "next/server";

export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(value: CsvValue) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function csvDocument(rows: CsvValue[][]) {
  return rows.map((line) => line.map(csvCell).join(",")).join("\n");
}

export function csvExportResponse(filenameBase: string, rows: CsvValue[][]) {
  return new NextResponse(`\ufeff${csvDocument(rows)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
