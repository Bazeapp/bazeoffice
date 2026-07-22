import { getRapportoProcessIds } from "@/modules/rapporti/lib"
import type { RapportoLavorativoRecord } from "@/types"

type RapportoRicercaSource = Pick<RapportoLavorativoRecord, "processi_matching_id"> & {
  processo_res?: string[] | string | null
}

/**
 * Prefer the real FK / legacy process links on the rapporto; otherwise use an
 * explicit fallback (board `processId`, already-loaded related process, etc.).
 */
export function resolveRapportoRicercaId(
  rapporto: RapportoRicercaSource | null | undefined,
  fallbackProcessId?: string | null,
): string | null {
  if (rapporto) {
    const linked = getRapportoProcessIds(rapporto)[0]
    if (linked) return linked
  }

  const fallback = fallbackProcessId?.trim()
  return fallback || null
}
