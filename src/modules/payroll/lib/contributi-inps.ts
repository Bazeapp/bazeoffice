import { matchesSearchQuery } from "@/lib/search-utils"

import type {
  ContributiColumnData,
  ContributiMetric,
  ContributiStageDefinition,
  ContributoInpsBoardCardData,
} from "../types"

export const PAYROLL_CURRENCY_OPTIONS = { emptyLabel: "Non disponibile" } as const

export function contributiInpsStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}

export function parseContributoNumericField(value: string) {
  if (!value) return null
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeAttachmentValue(value: unknown) {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed) return null
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return value
    }
  }
  return value
}

function getContributoSearchFields(card: ContributoInpsBoardCardData) {
  return [
    card.id,
    card.nomeFamiglia,
    card.nomeLavoratore,
    card.nomeCompleto,
    card.trimestreLabel,
    card.importoLabel,
    card.pagopaLabel,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.codice_datore_webcolf,
    card.rapporto?.codice_dipendente_webcolf,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
  ]
}

export function filterContributiCards(
  cards: ContributoInpsBoardCardData[],
  options: { search: string; stageFilter: string },
) {
  return cards.filter((card) => {
    if (options.stageFilter !== "all" && card.stage !== options.stageFilter) return false
    return matchesSearchQuery(getContributoSearchFields(card), options.search)
  })
}

export function buildContributiColumns(
  stages: ContributiStageDefinition[],
  filteredCards: ContributoInpsBoardCardData[],
): ContributiColumnData[] {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: filteredCards.filter((card) => card.stage === stage.id),
  }))
}

export function buildContributiStats(
  stages: ContributiStageDefinition[],
  filteredCards: ContributoInpsBoardCardData[],
) {
  const grouped = new Map<string, number>()
  for (const stage of stages) {
    grouped.set(stage.id, 0)
  }
  for (const card of filteredCards) {
    grouped.set(card.stage, (grouped.get(card.stage) ?? 0) + 1)
  }

  return {
    totale: filteredCards.length,
    grouped,
  }
}

export function buildContributiMetricGroups(
  activeRapportiCount: number,
  stages: ContributiStageDefinition[],
  stats: ReturnType<typeof buildContributiStats>,
): ContributiMetric[][] {
  return [
    [
      {
        title: "Rapporti attivi",
        value: String(activeRapportiCount),
      },
      {
        title: "Contributi totali",
        value: String(stats.totale),
      },
    ],
    stages.map((stage) => ({
      title: stage.label,
      value: String(stats.grouped.get(stage.id) ?? 0),
    })),
  ]
}
