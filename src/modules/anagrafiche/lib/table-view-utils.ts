import { formatCellValue, toReadableColumnLabel } from "./formatter"
import type { AnagraficaRow, AnagraficheTab } from "../types"
import type { TableColumnMeta } from "@/lib/table-query"

export function getRecordTitle(row: AnagraficaRow) {
  const fullName = [row.nome, row.cognome]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ")

  if (fullName) return fullName

  for (const key of ["nome", "titolo", "name", "id"]) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }

  return "Dettaglio record"
}

export function getTabLabel(tab: AnagraficheTab) {
  switch (tab) {
    case "famiglie":
      return "Famiglia"
    case "processi":
      return "Processo"
    case "lavoratori":
      return "Lavoratore"
    case "mesi_lavorati":
      return "Mese lavorato"
    case "pagamenti":
      return "Pagamento"
    case "selezioni_lavoratori":
      return "Selezione lavoratore"
    case "rapporti_lavorativi":
      return "Rapporto lavorativo"
  }
}

export function getOrderedRecordFields(row: AnagraficaRow, columns: TableColumnMeta[]) {
  const orderedKeys = columns.map((column) => column.name)
  const extraKeys = Object.keys(row).filter((key) => !orderedKeys.includes(key))
  return [...orderedKeys, ...extraKeys].filter((key) => key in row)
}

export function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ""

  const serialized = Array.isArray(value)
    ? value.map((item) => formatCellValue(item)).join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value)

  return `"${serialized.replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, rows: AnagraficaRow[], columns: TableColumnMeta[]) {
  const keysFromColumns = columns.map((column) => column.name)
  const extraKeys = rows.flatMap((row) => Object.keys(row)).filter((key) => !keysFromColumns.includes(key))
  const keys = [...keysFromColumns, ...Array.from(new Set(extraKeys))].filter((key) =>
    rows.some((row) => key in row),
  )

  const header = keys.map((key) => csvEscape(toReadableColumnLabel(key))).join(",")
  const body = rows.map((row) => keys.map((key) => csvEscape(row[key])).join(",")).join("\n")
  const csv = [header, body].filter(Boolean).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
