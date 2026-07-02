/**
 * Prep dati "altre ricerche" per la card della mappa (BAZ-29).
 *
 * `lavoratori_selezioni_correlate` restituisce TUTTE le selezioni correlate del
 * lavoratore (già filtrate ai soli "direct involvement" lato server) ma NON
 * esclude il processo corrente. Sulla mappa "altre ricerche" significa: le
 * ricerche DIVERSE da quella aperta — quindi escludiamo il processo corrente
 * qui, prima di passare le righe a `buildRelatedSelectionsMap` (riuso della
 * board). Modulo puro, senza import pesanti → unit-testabile in isolamento.
 */
type CorrelateRow = Record<string, unknown>

export function excludeCurrentProcess(
  rows: readonly CorrelateRow[],
  currentProcessId: string
): CorrelateRow[] {
  return rows.filter(
    (row) => String(row.processo_matching_id ?? "") !== currentProcessId
  )
}
