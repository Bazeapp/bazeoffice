import type { TicketRecord } from "./types/ticket"

/** Normalizes a Supabase ticket row to the domain record (identity seam for future DB cleanup). */
export function adaptTicketRecord(row: Record<string, unknown>): TicketRecord {
  return row as TicketRecord
}

export function adaptTicketRecords(rows: Record<string, unknown>[] | undefined): TicketRecord[] {
  if (!rows) return []
  return rows.map(adaptTicketRecord)
}
