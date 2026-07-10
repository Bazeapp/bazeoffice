import { buildStageMetadataFromDefaults } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { normalizeComparableToken } from "@/lib/value-utils"

import { fetchAssunzioniBoard } from "../queries/fetch-assunzioni-board"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData } from "../types"
import {
  ASSUNZIONI_DEFAULT_STAGE_DEFINITIONS,
  ASSUNZIONI_DEFERRED_STAGE_IDS,
} from "./assunzioni-board-constants"
import { mapAssunzioniBoardCard } from "./assunzioni-board"

export type FetchAssunzioniBoardDataOptions = {
  deferredLoadedStageIds?: Set<string>
  onlyStageId?: string
  /**
   * Lazy lookup for the previous card by rapporto id. Read AT mapping time
   * (NOT at queryFn start) so any concurrent `setQueryData` from
   * `handleSelectCard` / `updateCard` is observed and detail-only fields
   * are merged in. Reading a snapshot at queryFn start would race against
   * a parallel detail fetch and reinstate stale empty sub-objects.
   */
  getPreviousCard?: (rapportoId: string) => AssunzioniBoardCardData | undefined
}

export async function fetchAssunzioniBoardData({
  deferredLoadedStageIds = new Set<string>(),
  onlyStageId,
  getPreviousCard,
}: FetchAssunzioniBoardDataOptions = {}): Promise<AssunzioniBoardColumnData[]> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchAssunzioniBoard(onlyStageId ?? null),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: ASSUNZIONI_DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "processi_matching",
    entityField: "stato_assunzione",
  })
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, AssunzioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []]),
  )

  for (const row of boardResult.rows) {
    const linkedRapporto = row.rapporto
    if (!linkedRapporto) continue

    const processStage = aliases.get(normalizeComparableToken(linkedRapporto.stato_assunzione))
    if (!processStage) continue

    const previousCard = getPreviousCard?.(linkedRapporto.id)
    const card = mapAssunzioniBoardCard(row, processStage, previousCard)
    if (!card) continue

    cardsByStage.get(processStage)?.push(card)
  }

  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
    deferred: ASSUNZIONI_DEFERRED_STAGE_IDS.has(stage.id),
    loadError: null,
    loaded: !ASSUNZIONI_DEFERRED_STAGE_IDS.has(stage.id) || deferredLoadedStageIds.has(stage.id),
    loading: false,
  }))
}
