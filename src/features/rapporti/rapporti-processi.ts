import type { RapportoLavorativoRecord } from "@/types"

type RapportoProcessLink = Pick<RapportoLavorativoRecord, "processi_matching_id"> & {
  processo_res?: string[] | string | null
}

export function getRapportoProcessIds(rapporto: RapportoProcessLink) {
  const ids = new Set<string>()

  if (rapporto.processi_matching_id) {
    ids.add(rapporto.processi_matching_id)
  }

  const legacyProcessIds = Array.isArray(rapporto.processo_res)
    ? rapporto.processo_res
    : rapporto.processo_res
      ? [rapporto.processo_res]
      : []

  for (const processId of legacyProcessIds) {
    if (processId) ids.add(processId)
  }

  return Array.from(ids)
}
