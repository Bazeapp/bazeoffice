import {
  fetchRichiesteAttivazione,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import type { RichiestaAttivazioneRecord } from "@/types"

const RICHIESTE_ATTIVAZIONE_SELECT = [
  "id",
  "email",
  "fee_concordata",
  "firmatario",
  "processo_res_id",
  "signed_document_title",
  "signed_document_url",
  "aggiornato_il",
] satisfies string[]

const RICHIESTE_ATTIVAZIONE_BATCH_SIZE = 100

function buildProcessIdsFilter(processIds: string[]): QueryFilterGroup | undefined {
  const normalizedIds = Array.from(new Set(processIds.filter(Boolean)))
  if (normalizedIds.length === 0) return undefined

  return {
    kind: "group",
    id: "richieste-attivazione-processi-root",
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: "richieste-attivazione-processi-in",
        field: "processo_res_id",
        operator: "in",
        value: normalizedIds.join(","),
      },
    ],
  }
}

function getTimeValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

export async function fetchRichiesteAttivazioneByProcessIds(processIds: string[]) {
  const uniqueProcessIds = Array.from(new Set(processIds.filter(Boolean)))
  const rows: RichiestaAttivazioneRecord[] = []

  for (let index = 0; index < uniqueProcessIds.length; index += RICHIESTE_ATTIVAZIONE_BATCH_SIZE) {
    const batch = uniqueProcessIds.slice(index, index + RICHIESTE_ATTIVAZIONE_BATCH_SIZE)
    const response = await fetchRichiesteAttivazione({
      select: RICHIESTE_ATTIVAZIONE_SELECT,
      limit: Math.min(batch.length * 3, 5000),
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: buildProcessIdsFilter(batch),
    })
    rows.push(...response.rows)
  }

  const byProcessId = new Map<string, RichiestaAttivazioneRecord>()
  for (const row of rows) {
    if (!row.processo_res_id) continue
    const current = byProcessId.get(row.processo_res_id)
    if (!current || getTimeValue(row.aggiornato_il) > getTimeValue(current.aggiornato_il)) {
      byProcessId.set(row.processo_res_id, row)
    }
  }

  return byProcessId
}
