export const WORKER_SORTABLE_FIELDS = [
  "nome",
  "cognome",
  "stato_lavoratore",
  "disponibilita",
  "provincia",
  "data_di_nascita",
  "anni_esperienza_colf",
  "anni_esperienza_babysitter",
  "followup_chiamata_idoneita",
  "creato_il",
  "aggiornato_il",
] as const

const WORKER_SORTABLE_FIELD_SET = new Set<string>(WORKER_SORTABLE_FIELDS)

export type RpcOrderBy = { field: string; ascending: boolean }

export function toRpcOrderBy(
  sorting: { id: string; desc: boolean }[],
): RpcOrderBy | undefined {
  const first = sorting[0]
  if (!first || !WORKER_SORTABLE_FIELD_SET.has(first.id)) return undefined
  return { field: first.id, ascending: !first.desc }
}

export function isRpcSortable(sorting: { id: string; desc: boolean }[]): boolean {
  if (sorting.length === 0) return true
  return sorting.length === 1 && WORKER_SORTABLE_FIELD_SET.has(sorting[0].id)
}
