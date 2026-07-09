import { fetchRichiesteAttivazioneLookup } from "./fetch-richieste-attivazione-lookup"
import { getSortableTimestamp, isUuidValue } from "@/lib/value-utils"
import type { RichiestaAttivazioneRecord } from "../types/richiesta-attivazione"

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
    if (
      !current ||
      getSortableTimestamp(row.aggiornato_il) > getSortableTimestamp(current.aggiornato_il)
    ) {
      byProcessId.set(row.processo_res_id, row)
    }
  }

  return byProcessId
}
