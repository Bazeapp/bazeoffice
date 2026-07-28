import { fetchProcessiMatchingByIds } from "@/modules/ricerca/queries"
import type { RapportoLavorativoRecord } from "@/types"

/**
 * Some board RPCs omit `processi_matching_id`. After a full rapporto fetch,
 * keep the FK when present; otherwise fall back to the latest process for the
 * famiglia (same heuristic as `assunzioni_board`).
 */
export async function enrichRapportoWithRicercaId(
  rapporto: RapportoLavorativoRecord | null | undefined,
): Promise<RapportoLavorativoRecord | null> {
  if (!rapporto) return null
  if (rapporto.processi_matching_id) return rapporto
  if (!rapporto.famiglia_id) return rapporto

  const response = await fetchProcessiMatchingByIds({
    famigliaIds: [rapporto.famiglia_id],
  })
  const latest = response.rows
    .slice()
    .sort((left, right) => {
      const leftAt = left.aggiornato_il ? Date.parse(left.aggiornato_il) : 0
      const rightAt = right.aggiornato_il ? Date.parse(right.aggiornato_il) : 0
      return rightAt - leftAt
    })[0]

  if (!latest?.id) return rapporto
  return { ...rapporto, processi_matching_id: latest.id }
}
