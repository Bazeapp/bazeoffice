import * as React from "react"
import type { SortingState } from "@tanstack/react-table"
import type { RuleGroupType } from "react-querybuilder"
import { FunnelIcon, XIcon } from "lucide-react"

import { AnagraficheAgGrid } from "@/components/anagrafiche/anagrafiche-ag-grid"
import {
  AnagraficheQueryBuilder,
  emptyServerFilterGroup,
  makeEmptyRuleGroup,
  queryBuilderToFilterGroup,
  toKeysFromRows,
  toQueryBuilderFields,
} from "@/components/anagrafiche/anagrafiche-query-builder"
import { createEmptyGroup } from "@/components/data-table/data-table-filters"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  type AnagraficheTab,
  useAnagraficheData,
} from "@/hooks/use-anagrafiche-data"

type TabValue = AnagraficheTab
type PaginationState = {
  pageIndex: number
  pageSize: number
}

type TableQueryState = {
  searchValue: string
  filters: ReturnType<typeof createEmptyGroup>
  sorting: SortingState
  grouping: string[]
}

const DEFAULT_PAGE_SIZE = 50
function makeDefaultQueryState(): TableQueryState {
  return {
    searchValue: "",
    filters: createEmptyGroup("and"),
    sorting: [],
    grouping: [],
  }
}

type AnagraficheTablesViewProps = {
  activeTab?: TabValue
  onActiveTabChange?: (tab: TabValue) => void
}

