import * as React from "react"
import type { SortingState } from "@tanstack/react-table"
import type { RuleGroupType } from "react-querybuilder"
import { DownloadIcon, FunnelIcon, LayersIcon, PlusIcon, XIcon } from "lucide-react"

import { AnagraficheAgGrid } from "@/components/anagrafiche/anagrafiche-ag-grid"
import { formatCellValue, toReadableColumnLabel } from "@/components/anagrafiche/anagrafiche-ag-grid"
import {
  AnagraficheQueryBuilder,
  emptyServerFilterGroup,
  makeEmptyRuleGroup,
  queryBuilderToFilterGroup,
  toQueryBuilderFields,
} from "@/components/anagrafiche/anagrafiche-query-builder"
import { createEmptyGroup } from "@/components/data-table/data-table-filters"
import { Button } from "@/components/ui-next/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui-next/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui-next/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-next/tabs"
import { toast } from "sonner"
import {
  type AnagraficaRow,
  type AnagraficheTab,
  useAnagraficheData,
} from "@/hooks/use-anagrafiche-data"
import {
  fetchFamiglie,
  fetchLavoratori,
  fetchMesiLavorati,
  fetchPagamenti,
  fetchProcessiMatching,
  fetchRapportiLavorativi,
  fetchSelezioniLavoratori,
  type TableColumnMeta,
} from "@/lib/anagrafiche-api"

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
const EXPORT_PAGE_SIZE = 500

function getRecordTitle(row: AnagraficaRow) {
  const fullName = [row.nome, row.cognome]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ")

  if (fullName) return fullName

  for (const key of ["nome", "titolo", "name", "id"]) {
    const value = row[key]
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }

  return "Dettaglio record"
}

function getTabLabel(tab: TabValue) {
  switch (tab) {
    case "famiglie":
      return "Famiglia"
    case "processi":
      return "Processo"
    case "lavoratori":
      return "Lavoratore"
    case "mesi_lavorati":
      return "Mese lavorato"
    case "pagamenti":
      return "Pagamento"
    case "selezioni_lavoratori":
      return "Selezione lavoratore"
    case "rapporti_lavorativi":
      return "Rapporto lavorativo"
  }
}


function getOrderedRecordFields(row: AnagraficaRow, columns: TableColumnMeta[]) {
  const orderedKeys = columns.map((column) => column.name)
  const extraKeys = Object.keys(row).filter((key) => !orderedKeys.includes(key))
  return [...orderedKeys, ...extraKeys].filter((key) => key in row)
}

function renderReadonlyValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">-</span>
  }

  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted-foreground">-</span>

    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <span
            key={`${index}-${formatCellValue(item)}`}
            className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
          >
            {formatCellValue(item)}
          </span>
        ))}
      </div>
    )
  }

  if (typeof value === "object") {
    return (
      <pre className="max-h-64 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }

  return <span className="whitespace-pre-wrap break-words">{formatCellValue(value)}</span>
}

function AnagraficaRecordSheet({
  open,
  row,
  columns,
  tab,
  onOpenChange,
}: {
  open: boolean
  row: AnagraficaRow | null
  columns: TableColumnMeta[]
  tab: TabValue
  onOpenChange: (open: boolean) => void
}) {
  const fields = React.useMemo(
    () => (row ? getOrderedRecordFields(row, columns) : []),
    [columns, row]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-5xl">
        <SheetHeader className="border-b px-6 py-5 text-left">
          <p className="ui-type-label text-muted-foreground">
            {getTabLabel(tab)}
          </p>
          <SheetTitle className="ui-heading-3">
            {row ? getRecordTitle(row) : "Dettaglio record"}
          </SheetTitle>
          {row?.id ? (
            <p className="font-mono text-xs text-muted-foreground">{String(row.id)}</p>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {row ? (
            <div className="grid gap-3">
              {fields.map((field) => (
                <div key={field} className="min-w-0 rounded-xl border bg-background p-4">
                  <div className="ui-type-label mb-2 text-muted-foreground">
                    {toReadableColumnLabel(field)}
                  </div>
                  <div className="min-w-0 text-sm text-foreground">{renderReadonlyValue(row[field])}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ""

  const serialized = Array.isArray(value)
    ? value.map((item) => formatCellValue(item)).join("; ")
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value)

  return `"${serialized.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: AnagraficaRow[], columns: TableColumnMeta[]) {
  const keysFromColumns = columns.map((column) => column.name)
  const extraKeys = rows.flatMap((row) => Object.keys(row)).filter((key) => !keysFromColumns.includes(key))
  const keys = [...keysFromColumns, ...Array.from(new Set(extraKeys))].filter((key) =>
    rows.some((row) => key in row)
  )

  const header = keys.map((key) => csvEscape(toReadableColumnLabel(key))).join(",")
  const body = rows.map((row) => keys.map((key) => csvEscape(row[key])).join(",")).join("\n")
  const csv = [header, body].filter(Boolean).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function buildProcessExportQuery(
  searchValue: string,
  filters: TableQueryState["filters"]
) {
  if (!searchValue) {
    return { search: undefined, filters }
  }

  const familyResult = await fetchFamiglie({
    limit: EXPORT_PAGE_SIZE,
    offset: 0,
    select: ["id"],
    search: searchValue,
    searchFields: ["nome", "cognome", "email", "telefono"],
  })
  const familyIds = familyResult.rows
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id))

  if (!familyIds.length) {
    return { search: searchValue, filters }
  }

  return {
    search: undefined,
    filters: {
      kind: "group" as const,
      id: "process-family-export-root",
      logic: "and" as const,
      nodes: [
        filters,
        {
          kind: "condition" as const,
          id: "process-family-export-filter",
          field: "famiglia_id",
          operator: "in" as const,
          value: familyIds.join(","),
        },
      ],
    },
  }
}

type GroupOption = {
  label: string
  value: string
}

function makeDefaultQueryState(): TableQueryState {
  return {
    searchValue: "",
    filters: createEmptyGroup("and"),
    sorting: [],
    grouping: [],
  }
}

function GroupByControl({
  grouping,
  options,
  onGroupingChange,
}: {
  grouping: string[]
  options: GroupOption[]
  onGroupingChange: (next: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draftGrouping, setDraftGrouping] = React.useState(grouping)
  const canAddGroup = draftGrouping.length < options.length
  const hasChanges = JSON.stringify(draftGrouping) !== JSON.stringify(grouping)

  React.useEffect(() => {
    if (open) return
    setDraftGrouping(grouping)
  }, [grouping, open])

  function addGroup() {
    const used = new Set(draftGrouping)
    const firstGroup = options.find((option) => !used.has(option.value))?.value
    if (!firstGroup) return
    setDraftGrouping([...draftGrouping, firstGroup])
  }

  function updateGroup(index: number, value: string) {
    const isDuplicate = draftGrouping.some(
      (currentValue, currentIndex) => currentIndex !== index && currentValue === value
    )
    if (isDuplicate) return

    const next = [...draftGrouping]
    if (!next[index]) return
    next[index] = value
    setDraftGrouping(next)
  }

  function removeGroup(index: number) {
    setDraftGrouping(draftGrouping.filter((_, currentIndex) => currentIndex !== index))
  }

  function applyGrouping() {
    onGroupingChange(draftGrouping)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={grouping.length > 0 ? "default" : "outline"}
          size="icon"
          aria-label={`Group by (${grouping.length})`}
          title={`Group by (${grouping.length})`}
        >
          <LayersIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} className="w-[min(92vw,560px)] p-0">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-medium">Group by</div>
        </div>
        <div className="space-y-3 px-4 py-3">
          {draftGrouping.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nessun raggruppamento attivo.</p>
          ) : (
            draftGrouping.map((value, index) => {
              const usedByOthers = new Set(draftGrouping.filter((_, currentIndex) => currentIndex !== index))
              const allowedGroups = options.filter((option) => !usedByOthers.has(option.value))

              return (
                <div key={`${value}-${index}`} className="flex items-center gap-2">
                  <Select value={value} onValueChange={(nextValue) => updateGroup(index, nextValue)}>
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedGroups.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeGroup(index)}>
                    <XIcon />
                  </Button>
                </div>
              )
            })
          )}

          <Button type="button" variant="ghost" size="sm" onClick={addGroup} disabled={!canAddGroup}>
            <PlusIcon />
            Add another group
          </Button>
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraftGrouping(grouping)
              setOpen(false)
            }}
          >
            Annulla
          </Button>
          <Button type="button" size="sm" onClick={applyGrouping} disabled={!hasChanges}>
            Applica filtri
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
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
    mesi_lavorati: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    pagamenti: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    selezioni_lavoratori: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    rapporti_lavorativi: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  })
  const [queryByTab, setQueryByTab] = React.useState<Record<TabValue, TableQueryState>>({
    famiglie: makeDefaultQueryState(),
    processi: makeDefaultQueryState(),
    lavoratori: makeDefaultQueryState(),
    mesi_lavorati: makeDefaultQueryState(),
    pagamenti: makeDefaultQueryState(),
    selezioni_lavoratori: makeDefaultQueryState(),
    rapporti_lavorativi: makeDefaultQueryState(),
  })
  const [filterBuilderOpenByTab, setFilterBuilderOpenByTab] = React.useState<Record<TabValue, boolean>>({
    famiglie: false,
    processi: false,
    lavoratori: false,
    mesi_lavorati: false,
    pagamenti: false,
    selezioni_lavoratori: false,
    rapporti_lavorativi: false,
  })
  const [filterDraftByTab, setFilterDraftByTab] = React.useState<Record<TabValue, RuleGroupType>>({
    famiglie: makeEmptyRuleGroup(),
    processi: makeEmptyRuleGroup(),
    lavoratori: makeEmptyRuleGroup(),
    mesi_lavorati: makeEmptyRuleGroup(),
    pagamenti: makeEmptyRuleGroup(),
    selezioni_lavoratori: makeEmptyRuleGroup(),
    rapporti_lavorativi: makeEmptyRuleGroup(),
  })
  const [selectedRecord, setSelectedRecord] = React.useState<AnagraficaRow | null>(null)
  const [exportingCsv, setExportingCsv] = React.useState(false)
  const activePagination = paginationByTab[activeTab]
  const activeQuery = queryByTab[activeTab]
  const activeFilterDraft = filterDraftByTab[activeTab]
  const { 
    workers,
    families,
    processes,
    workedMonths,
    payments,
    workerSelections,
    workRelations,
    workersTotal,
    familiesTotal,
    processesTotal,
    workedMonthsTotal,
    paymentsTotal,
    workerSelectionsTotal,
    workRelationsTotal,
    workersColumns,
    familiesColumns,
    processesColumns,
    workedMonthsColumns,
    paymentsColumns,
    workerSelectionsColumns,
    workRelationsColumns,
    workersGroups,
    familiesGroups,
    processesGroups,
    workedMonthsGroups,
    paymentsGroups,
    workerSelectionsGroups,
    workRelationsGroups,
    lookupColors,
    lookupOptions,
    lookupFilterTypes,
    loading,
    error,
    loadGroupRows,
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
        groups: processesGroups,
        entityTable: "processi_matching" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: processesColumns.map((column) => column.name),
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
        groups: workersGroups,
        entityTable: "lavoratori" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: workersColumns.map((column) => column.name),
          columnsByName: new Map(workersColumns.map((column) => [column.name, column])),
          entityTable: "lavoratori",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in lavoratori...",
        totalRows: workersTotal,
      }
    }

    if (activeTab === "mesi_lavorati") {
      return {
        key: "mesi_lavorati",
        data: workedMonths,
        metaColumns: workedMonthsColumns,
        groups: workedMonthsGroups,
        entityTable: "mesi_lavorati" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: workedMonthsColumns.map((column) => column.name),
          columnsByName: new Map(workedMonthsColumns.map((column) => [column.name, column])),
          entityTable: "mesi_lavorati",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in mesi lavorati...",
        totalRows: workedMonthsTotal,
      }
    }

    if (activeTab === "pagamenti") {
      return {
        key: "pagamenti",
        data: payments,
        metaColumns: paymentsColumns,
        groups: paymentsGroups,
        entityTable: "pagamenti" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: paymentsColumns.map((column) => column.name),
          columnsByName: new Map(paymentsColumns.map((column) => [column.name, column])),
          entityTable: "pagamenti",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in pagamenti...",
        totalRows: paymentsTotal,
      }
    }

    if (activeTab === "selezioni_lavoratori") {
      return {
        key: "selezioni_lavoratori",
        data: workerSelections,
        metaColumns: workerSelectionsColumns,
        groups: workerSelectionsGroups,
        entityTable: "selezioni_lavoratori" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: workerSelectionsColumns.map((column) => column.name),
          columnsByName: new Map(workerSelectionsColumns.map((column) => [column.name, column])),
          entityTable: "selezioni_lavoratori",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in selezioni lavoratori...",
        totalRows: workerSelectionsTotal,
      }
    }

    if (activeTab === "rapporti_lavorativi") {
      return {
        key: "rapporti_lavorativi",
        data: workRelations,
        metaColumns: workRelationsColumns,
        groups: workRelationsGroups,
        entityTable: "rapporti_lavorativi" as const,
        queryBuilderFields: toQueryBuilderFields({
          keys: workRelationsColumns.map((column) => column.name),
          columnsByName: new Map(workRelationsColumns.map((column) => [column.name, column])),
          entityTable: "rapporti_lavorativi",
          lookupOptions,
          lookupFilterTypes,
        }),
        searchPlaceholder: "Cerca in rapporti lavorativi...",
        totalRows: workRelationsTotal,
      }
    }

    return {
      key: "famiglie",
      data: families,
      metaColumns: familiesColumns,
      groups: familiesGroups,
      entityTable: "famiglie" as const,
      queryBuilderFields: toQueryBuilderFields({
        keys: familiesColumns.map((column) => column.name),
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
    familiesGroups,
    lookupFilterTypes,
    lookupOptions,
    payments,
    paymentsColumns,
    paymentsGroups,
    paymentsTotal,
    processes,
    processesColumns,
    processesGroups,
    processesTotal,
    workedMonths,
    workedMonthsColumns,
    workedMonthsGroups,
    workedMonthsTotal,
    workerSelections,
    workerSelectionsColumns,
    workerSelectionsGroups,
    workerSelectionsTotal,
    workRelations,
    workRelationsColumns,
    workRelationsGroups,
    workRelationsTotal,
    workers,
    workersColumns,
    workersGroups,
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

  const handleGroupingChange = React.useCallback(
    (nextGrouping: string[]) => {
      setPaginationByTab((previous) => ({
        ...previous,
        [activeTab]: {
          ...previous[activeTab],
          pageIndex: 0,
        },
      }))

      setQueryByTab((previous) => {
        const current = previous[activeTab]
        const currentSignature = JSON.stringify(current.grouping)
        const nextSignature = JSON.stringify(nextGrouping)
        if (currentSignature === nextSignature) return previous

        return {
          ...previous,
          [activeTab]: {
            ...current,
            grouping: nextGrouping,
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

  const handleRecordSheetOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setSelectedRecord(null)
    }
  }, [])

  const handleExportCsv = React.useCallback(async () => {
    if (exportingCsv) return

    setExportingCsv(true)
    const toastId = toast.loading("Preparazione export CSV...")

    try {
      const normalizedSearch = activeQuery.searchValue.trim()
      const groupOrderBy = activeQuery.grouping.map((field) => ({ field, ascending: true }))
      const sortOrderBy = activeQuery.sorting.map((item) => ({ field: item.id, ascending: !item.desc }))
      const orderBy = [...groupOrderBy, ...sortOrderBy].filter(
        (item, index, self) =>
          index === self.findIndex((candidate) => candidate.field === item.field)
      )
      const expectedTotal = tableConfig.totalRows
      const rows: AnagraficaRow[] = []
      const searchQuery =
        activeTab === "processi"
          ? await buildProcessExportQuery(normalizedSearch, activeQuery.filters)
          : { search: normalizedSearch || undefined, filters: activeQuery.filters }

      for (let offset = 0; offset < expectedTotal; offset += EXPORT_PAGE_SIZE) {
        const query = {
          limit: EXPORT_PAGE_SIZE,
          offset,
          select: ["*"],
          orderBy,
          search: searchQuery.search,
          filters: searchQuery.filters,
        }
        const result =
          activeTab === "processi"
            ? await fetchProcessiMatching(query)
            : activeTab === "lavoratori"
              ? await fetchLavoratori(query)
              : activeTab === "mesi_lavorati"
                ? await fetchMesiLavorati(query)
                : activeTab === "pagamenti"
                  ? await fetchPagamenti(query)
                  : activeTab === "selezioni_lavoratori"
                    ? await fetchSelezioniLavoratori(query)
                    : activeTab === "rapporti_lavorativi"
                      ? await fetchRapportiLavorativi(query)
                      : await fetchFamiglie(query)

        rows.push(...(result.rows as AnagraficaRow[]))

        if (result.rows.length === 0 || rows.length >= result.total) break
      }

      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(`anagrafiche-${activeTab}-${date}.csv`, rows, tableConfig.metaColumns)
      toast.success(`Export completato: ${rows.length} record`, { id: toastId })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Errore export CSV"
      toast.error(message, { id: toastId })
    } finally {
      setExportingCsv(false)
    }
  }, [activeQuery, activeTab, exportingCsv, tableConfig.metaColumns, tableConfig.totalRows])

  React.useEffect(() => {
    setSelectedRecord(null)
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
    <section className="ui-next w-full min-w-0 space-y-4 px-4 pb-2 pt-4">
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
        <TabsList
          variant="line"
          className="h-auto justify-start overflow-x-auto whitespace-nowrap"
        >
          <TabsTrigger value="famiglie">Famiglie</TabsTrigger>
          <TabsTrigger value="processi">Processi</TabsTrigger>
          <TabsTrigger value="lavoratori">Lavoratori</TabsTrigger>
          <TabsTrigger value="mesi_lavorati">Mesi lavorati</TabsTrigger>
          <TabsTrigger value="pagamenti">Pagamenti</TabsTrigger>
          <TabsTrigger value="selezioni_lavoratori">Selezioni lavoratori</TabsTrigger>
          <TabsTrigger value="rapporti_lavorativi">Rapporti lavorativi</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="min-w-0">
          <AnagraficheAgGrid
            key={tableConfig.key}
            rows={tableConfig.data}
            columns={tableConfig.metaColumns}
            entityTable={tableConfig.entityTable}
            lookupColors={lookupColors}
            groups={tableConfig.groups}
            searchPlaceholder={tableConfig.searchPlaceholder}
            searchValue={activeQuery.searchValue}
            sorting={activeQuery.sorting}
            grouping={activeQuery.grouping}
            totalRows={tableConfig.totalRows}
            pageIndex={activePagination.pageIndex}
            pageSize={activePagination.pageSize}
            toolbarActions={
              <div className="relative flex shrink-0 items-center gap-2">
                <GroupByControl
                  grouping={activeQuery.grouping}
                  options={tableConfig.queryBuilderFields.map((field) => ({
                    label: field.label,
                    value: field.name,
                  }))}
                  onGroupingChange={handleGroupingChange}
                />
                <Button
                  type="button"
                  variant={filterBuilderOpenByTab[activeTab] ? "default" : "outline"}
                  size="icon"
                  aria-label="Filtri avanzati"
                  title="Filtri avanzati"
                  onClick={() => handleFilterOpenChange(!filterBuilderOpenByTab[activeTab])}
                >
                  <FunnelIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Reset filtri"
                  title="Reset filtri"
                  disabled={JSON.stringify(activeQuery.filters) === JSON.stringify(emptyServerFilterGroup())}
                  onClick={handleResetFilters}
                >
                  <XIcon />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Export CSV"
                  title="Export CSV"
                  disabled={exportingCsv || tableConfig.totalRows === 0}
                  onClick={handleExportCsv}
                >
                  <DownloadIcon />
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
            onLoadGroupRows={loadGroupRows}
            onSearchValueChange={handleSearchValueChange}
            onSortingChange={handleSortingChange}
            onPaginationChange={handleTabPaginationChange}
            onRowOpen={setSelectedRecord}
          />
        </TabsContent>
      </Tabs>

      <AnagraficaRecordSheet
        open={selectedRecord !== null}
        row={selectedRecord}
        columns={tableConfig.metaColumns}
        tab={activeTab}
        onOpenChange={handleRecordSheetOpenChange}
      />
    </section>
  )
}
