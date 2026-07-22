import { SideCardsPanel } from "@/components/shared-next/side-cards-panel"

import { useRapportiListPanel, type RapportiListPanelProps } from "../hooks/use-rapporti-list-panel"
import { RapportiListPanelFilterSummary } from "./rapporti-list-panel-filter-summary"
import { RapportiListPanelGroupTree } from "./rapporti-list-panel-group-tree"
import { RapportiListPanelPagination } from "./rapporti-list-panel-pagination"
import { RapportiListPanelStates } from "./rapporti-list-panel-states"
import { RapportiListPanelStatusFilter } from "./rapporti-list-panel-status-filter"
import { RapportiListPanelToolbar } from "./rapporti-list-panel-toolbar"

export type { RapportiListPanelProps } from "../hooks/use-rapporti-list-panel"

export function RapportiListPanel(props: RapportiListPanelProps) {
  const { toolbar, statusFilter, list, asyncState, pagination } = useRapportiListPanel(props)

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <SideCardsPanel
        title="Rapporti lavorativi"
        headerClassName="hidden"
        contentClassName="space-y-3 px-5 pt-3 pb-3"
        className="h-full gap-2"
      >
        <RapportiListPanelToolbar {...toolbar} />
        <RapportiListPanelStatusFilter value={statusFilter.value} onChange={statusFilter.onChange} />
        {statusFilter.activeFilterCount > 0 ? (
          <RapportiListPanelFilterSummary
            visibleCount={statusFilter.visibleCount}
            totalCount={statusFilter.totalCount}
            onClear={statusFilter.onClear}
          />
        ) : null}
        <RapportiListPanelStates
          loading={asyncState.loading}
          error={asyncState.error}
          onRetry={asyncState.onRetry}
          isEmpty={list.visibleItems.length === 0}
        >
          <RapportiListPanelGroupTree {...list} items={list.visibleItems} />
        </RapportiListPanelStates>
      </SideCardsPanel>

      <RapportiListPanelPagination {...pagination} />
    </div>
  )
}