export function AnagraficheTablesView({
  activeTab: activeTabProp,
  onActiveTabChange,
}: AnagraficheTablesViewProps = {}) {
  const loadingToastIdRef = React.useRef<string | number | null>(null)
  const [internalActiveTab, setInternalActiveTab] = React.useState<TabValue>(
    activeTabProp ?? "famiglie"
  )
  const activeTab = activeTabProp ?? internalActiveTab
  const setActiveTab = React.useCallback(
    (nextTab: TabValue) => {
      if (activeTabProp === undefined) {
        setInternalActiveTab(nextTab)
      }
      onActiveTabChange?.(nextTab)
    },
    [activeTabProp, onActiveTabChange]
  )
  const [paginationByTab, setPaginationByTab] = React.useState<
    Record<TabValue, PaginationState>
  >({
    famiglie: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    processi: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    lavoratori: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  })
  const [queryByTab, setQueryByTab] = React.useState<Record<TabValue, TableQueryState>>({
    famiglie: makeDefaultQueryState(),
    processi: makeDefaultQueryState(),
    lavoratori: makeDefaultQueryState(),
  })
  const [filterBuilderOpenByTab, setFilterBuilderOpenByTab] = React.useState<Record<TabValue, boolean>>({
    famiglie: false,
    processi: false,
    lavoratori: false,
  })
  const [filterDraftByTab, setFilterDraftByTab] = React.useState<Record<TabValue, RuleGroupType>>({
    famiglie: makeEmptyRuleGroup(),
    processi: makeEmptyRuleGroup(),
    lavoratori: makeEmptyRuleGroup(),
  })
  const activePagination = paginationByTab[activeTab]
  const activeQuery = queryByTab[activeTab]
  const activeFilterDraft = filterDraftByTab[activeTab]
  const { 
    workers,
    families,
    processes,
    workersTotal,
    familiesTotal,
    processesTotal,
    workersColumns,
    familiesColumns,
    processesColumns,
    lookupColors,
    lookupOptions,
    lookupFilterTypes,
    loading,
    error,
  } = useAnagraficheData({
    activeTab,
    pageIndex: activePagination.pageIndex,
    pageSize: activePagination.pageSize,
    searchValue: activeQuery.searchValue,
    filters: activeQuery.filters,
    sorting: activeQuery.sorting,
    grouping: activeQuery.grouping,
  })

  const tableConfig = React.useMemo(() => {
    if (activeTab === "processi") {
      return {
        key: "processi",
        data: processes,
        metaColumns: processesColumns,
        entityTable: "processi_matching" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: toKeysFromRows(processes, processesColumns.map((column) => column.name)),
          columnsByName: new Map(processesColumns.map((column) => [column.name, column])),
          entityTable: "processi_matching",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in processi...",
        totalRows: processesTotal,
      }
    }

    if (activeTab === "lavoratori") {
      return {
        key: "lavoratori",
        data: workers,
        metaColumns: workersColumns,
        entityTable: "lavoratori" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: toKeysFromRows(workers, workersColumns.map((column) => column.name)),
          columnsByName: new Map(workersColumns.map((column) => [column.name, column])),
          entityTable: "lavoratori",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in lavoratori...",
        totalRows: workersTotal,
      }
    }

    return {
      key: "famiglie",
      data: families,
      metaColumns: familiesColumns,
      entityTable: "famiglie" as const,
      queryBuilderFields: toQueryBuilderFields({
        keys: toKeysFromRows(families, familiesColumns.map((column) => column.name)),
        columnsByName: new Map(familiesColumns.map((column) => [column.name, column])),
        entityTable: "famiglie",
        lookupOptions,
        lookupFilterTypes,
      }),
      searchPlaceholder: "Cerca in famiglie...",
      totalRows: familiesTotal,
    }
  }, [
    activeTab,
    families,
    familiesTotal,
    familiesColumns,
    lookupFilterTypes,
    lookupOptions,
    processes,
    processesColumns,
    processesTotal,
    workers,
    workersColumns,
    workersTotal,
  ])

  const handleTabPaginationChange = React.useCallback(
    (next: PaginationState) => {
      setPaginationByTab((previous) => {
        const current = previous[activeTab]
        if (current.pageIndex === next.pageIndex && current.pageSize === next.pageSize) {
          return previous
        }

        return {
          ...previous,
          [activeTab]: next,
        }
      })
    },
    [activeTab]
  )

  const handleSearchValueChange = React.useCallback(
    (nextSearchValue: string) => {
      setPaginationByTab((previous) => ({
        ...previous,
        [activeTab]: {
          ...previous[activeTab],
          pageIndex: 0,
        },
      }))

      setQueryByTab((previous) => {
        const current = previous[activeTab]
        if (current.searchValue === nextSearchValue) return previous

        return {
          ...previous,
          [activeTab]: {
            ...current,
            searchValue: nextSearchValue,
          },
        }
      })
    },
    [activeTab]
  )

  const handleSortingChange = React.useCallback(
    (nextSorting: SortingState) => {
      setPaginationByTab((previous) => ({
        ...previous,
        [activeTab]: {
          ...previous[activeTab],
          pageIndex: 0,
        },
      }))

      setQueryByTab((previous) => {
        const current = previous[activeTab]
        const currentSignature = JSON.stringify(current.sorting)
        const nextSignature = JSON.stringify(nextSorting)
        if (currentSignature === nextSignature) return previous

        return {
          ...previous,
          [activeTab]: {
            ...current,
            sorting: nextSorting,
          },
        }
      })
    },
    [activeTab]
  )

  const handleFilterOpenChange = React.useCallback(
    (open: boolean) => {
      setFilterBuilderOpenByTab((previous) => ({
        ...previous,
        [activeTab]: open,
      }))
    },
    [activeTab]
  )

  const handleFilterDraftChange = React.useCallback(
    (nextDraft: RuleGroupType) => {
      setFilterDraftByTab((previous) => ({
        ...previous,
        [activeTab]: nextDraft,
      }))
    },
    [activeTab]
  )

  const handleApplyFilters = React.useCallback(() => {
    const fieldsByName = new Map(
      tableConfig.queryBuilderFields.map((field) => [field.name, field])
    )
    const nextFilters = queryBuilderToFilterGroup(activeFilterDraft, fieldsByName)

    setPaginationByTab((previous) => ({
      ...previous,
      [activeTab]: {
        ...previous[activeTab],
        pageIndex: 0,
      },
    }))

    setQueryByTab((previous) => ({
      ...previous,
      [activeTab]: {
        ...previous[activeTab],
        filters: nextFilters,
      },
    }))
  }, [activeFilterDraft, activeTab, tableConfig.queryBuilderFields])

  const handleResetFilters = React.useCallback(() => {
    setFilterDraftByTab((previous) => ({
      ...previous,
      [activeTab]: makeEmptyRuleGroup(),
    }))

    setPaginationByTab((previous) => ({
      ...previous,
      [activeTab]: {
        ...previous[activeTab],
        pageIndex: 0,
      },
    }))

    setQueryByTab((previous) => ({
      ...previous,
      [activeTab]: {
        ...previous[activeTab],
        filters: emptyServerFilterGroup(),
      },
    }))
  }, [activeTab])

  React.useEffect(() => {
    if (loading) {
      if (loadingToastIdRef.current == null) {
        loadingToastIdRef.current = toast.loading("Caricamento dati da Supabase...")
      }
      return
    }

    if (loadingToastIdRef.current != null) {
      toast.dismiss(loadingToastIdRef.current)
      loadingToastIdRef.current = null
    }
  }, [loading])

  React.useEffect(() => {
    return () => {
      if (loadingToastIdRef.current != null) {
        toast.dismiss(loadingToastIdRef.current)
        loadingToastIdRef.current = null
      }
    }
  }, [])

  return (
    <section className="w-full min-w-0 space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dati: {error}
        </div>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabValue)}
        className="w-full min-w-0"
      >
        <TabsList variant="default">
          <TabsTrigger value="famiglie">Famiglie</TabsTrigger>
          <TabsTrigger value="processi">Processi</TabsTrigger>
          <TabsTrigger value="lavoratori">Lavoratori</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="min-w-0">
          <AnagraficheAgGrid
            key={tableConfig.key}
            rows={tableConfig.data}
            columns={tableConfig.metaColumns}
            entityTable={tableConfig.entityTable}
            lookupColors={lookupColors}
            searchPlaceholder={tableConfig.searchPlaceholder}
            searchValue={activeQuery.searchValue}
            sorting={activeQuery.sorting}
            totalRows={tableConfig.totalRows}
            pageIndex={activePagination.pageIndex}
            pageSize={activePagination.pageSize}
            toolbarActions={
              <div className="relative flex flex-wrap items-start gap-2">
                <Button
                  type="button"
                  variant={filterBuilderOpenByTab[activeTab] ? "default" : "outline"}
                  onClick={() => handleFilterOpenChange(!filterBuilderOpenByTab[activeTab])}
                >
                  <FunnelIcon />
                  Filtri avanzati
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={JSON.stringify(activeQuery.filters) === JSON.stringify(emptyServerFilterGroup())}
                  onClick={handleResetFilters}
                >
                  <XIcon />
                  Reset
                </Button>

                {filterBuilderOpenByTab[activeTab] ? (
                  <div className="absolute top-full right-0 z-50 mt-2 w-[min(92vw,980px)]">
                    <AnagraficheQueryBuilder
                      fields={tableConfig.queryBuilderFields}
                      query={activeFilterDraft}
                      open
                      hideTrigger
                      onOpenChange={handleFilterOpenChange}
                      onQueryChange={handleFilterDraftChange}
                      onApply={handleApplyFilters}
                      onReset={handleResetFilters}
                    />
                  </div>
                ) : null}
              </div>
            }
            onSearchValueChange={handleSearchValueChange}
            onSortingChange={handleSortingChange}
            onPaginationChange={handleTabPaginationChange}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
