import type { FamigliaRecord } from "../types/famiglie"
import type { RichiestaAttivazioneRecord } from "../types/richiesta-attivazione"

export function adaptFamigliaRecord(row: Record<string, unknown>): FamigliaRecord {
  return row as FamigliaRecord
}

export function adaptRichiestaAttivazioneRecord(
  row: Record<string, unknown>,
): RichiestaAttivazioneRecord {
  return row as RichiestaAttivazioneRecord
}
