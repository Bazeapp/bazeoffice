import { buildStageMetadataFromLookupRows } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import {
  buildLookupColorMap,
  formatItalianDate,
  formatShortAddressNote,
  getFirstArrayValue,
  getStringArrayValue,
  normalizeComparableToken,
  normalizeLookupToken,
  resolveBadgeColor,
  toStringValue,
} from "@/lib/value-utils"
import type { LookupValueRecord } from "@/types"

import { fetchRicercaBoard } from "../queries/fetch-ricerca-board"
import type { RicercaBoardRpcProcess } from "../types/ricerca-rpc"
import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"
import { isDeferredRicercaStage } from "./board-column-utils"
import { STATI_RICERCA_CANONICI } from "./stati-ricerca"

type GenericRow = Record<string, unknown>

type StageDefinition = {
  id: string
  label: string
  color: string | null
}

type StageMetadata = {
  definitions: StageDefinition[]
  aliases: Map<string, string>
}

export function buildRicercaStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const fromLookup = buildStageMetadataFromLookupRows({
    lookupRows: rows,
    entityTable: "processi_matching",
    entityField: "stato_res",
  })

  const definitionsById = new Map(fromLookup.definitions.map((stage) => [stage.id, stage]))
  const aliases = new Map(fromLookup.aliases)

  for (const stage of STATI_RICERCA_CANONICI) {
    const existing = definitionsById.get(stage.id)
    definitionsById.set(stage.id, {
      id: stage.id,
      label: stage.label,
      color: existing?.color ?? stage.color,
    })
    aliases.set(normalizeLookupToken(stage.id), stage.id)
    aliases.set(normalizeLookupToken(stage.label), stage.id)
  }

  return {
    definitions: STATI_RICERCA_CANONICI.flatMap((stage) => {
      const definition = definitionsById.get(stage.id)
      return definition ? [definition] : []
    }),
    aliases,
  }
}

export async function buildRicercaBoardCardsForProcesses(
  processRows: RicercaBoardRpcProcess[],
  lookupRows: LookupValueRecord[],
) {
  const lookupColors = buildLookupColorMap(lookupRows)
  const stageMetadata = buildRicercaStageMetadata(lookupRows)
  const cardsByStageId = new Map<string, RicercaBoardCardData[]>()

  for (const process of processRows) {
    const id = toStringValue(process.id)
    const stageRaw = toStringValue(process.stato_res)
    const famigliaId = toStringValue(process.famiglia_id)
    if (!id || !stageRaw || !famigliaId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(stageRaw)) ?? stageRaw

    const family = process.famiglia
    if (!family) continue

    const cognomeFamiglia = toStringValue(family.cognome) ?? ""
    const nomeFamiglia = [toStringValue(family.nome), cognomeFamiglia]
      .filter((value): value is string => Boolean(value))
      .join(" ")

    const tipoLavoroBadges = getStringArrayValue(process.tipo_lavoro)
    const tipoLavoroBadge = tipoLavoroBadges[0] ?? null
    const tipoRapportoBadge = getFirstArrayValue(process.tipo_rapporto)
    const processAddress = (process.indirizzo as GenericRow | null) ?? undefined

    const card: RicercaBoardCardData = {
      id,
      stage,
      nomeFamiglia: nomeFamiglia || "-",
      cognomeFamiglia,
      email: toStringValue(family.email) ?? "-",
      telefono: toStringValue(family.telefono) ?? "-",
      operatorId: toStringValue(process.recruiter_ricerca_e_selezione_id),
      oreSettimanali: toStringValue(process.ore_settimanale) ?? "-",
      giorniSettimanali: toStringValue(process.numero_giorni_settimanali) ?? "-",
      deadline: formatItalianDate(process.deadline_mobile),
      deadlineRaw: toStringValue(process.deadline_mobile),
      zona: formatShortAddressNote(processAddress?.note) ?? "-",
      tipoLavoroBadges,
      tipoLavoroColors: Object.fromEntries(
        tipoLavoroBadges.map((tipoLavoro) => [
          tipoLavoro,
          resolveBadgeColor(
            lookupColors,
            "processi_matching",
            "tipo_lavoro",
            tipoLavoro,
          ),
        ]),
      ),
      tipoLavoroBadge,
      tipoLavoroColor: resolveBadgeColor(
        lookupColors,
        "processi_matching",
        "tipo_lavoro",
        tipoLavoroBadge,
      ),
      tipoRapportoBadge,
      tipoRapportoColor: resolveBadgeColor(
        lookupColors,
        "processi_matching",
        "tipo_rapporto",
        tipoRapportoBadge,
      ),
    }

    const stageCards = cardsByStageId.get(stage) ?? []
    stageCards.push(card)
    cardsByStageId.set(stage, stageCards)
  }

  return cardsByStageId
}

