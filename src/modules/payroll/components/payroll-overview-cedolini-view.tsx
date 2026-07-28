import * as React from "react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { SearchInput } from "@/components/ui/search-input"
import { SEARCH_CHANGE_EVENT } from "@/lib/search-change"

import { useCedoliniBoardSelection } from "../hooks/use-cedolini-board-selection"
import { usePayrollBoard } from "../hooks/use-payroll-board"
import {
  buildPayrollMetrics,
  createDefaultCedoliniFilters,
  filterCedoliniColumns,
  getCurrentMonthValue,
  readCedoliniUrlState,
  replaceCedoliniUrlState,
  toggleCedoliniFilter,
  type CedoliniFilterGroupKey,
  type CedoliniFilters,
  type CedoliniMode,
} from "../lib"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  cedolinoCommentRow,
  cedolinoDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { useBoardEntityDeepLink } from "@/modules/notifiche/hooks"
import { CedoliniModeTabs } from "./cedolini-mode-tabs"
import { CedoliniControlliView } from "./cedolini-controlli-view"
import { CedoliniPagamentiView } from "./cedolini-pagamenti-view"
import { PayrollOverviewCedoliniBoard } from "./payroll-overview-cedolini-board"
import { PayrollOverviewCedoliniFilterBar } from "./payroll-overview-cedolini-filter-bar"
import { PayrollOverviewCedoliniMonthSwitcher } from "./payroll-overview-cedolini-month-switcher"

function readCedoliniStateFromWindow(): { mode: CedoliniMode; month: string } {
  if (typeof window === "undefined") {
    return { mode: "board", month: getCurrentMonthValue() }
  }
  return readCedoliniUrlState(window.location.search, {
    mode: "board",
    month: getCurrentMonthValue(),
  })
}

export function PayrollOverviewCedoliniView() {
  const initial = React.useMemo(() => readCedoliniStateFromWindow(), [])
  const [selectedMonth, setSelectedMonth] = React.useState(initial.month)
  const [mode, setMode] = React.useState<CedoliniMode>(initial.mode)
  const {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
    enrichCardFromDetail,
    detailRefreshTick,
  } = usePayrollBoard(selectedMonth)
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchValue, setSearchValue] = React.useState("")
  const [filters, setFilters] = React.useState<CedoliniFilters>(createDefaultCedoliniFilters)

  const selection = useCedoliniBoardSelection({
    columns,
    enrichCardFromDetail,
    detailRefreshTick,
  })
  const { openCard } = selection

  useBoardEntityDeepLink({
    entityType: "cedolino",
    onOpen: (cedolinoId) => {
      openCard(cedolinoId)
      return true
    },
    retryKey: true,
  })

  const syncStateFromUrl = React.useEffectEvent(() => {
    const next = readCedoliniStateFromWindow()
    setSelectedMonth(next.month)
    setMode(next.mode)
  })

  React.useEffect(() => {
    const onUrlChange = () => {
      syncStateFromUrl()
    }
    window.addEventListener("popstate", onUrlChange)
    window.addEventListener(SEARCH_CHANGE_EVENT, onUrlChange)
    return () => {
      window.removeEventListener("popstate", onUrlChange)
      window.removeEventListener(SEARCH_CHANGE_EVENT, onUrlChange)
    }
  }, [])

  const persistUrlState = React.useCallback((nextMode: CedoliniMode, nextMonth: string) => {
    replaceCedoliniUrlState({ mode: nextMode, month: nextMonth })
  }, [])

  const handleModeChange = React.useCallback(
    (nextMode: CedoliniMode) => {
      setMode(nextMode)
      persistUrlState(nextMode, selectedMonth)
    },
    [persistUrlState, selectedMonth],
  )

  const handleMonthChange = React.useCallback(
    (nextMonth: string) => {
      setSelectedMonth(nextMonth)
      persistUrlState(mode, nextMonth)
    },
    [mode, persistUrlState],
  )

  const toggleFilter = React.useCallback((group: CedoliniFilterGroupKey, value: string) => {
    setFilters((current) => toggleCedoliniFilter(current, group, value))
  }, [])

  const filteredColumns = React.useMemo(
    () => filterCedoliniColumns(columns, filters, searchValue),
    [columns, searchValue, filters],
  )

  const payrollMetrics = React.useMemo(
    () => buildPayrollMetrics(filteredColumns),
    [filteredColumns],
  )
  const metricGroups = [
    payrollMetrics.slice(0, 2),
    payrollMetrics.slice(2, 5),
    payrollMetrics.slice(5),
  ]

  const totalCedolini = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  )

  const selectedCard = selection.selectedCard

  useCommentRouteContext({
    enabled: Boolean(selection.selectedCardId && selectedCard),
    pageFocus:
      selection.selectedCardId && selectedCard
        ? { entityType: "cedolino", entityId: selection.selectedCardId }
        : null,
    row: selectedCard ? cedolinoCommentRow(selectedCard) : {},
    sourceInterface: "cedolini",
    displayNames: selectedCard ? cedolinoDisplayNames(selectedCard) : undefined,
  })

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalCedolini} ${totalCedolini === 1 ? "cedolino" : "cedolini"}`}
        >
          Cedolini
        </SectionHeader.Title>
        <SectionHeader.Center>
          <CedoliniModeTabs value={mode} onChange={handleModeChange} />
        </SectionHeader.Center>
        <SectionHeader.Actions>
          <PayrollOverviewCedoliniMonthSwitcher value={selectedMonth} onChange={handleMonthChange} />
        </SectionHeader.Actions>
        {mode === "board" ? (
          <SectionHeader.Toolbar>
            <SearchInput
              className="md:max-w-sm"
              data-testid="cedolini-search-input"
              placeholder="Cerca per famiglia, lavoratore, email..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue("")}
            />
            <PayrollOverviewCedoliniFilterBar filters={filters} onToggle={toggleFilter} />
          </SectionHeader.Toolbar>
        ) : null}
      </SectionHeader>

      {mode === "board" ? (
        <PayrollOverviewCedoliniBoard
          loading={loading}
          error={error}
          metricGroups={metricGroups}
          filteredColumns={filteredColumns}
          columns={columns}
          selectedCardId={selection.selectedCardId}
          selectedCard={selection.selectedCard}
          onOpenCard={selection.openCard}
          onCloseCard={selection.closeCard}
          draggingRecordId={draggingRecordId}
          setDraggingRecordId={setDraggingRecordId}
          dropTargetColumnId={dropTargetColumnId}
          setDropTargetColumnId={setDropTargetColumnId}
          onMoveCard={(recordId, targetStageId) => {
            void moveCard(recordId, targetStageId)
            selection.patchSelectedCard(recordId, {
              stato_mese_lavorativo: targetStageId,
            })
          }}
          onPatchCard={(recordId, patch) => {
            void patchCard(recordId, patch)
            selection.patchSelectedCard(recordId, patch)
          }}
          onPatchPresence={(recordId, patch) => {
            void patchPresence(recordId, patch)
            selection.patchSelectedPresence(recordId, patch)
          }}
        />
      ) : mode === "controlli" ? (
        <CedoliniControlliView selectedMonth={selectedMonth} columns={columns} />
      ) : (
        <CedoliniPagamentiView selectedMonth={selectedMonth} columns={columns} />
      )}
    </section>
  )
}
