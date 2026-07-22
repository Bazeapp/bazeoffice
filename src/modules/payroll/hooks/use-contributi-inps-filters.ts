import * as React from "react"

import {
  buildContributiColumns,
  buildContributiMetricGroups,
  buildContributiStats,
  filterContributiCards,
} from "../lib"
import type {
  ContributiColumnData,
  ContributiMetric,
  ContributiStageDefinition,
  ContributoInpsBoardCardData,
} from "../types"

type UseContributiInpsFiltersInput = {
  cards: ContributoInpsBoardCardData[]
  stages: ContributiStageDefinition[]
  activeRapportiCount: number
  search: string
  stageFilter: string
}

type UseContributiInpsFiltersResult = {
  filteredCards: ContributoInpsBoardCardData[]
  columns: ContributiColumnData[]
  stats: ReturnType<typeof buildContributiStats>
  metricGroups: ContributiMetric[][]
}

export function useContributiInpsFilters({
  cards,
  stages,
  activeRapportiCount,
  search,
  stageFilter,
}: UseContributiInpsFiltersInput): UseContributiInpsFiltersResult {
  const filteredCards = React.useMemo(
    () => filterContributiCards(cards, { search, stageFilter }),
    [cards, search, stageFilter],
  )

  const columns = React.useMemo(
    () => buildContributiColumns(stages, filteredCards),
    [filteredCards, stages],
  )

  const stats = React.useMemo(
    () => buildContributiStats(stages, filteredCards),
    [filteredCards, stages],
  )

  const metricGroups = React.useMemo(
    () => buildContributiMetricGroups(activeRapportiCount, stages, stats),
    [activeRapportiCount, stages, stats],
  )

  return { filteredCards, columns, stats, metricGroups }
}
