import * as React from "react"

import { getCurrentQuarterState } from "../lib"
import { useContributiInpsBoard } from "../hooks/use-contributi-inps-board"
import { useContributiInpsFilters } from "../hooks/use-contributi-inps-filters"
import { useContributiInpsSelection } from "../hooks/use-contributi-inps-selection"
import type { ContributiPeriod } from "../types"
import { ContributiInpsBoard } from "./contributi-inps-board"
import { ContributoInpsDetailSheet } from "./contributi-inps-detail-sheet"
import { ContributiInpsHeader } from "./contributi-inps-header"
import { ContributiInpsMetrics } from "./contributi-inps-metrics"

export function ContributiInpsView() {
  const [period, setPeriod] = React.useState<ContributiPeriod>(getCurrentQuarterState)
  const [search, setSearch] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const { loading, error, stages, cards, activeRapportiCount, moveCard, patchCard } = useContributiInpsBoard(
    period.year,
    period.quarter,
  )
  const { columns, stats, metricGroups } = useContributiInpsFilters({
    cards,
    stages,
    activeRapportiCount,
    search,
    stageFilter,
  })
  const selection = useContributiInpsSelection(cards)

  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <ContributiInpsHeader
        totalCount={stats.totale}
        period={period}
        onPeriodChange={setPeriod}
        search={search}
        onSearchChange={setSearch}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        stages={stages}
      />

      <ContributiInpsMetrics metricGroups={metricGroups} />

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento contributi INPS: {error}
        </div>
      ) : null}

      <ContributiInpsBoard
        loading={loading}
        columns={columns}
        draggingRecordId={draggingRecordId}
        dropTargetColumnId={dropTargetColumnId}
        onOpenCard={selection.openCard}
        onDragStartCard={setDraggingRecordId}
        onDragEndCard={() => {
          window.setTimeout(() => {
            setDraggingRecordId(null)
            setDropTargetColumnId(null)
          }, 0)
        }}
        onDragEnterColumn={setDropTargetColumnId}
        onDragOverColumn={setDropTargetColumnId}
        onDragLeaveColumn={(event, columnId) => {
          const nextTarget = event.relatedTarget
          if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
          setDropTargetColumnId((current) => (current === columnId ? null : current))
        }}
        onDropToColumn={(columnId, recordId) => {
          setDropTargetColumnId(null)
          setDraggingRecordId(null)
          if (!recordId) return
          void moveCard(recordId, columnId)
        }}
      />

      <ContributoInpsDetailSheet
        key={selection.selectedCardId ?? "__empty__"}
        card={selection.selectedCard}
        columns={columns}
        open={Boolean(selection.selectedCardId)}
        onOpenChange={(open) => {
          if (!open) selection.closeCard()
        }}
        onStageChange={moveCard}
        onPatchCard={async (recordId, patch) => {
          await patchCard(recordId, patch)
          selection.patchSelectedCard(recordId, patch)
        }}
      />
    </section>
  )
}
