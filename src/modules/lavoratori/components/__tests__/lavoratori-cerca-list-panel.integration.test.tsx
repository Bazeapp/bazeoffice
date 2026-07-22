import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import type { Table } from "@tanstack/react-table"

import type { FilterGroup } from "@/components/data-table/data-table-filters"
import { renderWithProviders } from "@/test/test-utils"
import {
  makeLavoratoriDataReturn,
  makeWorkerListItem,
  makeWorkerRow,
} from "./gate1-view-test-fixtures"
import { LavoratoriCercaListPanel } from "../lavoratori-cerca-list-panel"
import type { LavoratoreRecord } from "../../types"

describe("LavoratoriCercaListPanel", () => {
  it("calls setSelectedWorkerId when a worker card is clicked", () => {
    const setSelectedWorkerId = vi.fn()
    const rowA = makeWorkerRow({ id: "w-a", nome: "Anna", cognome: "Bianchi" })
    const rowB = makeWorkerRow({ id: "w-b", nome: "Luca", cognome: "Verdi" })
    const data = makeLavoratoriDataReturn(
      {},
      {
        workers: [makeWorkerListItem(rowA), makeWorkerListItem(rowB)],
        workerRows: [rowA, rowB],
        selectedWorkerId: "w-a",
        setSelectedWorkerId,
      },
    )

    renderWithProviders(
      <LavoratoriCercaListPanel
        workers={data.workers}
        workersTotal={data.workersTotal}
        selectedWorkerId={data.selectedWorkerId}
        setSelectedWorkerId={setSelectedWorkerId}
        loading={false}
        error={null}
        table={data.table as Table<LavoratoreRecord>}
        searchValue=""
        setSearchValue={vi.fn()}
        filters={data.filters as FilterGroup}
        setFilters={vi.fn()}
        filterFields={[]}
        savedViews={[]}
        activeViewId={null}
        saveCurrentView={vi.fn()}
        applySavedView={vi.fn()}
        deleteSavedView={vi.fn()}
        applyFilters={vi.fn()}
        hasPendingFilters={false}
        onRequestSchema={vi.fn()}
        currentPage={1}
        pageCount={1}
        setPageIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId("lavoratore-card-w-b"))

    expect(setSelectedWorkerId).toHaveBeenCalled()
    const updater = setSelectedWorkerId.mock.calls.at(-1)?.[0]
    expect(typeof updater).toBe("function")
    expect((updater as (prev: string) => string | null)("w-a")).toBe("w-b")
  })

  it("calls applyFilters from the toolbar when pending filters are confirmed", () => {
    const applyFilters = vi.fn()
    const data = makeLavoratoriDataReturn({ hasPendingFilters: true, applyFilters })

    renderWithProviders(
      <LavoratoriCercaListPanel
        workers={data.workers}
        workersTotal={data.workersTotal}
        selectedWorkerId={null}
        setSelectedWorkerId={vi.fn()}
        loading={false}
        error={null}
        table={data.table as Table<LavoratoreRecord>}
        searchValue=""
        setSearchValue={vi.fn()}
        filters={data.filters as FilterGroup}
        setFilters={vi.fn()}
        filterFields={[]}
        savedViews={[]}
        activeViewId={null}
        saveCurrentView={vi.fn()}
        applySavedView={vi.fn()}
        deleteSavedView={vi.fn()}
        applyFilters={applyFilters}
        hasPendingFilters
        onRequestSchema={vi.fn()}
        currentPage={1}
        pageCount={1}
        setPageIndex={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTitle("Filtri avanzati"))
    fireEvent.click(screen.getByRole("button", { name: "Applica filtri" }))

    expect(applyFilters).toHaveBeenCalledTimes(1)
  })
})
