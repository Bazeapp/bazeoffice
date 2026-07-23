import * as React from "react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { SearchInput } from "@/components/ui/search-input"

import { useCedoliniBoardSelection } from "../hooks/use-cedolini-board-selection"
import { usePayrollBoard } from "../hooks/use-payroll-board"
import {
  buildPayrollMetrics,
  createDefaultCedoliniFilters,
  filterCedoliniColumns,
  getCurrentMonthValue,
  toggleCedoliniFilter,
  type CedoliniFilterGroupKey,
  type CedoliniFilters,
} from "../lib"
import { CedoliniModeTabs, type CedoliniMode } from "./cedolini-mode-tabs"
import { CedoliniControlliView } from "./cedolini-controlli-view"
import { CedoliniPagamentiView } from "./cedolini-pagamenti-view"
import { PayrollOverviewCedoliniBoard } from "./payroll-overview-cedolini-board"
import { PayrollOverviewCedoliniFilterBar } from "./payroll-overview-cedolini-filter-bar"
import { PayrollOverviewCedoliniMonthSwitcher } from "./payroll-overview-cedolini-month-switcher"

export function PayrollOverviewCedoliniView() {
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthValue)
  const [mode, setMode] = React.useState<CedoliniMode>("board")
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

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalCedolini} ${totalCedolini === 1 ? "cedolino" : "cedolini"}`}
        >
          Cedolini
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <CedoliniModeTabs value={mode} onChange={setMode} />
          <PayrollOverviewCedoliniMonthSwitcher value={selectedMonth} onChange={setSelectedMonth} />
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
          }}
          onPatchCard={(recordId, patch) => {
            void patchCard(recordId, patch)
          }}
          onPatchPresence={(recordId, patch) => {
            void patchPresence(recordId, patch)
          }}
        />
      ) : mode === "controlli" ? (
        <CedoliniControlliView selectedMonth={selectedMonth} columns={columns} />
      ) : (
        <CedoliniPagamentiView />
      )}
    </section>
  )
}
