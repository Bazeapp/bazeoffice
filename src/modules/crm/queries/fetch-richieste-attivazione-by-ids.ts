import { fetchRichiesteAttivazioneLookup } from "./fetch-richieste-attivazione-lookup"
import type { RichiestaAttivazioneRecord } from "../types/richiesta-attivazione"

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
