import { fetchRichiesteAttivazioneLookup } from "../../queries/fetch-richieste-attivazione-lookup"
import type { RichiestaAttivazioneRecord } from "@/types"

function isUuidValue(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function getTimeValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

export async function fetchRichiesteAttivazioneByProcessIds(processIds: string[]) {
  const uniqueProcessIds = Array.from(new Set(processIds.filter(isUuidValue)))
  if (uniqueProcessIds.length === 0) return new Map<string, RichiestaAttivazioneRecord>()

  const response = await fetchRichiesteAttivazioneLookup({
    processoResIds: uniqueProcessIds,
  })
  const rows = response.rows as RichiestaAttivazioneRecord[]

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

export async function fetchRichiesteAttivazioneByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, RichiestaAttivazioneRecord>()

  const response = await fetchRichiesteAttivazioneLookup({ ids: uniqueIds })
  const rows = response.rows as RichiestaAttivazioneRecord[]

  const byId = new Map<string, RichiestaAttivazioneRecord>()
  for (const row of rows) {
    byId.set(row.id, row)
  }

  return byId
}
