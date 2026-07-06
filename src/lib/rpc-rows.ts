// Shared RPC wrapper for board/table fetchers: calls a Supabase RPC, applies
// an optional .select() column projection (payload trim — do not drop it, a
// missing projection turns a trimmed payload into full-row serialization),
// and normalizes the response through the table-query contract.
import { supabase } from "@/lib/supabase-client"
import {
  normalizeTableResponse,
  type TableQueryResponse,
} from "@/lib/table-query"

export type TableRow = Record<string, unknown>

export function asTableRowArray(value: unknown): TableRow[] {
  return Array.isArray(value) ? (value as TableRow[]) : []
}

export async function rpcRows(
  fn: string,
  params: Record<string, unknown>,
  columns?: string,
) {
  const builder = supabase.rpc(fn, params)
  const { data, error } = columns ? await builder.select(columns) : await builder
  if (error) throw new Error(`${fn} failed: ${error.message}`)
  return normalizeTableResponse(data as TableQueryResponse<TableRow>)
}
