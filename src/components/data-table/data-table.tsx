import {
  type ExpandedState,
  getPaginationRowModel,
  type Row,
  type Updater,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type ColumnDef,
  type GroupingState,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import * as React from "react"
import { ExpandIcon, PanelRightOpenIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import {
  createEmptyGroup,
  evaluateGroup,
  type FilterGroup,
  type FilterField,
} from "@/components/data-table/data-table-filters"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type GroupOption = {
  label: string
  value: string
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterFields: FilterField[]
  searchPlaceholder?: string
  groupOptions?: GroupOption[]
  viewsStorageKey?: string
  pageSize?: number
  manualPagination?: boolean
  totalRows?: number
  paginationState?: PaginationState
  onPaginationStateChange?: (next: PaginationState) => void
}

type CellPreviewState = {
  columnId: string
  value: string
} | null

type CellCoordinate = {
  rowId: string
  columnId: string
}

type TableSelection = {
  anchor: CellCoordinate
  focus: CellCoordinate
}

type SavedTableView = {
  id: string
  name: string
  searchValue: string
  filters: FilterGroup
  sorting: SortingState
  grouping: GroupingState
  createdAt: string
  updatedAt: string
}

function formatPreviewValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(", ")
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function shouldShowExpandAction(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "string") {
    return value.length > 48 || value.includes("\n") || value.startsWith("{")
  }
  if (Array.isArray(value)) return value.length > 1
  if (typeof value === "object") return true
  return false
}

function copyPlainText(text: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(text)
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand("copy")
    } finally {
      document.body.removeChild(textarea)
    }
  }

  return Promise.resolve()
}

function formatPanelValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function isValidSavedTableView(value: unknown): value is SavedTableView {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<SavedTableView>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.searchValue === "string" &&
    Array.isArray(candidate.sorting) &&
    Array.isArray(candidate.grouping) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    Boolean(candidate.filters && typeof candidate.filters === "object")
  )
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterFields,
  searchPlaceholder,
  groupOptions,
  viewsStorageKey,
  pageSize = 50,
  manualPagination = false,
  totalRows = 0,
  paginationState,
  onPaginationStateChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [searchValue, setSearchValue] = React.useState("")
  const [grouping, setGrouping] = React.useState<GroupingState>([])
  const [expanded, setExpanded] = React.useState<ExpandedState>(true)
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })
  const [filters, setFilters] = React.useState(() => createEmptyGroup("and"))
  const [cellPreview, setCellPreview] = React.useState<CellPreviewState>(null)
  const [selection, setSelection] = React.useState<TableSelection | null>(null)
  const [savedViews, setSavedViews] = React.useState<SavedTableView[]>([])
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null)
  const [recordPanelOpen, setRecordPanelOpen] = React.useState(false)
  const [recordPanelData, setRecordPanelData] = React.useState<
    Record<string, unknown> | null
  >(null)
  const [recordPanelTitle, setRecordPanelTitle] = React.useState("Dettaglio record")
  const tableWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const didLoadSavedViewsRef = React.useRef(false)
  const applyingSavedViewRef = React.useRef(false)
  const pagination = paginationState ?? internalPagination

  const handlePaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      if (paginationState) {
        const next =
          typeof updater === "function"
            ? updater(paginationState)
            : updater
        onPaginationStateChange?.(next)
        return
      }

      setInternalPagination((previous) => {
        const next =
          typeof updater === "function"
            ? updater(previous)
            : updater
        onPaginationStateChange?.(next)
        return next
      })
    },
    [onPaginationStateChange, paginationState]
  )

  React.useEffect(() => {
    const next = { ...pagination, pageSize }
    if (next.pageSize !== pagination.pageSize) {
      handlePaginationChange(next)
    }
  }, [handlePaginationChange, pageSize, pagination])

  React.useEffect(() => {
    if (!paginationState) return
    setInternalPagination(paginationState)
  }, [paginationState])

  React.useEffect(() => {
    didLoadSavedViewsRef.current = false

    if (!viewsStorageKey || typeof window === "undefined") {
      setSavedViews([])
      setActiveViewId(null)
      didLoadSavedViewsRef.current = true
      return
    }

    try {
      const raw = window.localStorage.getItem(viewsStorageKey)
      if (!raw) {
        setSavedViews([])
        setActiveViewId(null)
        didLoadSavedViewsRef.current = true
        return
      }

      const parsed = JSON.parse(raw) as unknown
      const loaded = Array.isArray(parsed)
        ? parsed.filter((item): item is SavedTableView => isValidSavedTableView(item))
        : []

      setSavedViews(loaded)
      setActiveViewId((previous) =>
        loaded.some((view) => view.id === previous) ? previous : null
      )
    } catch {
      setSavedViews([])
      setActiveViewId(null)
    } finally {
      didLoadSavedViewsRef.current = true
    }
  }, [viewsStorageKey])

  React.useEffect(() => {
    if (!viewsStorageKey || typeof window === "undefined") return
    if (!didLoadSavedViewsRef.current) return

    window.localStorage.setItem(viewsStorageKey, JSON.stringify(savedViews))
  }, [savedViews, viewsStorageKey])

  const filteredData = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return data.filter((row) => {
      const record = row as Record<string, unknown>
      const matchesComplexFilters = evaluateGroup(record, filters)

      if (!matchesComplexFilters) return false
      if (!query) return true

      return Object.values(record).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query)
      )
    })
  }, [data, filters, searchValue])

  React.useEffect(() => {
    if (manualPagination) return

    handlePaginationChange((previous) => {
      const maxPageIndex = Math.max(
        Math.ceil(filteredData.length / previous.pageSize) - 1,
        0
      )
      if (previous.pageIndex <= maxPageIndex) return previous
      return { ...previous, pageIndex: maxPageIndex }
    })
  }, [filteredData.length, handlePaginationChange, manualPagination])

  const manualPageCount = Math.max(Math.ceil(totalRows / pagination.pageSize), 1)

  const table = useReactTable({
    data: filteredData,
    columns,
    groupedColumnMode: "remove",
    manualPagination,
    pageCount: manualPagination ? manualPageCount : undefined,
    state: {
      sorting,
      grouping,
      expanded,
      pagination,
    },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    ...(manualPagination
      ? {}
      : {
          getPaginationRowModel: getPaginationRowModel(),
        }),
  })
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const renderColumnCount = visibleColumnCount + 1
  const pageCount = manualPagination ? manualPageCount : Math.max(table.getPageCount(), 1)
  const visibleColumnIds = React.useMemo(
    () => table.getVisibleLeafColumns().map((column) => column.id),
    [table]
  )
  const columnHeaderLabelById = React.useMemo(() => {
    const map = new Map<string, string>()
    table.getAllLeafColumns().forEach((column) => {
      const header = column.columnDef.header
      map.set(column.id, typeof header === "string" ? header : column.id)
    })
    return map
  }, [table])
  const visibleDataRows = React.useMemo(() => {
    return table
      .getRowModel()
      .rows.filter(
        (row) =>
          !Boolean((row as unknown as { groupingColumnId?: string }).groupingColumnId)
      )
  }, [table])
  const rowIndexById = React.useMemo(() => {
    const map = new Map<string, number>()
    visibleDataRows.forEach((row, index) => {
      map.set(row.id, index)
    })
    return map
  }, [visibleDataRows])
  const columnIndexById = React.useMemo(() => {
    const map = new Map<string, number>()
    visibleColumnIds.forEach((columnId, index) => {
      map.set(columnId, index)
    })
    return map
  }, [visibleColumnIds])

  React.useEffect(() => {
    if (!selection) return

    const anchorExists =
      rowIndexById.has(selection.anchor.rowId) &&
      columnIndexById.has(selection.anchor.columnId)
    const focusExists =
      rowIndexById.has(selection.focus.rowId) &&
      columnIndexById.has(selection.focus.columnId)

    if (!anchorExists || !focusExists) {
      setSelection(null)
    }
  }, [columnIndexById, rowIndexById, selection])

  const recordPanelFields = React.useMemo(() => {
    if (!recordPanelData) return []

    const fields: Array<{ key: string; label: string; value: unknown }> = []
    const seen = new Set<string>()

    for (const columnId of visibleColumnIds) {
      if (!(columnId in recordPanelData)) continue
      seen.add(columnId)
      fields.push({
        key: columnId,
        label: columnHeaderLabelById.get(columnId) ?? columnId,
        value: recordPanelData[columnId],
      })
    }

    for (const [key, value] of Object.entries(recordPanelData)) {
      if (seen.has(key)) continue
      fields.push({
        key,
        label: key,
        value,
      })
    }

    return fields
  }, [columnHeaderLabelById, recordPanelData, visibleColumnIds])

  function openCellPreview(columnId: string, value: unknown) {
    setCellPreview({
      columnId,
      value: formatPreviewValue(value),
    })
  }

  function focusTableWrapper() {
    tableWrapperRef.current?.focus()
  }

  function getCellValue(row: Row<TData>, columnId: string) {
    return formatPreviewValue(row.getValue(columnId))
  }

  function buildSelectionText() {
    if (!selection) return ""

    const startRowIndex = rowIndexById.get(selection.anchor.rowId)
    const endRowIndex = rowIndexById.get(selection.focus.rowId)
    const startColumnIndex = columnIndexById.get(selection.anchor.columnId)
    const endColumnIndex = columnIndexById.get(selection.focus.columnId)

    if (
      startRowIndex === undefined ||
      endRowIndex === undefined ||
      startColumnIndex === undefined ||
      endColumnIndex === undefined
    ) {
      return ""
    }

    const fromRow = Math.min(startRowIndex, endRowIndex)
    const toRow = Math.max(startRowIndex, endRowIndex)
    const fromColumn = Math.min(startColumnIndex, endColumnIndex)
    const toColumn = Math.max(startColumnIndex, endColumnIndex)

    const lines: string[] = []
    for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
      const row = visibleDataRows[rowIndex]
      const values: string[] = []
      for (let columnIndex = fromColumn; columnIndex <= toColumn; columnIndex += 1) {
        const columnId = visibleColumnIds[columnIndex]
        values.push(getCellValue(row, columnId))
      }
      lines.push(values.join("\t"))
    }

    return lines.join("\n")
  }

  function isCellInSelection(rowId: string, columnId: string) {
    if (!selection) return false

    const startRowIndex = rowIndexById.get(selection.anchor.rowId)
    const endRowIndex = rowIndexById.get(selection.focus.rowId)
    const startColumnIndex = columnIndexById.get(selection.anchor.columnId)
    const endColumnIndex = columnIndexById.get(selection.focus.columnId)
    const currentRowIndex = rowIndexById.get(rowId)
    const currentColumnIndex = columnIndexById.get(columnId)

    if (
      startRowIndex === undefined ||
      endRowIndex === undefined ||
      startColumnIndex === undefined ||
      endColumnIndex === undefined ||
      currentRowIndex === undefined ||
      currentColumnIndex === undefined
    ) {
      return false
    }

    const fromRow = Math.min(startRowIndex, endRowIndex)
    const toRow = Math.max(startRowIndex, endRowIndex)
    const fromColumn = Math.min(startColumnIndex, endColumnIndex)
    const toColumn = Math.max(startColumnIndex, endColumnIndex)

    return (
      currentRowIndex >= fromRow &&
      currentRowIndex <= toRow &&
      currentColumnIndex >= fromColumn &&
      currentColumnIndex <= toColumn
    )
  }

  function handleCellMouseDown(
    event: React.MouseEvent<HTMLTableCellElement>,
    rowId: string,
    columnId: string
  ) {
    if (event.button !== 0) return
    event.preventDefault()
    focusTableWrapper()

    const coordinate: CellCoordinate = { rowId, columnId }

    setSelection((previous) => {
      if (event.shiftKey && previous) {
        return {
          ...previous,
          focus: coordinate,
        }
      }

      return {
        anchor: coordinate,
        focus: coordinate,
      }
    })
  }

  function handleTableKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const isCopyCommand =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c"

    if (!isCopyCommand) return

    const text = buildSelectionText()
    if (!text) return

    event.preventDefault()
    void copyPlainText(text)
      .then(() => {
        toast.success("Contenuto copiato")
      })
      .catch(() => {
        toast.error("Copia non riuscita")
      })
  }

  function openRecordPanel(row: Row<TData>) {
    const record = row.original as Record<string, unknown>
    const recordId = record.id
    setRecordPanelData(record)
    setRecordPanelTitle(
      recordId !== null && recordId !== undefined
        ? `Record ${String(recordId)}`
        : "Dettaglio record"
    )
    setRecordPanelOpen(true)
  }

  React.useEffect(() => {
    if (!activeViewId) return
    if (applyingSavedViewRef.current) {
      applyingSavedViewRef.current = false
      return
    }

    setActiveViewId(null)
  }, [filters, grouping, searchValue, sorting])

  function getDefaultViewName() {
    let index = savedViews.length + 1
    while (savedViews.some((view) => view.name.toLowerCase() === `vista ${index}`)) {
      index += 1
    }
    return `Vista ${index}`
  }

  function saveCurrentView(name: string) {
    if (!viewsStorageKey) {
      toast.error("Salvataggio disabilitato per questa tabella")
      return
    }

    const normalizedName = name.trim() || getDefaultViewName()
    const existing = savedViews.find(
      (view) => view.name.toLowerCase() === normalizedName.toLowerCase()
    )
    const now = new Date().toISOString()

    if (existing) {
      setSavedViews((previous) =>
        previous.map((view) =>
          view.id === existing.id
            ? {
                ...view,
                name: normalizedName,
                searchValue,
                filters: cloneSerializable(filters),
                sorting: cloneSerializable(sorting),
                grouping: cloneSerializable(grouping),
                updatedAt: now,
              }
            : view
        )
      )
      setActiveViewId(existing.id)
      toast.success(`Vista aggiornata: ${normalizedName}`)
      return
    }

    const nextView: SavedTableView = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      searchValue,
      filters: cloneSerializable(filters),
      sorting: cloneSerializable(sorting),
      grouping: cloneSerializable(grouping),
      createdAt: now,
      updatedAt: now,
    }

    setSavedViews((previous) => [...previous, nextView])
    setActiveViewId(nextView.id)
    toast.success(`Vista salvata: ${normalizedName}`)
  }

  function applySavedView(id: string) {
    const view = savedViews.find((candidate) => candidate.id === id)
    if (!view) {
      toast.error("Vista non trovata")
      return
    }

    applyingSavedViewRef.current = true
    setSearchValue(view.searchValue)
    setFilters(cloneSerializable(view.filters))
    setSorting(cloneSerializable(view.sorting))
    setGrouping(cloneSerializable(view.grouping))
    setActiveViewId(view.id)
    handlePaginationChange((previous) => ({ ...previous, pageIndex: 0 }))
    toast.success(`Vista applicata: ${view.name}`)
  }

  function deleteSavedView(id: string) {
    const target = savedViews.find((view) => view.id === id)
    if (!target) return

    setSavedViews((previous) => previous.filter((view) => view.id !== id))
    setActiveViewId((previous) => (previous === id ? null : previous))
    toast.success(`Vista eliminata: ${target.name}`)
  }

  const currentPage = table.getState().pagination.pageIndex + 1
  const pageItems = React.useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, index) => index + 1)
    }

    const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1]
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(pageCount - 1, currentPage + 1)

    if (start > 2) items.push("ellipsis-left")
    for (let page = start; page <= end; page += 1) {
      items.push(page)
    }
    if (end < pageCount - 1) items.push("ellipsis-right")
    items.push(pageCount)

    return items
  }, [currentPage, pageCount])

  function renderDataRow(row: Row<TData>) {
    return (
      <TableRow
        key={row.id}
        style={{ contentVisibility: "auto", containIntrinsicSize: "44px" }}
      >
        <TableCell className="w-10 p-1 text-center align-middle">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              openRecordPanel(row)
            }}
            aria-label="Apri dettaglio record"
          >
            <PanelRightOpenIcon />
          </Button>
        </TableCell>
        {row.getVisibleCells().map((cell) => {
          const rawValue = cell.getValue()
          const isSelected = isCellInSelection(row.id, cell.column.id)
          return (
          <TableCell
            key={cell.id}
            className={cn("group/cell cursor-default select-none", isSelected && "bg-blue-100")}
            onMouseDown={(event) =>
              handleCellMouseDown(event, row.id, cell.column.id)
            }
            onDoubleClick={() => openCellPreview(cell.column.id, rawValue)}
          >
            <div className="relative max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap pr-7">
              {cell.getIsAggregated()
                ? flexRender(
                    cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
                    cell.getContext()
                  )
                : cell.getIsPlaceholder()
                  ? null
                  : flexRender(cell.column.columnDef.cell, cell.getContext())}

              {shouldShowExpandAction(rawValue) ? (
                <button
                  type="button"
                  className="bg-background/90 hover:bg-muted absolute top-0.5 right-0.5 rounded border p-0.5 opacity-0 transition-opacity group-hover/cell:opacity-100"
                  aria-label={`Espandi ${cell.column.id}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    openCellPreview(cell.column.id, rawValue)
                  }}
                >
                  <ExpandIcon className="size-3.5" />
                </button>
              ) : null}
            </div>
          </TableCell>
          )
        })}
      </TableRow>
    )
  }

  function renderGroupedRow(row: Row<TData>): React.ReactNode {
    const groupingColumnId = (row as unknown as { groupingColumnId?: string })
      .groupingColumnId
    const groupingValue = (row as unknown as { groupingValue?: unknown }).groupingValue
    const isGroupRow = Boolean(groupingColumnId)

    if (!isGroupRow) {
      return renderDataRow(row)
    }

    return (
      <TableRow
        key={row.id}
        className="bg-muted/30 hover:bg-muted/30"
        style={{ contentVisibility: "auto", containIntrinsicSize: "44px" }}
      >
        <TableCell colSpan={renderColumnCount} className="font-medium">
          <button
            type="button"
            className="hover:text-foreground text-muted-foreground"
            onClick={row.getToggleExpandedHandler()}
          >
            {row.getIsExpanded() ? "▼ " : "▶ "}
            {groupingColumnId}: {String(groupingValue)} ({row.subRows.length})
          </button>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div
      ref={tableWrapperRef}
      tabIndex={0}
      onKeyDown={handleTableKeyDown}
      className="min-w-0 space-y-3 select-none outline-none"
      aria-label="Data table. Usa click per selezionare e Ctrl/Cmd + C per copiare."
    >
      <DataTableToolbar
        table={table}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        filters={filters}
        onFiltersChange={setFilters}
        filterFields={filterFields}
        searchPlaceholder={searchPlaceholder}
        groupOptions={groupOptions}
        savedViews={savedViews.map((view) => ({
          id: view.id,
          name: view.name,
          updatedAt: view.updatedAt,
        }))}
        activeViewId={activeViewId}
        onSaveCurrentView={saveCurrentView}
        onApplySavedView={applySavedView}
        onDeleteSavedView={deleteSavedView}
      />

      <div className="w-full rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableHead className="w-10 px-1">
                  <span className="sr-only">Dettaglio</span>
                </TableHead>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <div className="max-w-[16rem] overflow-hidden text-ellipsis whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={renderColumnCount}
                  className="text-muted-foreground h-24 text-center"
                >
                  Nessun risultato
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => renderGroupedRow(row))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          Pagina {table.getState().pagination.pageIndex + 1} di {pageCount}
          {manualPagination ? ` (${totalRows} record)` : ""}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Indietro"
                className={cn(
                  !table.getCanPreviousPage() && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault()
                  if (!table.getCanPreviousPage()) return
                  table.previousPage()
                }}
              />
            </PaginationItem>

            {pageItems.map((item) => {
              if (item === "ellipsis-left" || item === "ellipsis-right") {
                return (
                  <PaginationItem key={item}>
                    <PaginationEllipsis />
                  </PaginationItem>
                )
              }

              return (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    onClick={(event) => {
                      event.preventDefault()
                      table.setPageIndex(item - 1)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                text="Avanti"
                className={cn(
                  !table.getCanNextPage() && "pointer-events-none opacity-50"
                )}
                onClick={(event) => {
                  event.preventDefault()
                  if (!table.getCanNextPage()) return
                  table.nextPage()
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {cellPreview ? (
        <div
          className="bg-background/70 fixed inset-0 z-50 flex items-start justify-end p-4 backdrop-blur-[1px]"
          onClick={() => setCellPreview(null)}
        >
          <div
            className="bg-background mt-16 w-[min(92vw,46rem)] max-h-[70vh] rounded-lg border shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-xs font-medium">{cellPreview.columnId}</div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCellPreview(null)}
              >
                <XIcon />
              </Button>
            </div>
            <div className="max-h-[calc(70vh-44px)] overflow-auto p-3">
              <pre className="text-foreground whitespace-pre-wrap break-words text-xs">
                {cellPreview.value}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      <Sheet
        open={recordPanelOpen}
        onOpenChange={(open) => {
          setRecordPanelOpen(open)
          if (!open) {
            setRecordPanelData(null)
          }
        }}
      >
        <SheetContent
          side="right"
          className="bg-sidebar text-sidebar-foreground w-[min(96vw,40rem)] max-w-none gap-0 p-0 sm:max-w-none"
        >
          <SidebarHeader className="p-4">
            <div className="text-base font-medium">{recordPanelTitle}</div>
            <p className="text-sidebar-foreground/70 text-xs">
              Dettaglio completo del record selezionato.
            </p>
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent className="p-2">
            <SidebarGroup className="p-0">
              <SidebarGroupLabel>Campi</SidebarGroupLabel>
              <SidebarGroupContent className="space-y-3 p-2">
                {recordPanelFields.length === 0 ? (
                  <p className="text-sidebar-foreground/70 text-sm">
                    Nessun dato disponibile.
                  </p>
                ) : (
                  recordPanelFields.map((field) => {
                    const renderedValue = formatPanelValue(field.value)
                    const isLong = renderedValue.length > 120 || renderedValue.includes("\n")

                    return (
                      <div
                        key={field.key}
                        className="bg-sidebar-accent/40 rounded-md border border-sidebar-border p-3"
                      >
                        <div className="text-sidebar-foreground/70 mb-1 text-xs font-medium">
                          {field.label}
                        </div>
                        {isLong ? (
                          <pre className="text-sidebar-foreground whitespace-pre-wrap break-words text-xs">
                            {renderedValue}
                          </pre>
                        ) : (
                          <p className="text-sidebar-foreground break-words text-sm">
                            {renderedValue}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </SheetContent>
      </Sheet>
    </div>
  )
}