function sortRicercaBoardColumns(columns: RicercaBoardColumnData[]): RicercaBoardColumnData[] {
  const sortOrder = new Map(
    STATI_RICERCA_CANONICI.flatMap((stage, index) => [
      [normalizeComparableToken(stage.id), index] as const,
      [normalizeComparableToken(stage.label), index] as const,
    ]),
  )

  return [...columns].sort((left, right) => {
    const leftOrder =
      sortOrder.get(normalizeComparableToken(left.label)) ??
      sortOrder.get(normalizeComparableToken(left.id)) ??
      Number.MAX_SAFE_INTEGER
    const rightOrder =
      sortOrder.get(normalizeComparableToken(right.label)) ??
      sortOrder.get(normalizeComparableToken(right.id)) ??
      Number.MAX_SAFE_INTEGER

    return leftOrder - rightOrder
  })
}

export async function fetchRicercaBoardColumns(): Promise<RicercaBoardColumnData[]> {
  const lookupResult = await fetchLookupValues()
  const lookupRows = lookupResult.rows
  const stageMetadata = buildRicercaStageMetadata(lookupRows)

  const visibleStageDefinitions = stageMetadata.definitions

  const eagerStages = visibleStageDefinitions.filter(
    (stage) => !isDeferredRicercaStage(stage.label) && !isDeferredRicercaStage(stage.id),
  )
  const deferredStages = visibleStageDefinitions.filter(
    (stage) => isDeferredRicercaStage(stage.label) || isDeferredRicercaStage(stage.id),
  )

  const eagerStageValues = Array.from(
    new Set(eagerStages.flatMap((stage) => [stage.id, stage.label]).filter(Boolean)),
  ) as string[]
  const deferredStageValues = Array.from(
    new Set(deferredStages.flatMap((stage) => [stage.id, stage.label]).filter(Boolean)),
  ) as string[]

  const boardResult = await fetchRicercaBoard(eagerStageValues, deferredStageValues)
  const eagerCardsByStageId = await buildRicercaBoardCardsForProcesses(
    boardResult.processes,
    lookupRows,
  )
  const deferredCountMap = new Map<string, number>()
  for (const stage of deferredStages) {
    const count =
      (boardResult.deferredCounts[stage.id] as number | undefined) ??
      (boardResult.deferredCounts[stage.label] as number | undefined) ??
      0
    deferredCountMap.set(stage.id, count)
  }

  const orderedColumns = visibleStageDefinitions.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    totalCount: deferredCountMap.get(stage.id) ?? (eagerCardsByStageId.get(stage.id)?.length ?? 0),
    deferred: isDeferredRicercaStage(stage.label) || isDeferredRicercaStage(stage.id),
    isLoaded: !(isDeferredRicercaStage(stage.label) || isDeferredRicercaStage(stage.id)),
    isLoading: false,
    cards: eagerCardsByStageId.get(stage.id) ?? [],
  }))

  return sortRicercaBoardColumns(orderedColumns)
}
