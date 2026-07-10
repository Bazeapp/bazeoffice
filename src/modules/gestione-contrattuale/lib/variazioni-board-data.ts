import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { normalizeComparableToken } from "@/lib/value-utils"
import { getRapportoTitle, personNameFromRow } from "@/modules/rapporti/lib"

import { fetchAssunzioniNamesByRapportoIds } from "../queries/fetch-assunzioni-names-by-rapporto-ids"
import { fetchVariazioniBoard } from "../queries/fetch-variazioni-board"
import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniRapportoOption,
} from "../types"
import { VARIAZIONI_DEFAULT_STAGE_DEFINITIONS } from "./variazioni-board-constants"
import { mapVariazioneBoardCard } from "./variazioni-board"

export type FetchVariazioniBoardDataOptions = {
  /**
   * Lazy lookup for the previous card by record id. Read AT mapping time
   * (NOT at queryFn start) so any concurrent `setQueryData` from
   * `loadSelectedCard` / `updateCard` is observed and detail-only fields
   * are merged in. Reading a snapshot at queryFn start would race against
   * a parallel detail fetch and reinstate stale empty sub-objects.
   */
  getPreviousCard?: (cardId: string) => VariazioniBoardCardData | undefined
}

export type VariazioniBoardData = {
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
}

export async function fetchVariazioniBoardData({
  getPreviousCard,
}: FetchVariazioniBoardDataOptions = {}): Promise<VariazioniBoardData> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchVariazioniBoard(),
    fetchLookupValues(),
  ])

  const rapportoIds = [
    ...boardResult.cards.map((row) => row.rapporto?.id),
    ...boardResult.rapporti.map((row) => row.rapporto.id),
  ].filter((id): id is string => Boolean(id))
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(rapportoIds)

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: VARIAZIONI_DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "variazioni_contrattuali",
    entityField: "stato",
  })
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, VariazioniBoardCardData[]>(
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
    const card = mapVariazioneBoardCard(row, stage, previousCard, assunzioneNames)
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

  return { columns, rapportoOptions }
}
