import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { normalizeComparableToken } from "@/lib/value-utils"
import { getRapportoTitle, personNameFromRow } from "@/modules/rapporti/lib"

import { fetchAssunzioniNamesByRapportoIds } from "../queries/fetch-assunzioni-names-by-rapporto-ids"
import { fetchChiusureBoard } from "../queries/fetch-chiusure-board"
import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  TipoLicenziamentoOption,
} from "../types"
import type { RapportoLavorativoRecord } from "@/types"
import {
  buildChiusuraTipoMetadata,
  mapChiusuraBoardCard,
} from "./chiusure-board"
import { CHIUSURE_DEFAULT_STAGE_DEFINITIONS } from "./chiusure-board-constants"

export type FetchChiusureBoardDataOptions = {
  /**
   * Lazy lookup for the previous card by record id. Read AT mapping time
   * (NOT at queryFn start) so any concurrent `setQueryData` from
   * `loadSelectedCard` / `updateCard` is observed and detail-only fields
   * are merged in. Reading a snapshot at queryFn start would race against
   * a parallel detail fetch and reinstate stale empty sub-objects.
   */
  getPreviousCard?: (cardId: string) => ChiusureBoardCardData | undefined
}

export type ChiusureBoardData = {
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
}

export async function fetchChiusureBoardData({
  getPreviousCard,
}: FetchChiusureBoardDataOptions = {}): Promise<ChiusureBoardData> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchChiusureBoard(),
    fetchLookupValues(),
  ])

  const rapportoIds = [
    ...boardResult.cards.map((row) => row.rapporto?.id),
    ...boardResult.rapporti.map((row) => row.rapporto.id),
  ].filter((id): id is string => Boolean(id))
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(rapportoIds)

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: CHIUSURE_DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "chiusure_contratti",
    entityField: "stato",
  })
  const tipoMetadata = buildChiusuraTipoMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, ChiusureBoardCardData[]>(
    stages.map((stage) => [stage.id, []]),
  )

  for (const row of boardResult.cards) {
    const record = row.record
    const stage = aliases.get(normalizeComparableToken(record.stato))
    if (!stage) continue

    const previousCard = getPreviousCard?.(record.id)
    const assunzioneNames = row.rapporto?.id
      ? assunzioneNamesByRapporto[row.rapporto.id] ?? null
      : null
    const card = mapChiusuraBoardCard(row, stage, tipoMetadata, previousCard, assunzioneNames)
    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  const rapportoOptions = boardResult.rapporti
    .map((row) => {
      const assunzioneNames = assunzioneNamesByRapporto[row.rapporto.id] ?? null
      return {
        id: row.rapporto.id,
        label: getRapportoTitle(row.rapporto, {
          famiglia: personNameFromRow((row.famiglia as Record<string, unknown> | null) ?? null),
          lavoratore: personNameFromRow((row.lavoratore as Record<string, unknown> | null) ?? null),
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        }),
        rapporto: row.rapporto,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return { columns, rapportoOptions, tipoLicenziamentoOptions: tipoMetadata.tipoLicenziamentoOptions }
}
