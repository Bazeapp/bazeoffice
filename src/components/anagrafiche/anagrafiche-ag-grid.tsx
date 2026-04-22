import type { SortingState } from "@tanstack/react-table"
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
  type RowClickedEvent,
  type SortChangedEvent,
} from "ag-grid-community"
import { AgGridReact } from "ag-grid-react"
import * as React from "react"

import type {
  AnagraficaRow,
  AnagraficheGroupResult,
  LookupColorMap,
} from "@/hooks/use-anagrafiche-data"
import type { TableColumnMeta } from "@/lib/anagrafiche-api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

ModuleRegistry.registerModules([AllCommunityModule])

const anagraficheGridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
})

const UPPERCASE_TOKENS = new Set([
  "id",
  "url",
  "utm",
  "otp",
  "seo",
  "wa",
  "fbclid",
  "gclid",
  "cet",
  "ai",
  "inps",
  "cud",
  "json",
  "jsonb",
  "uuid",
])
const LOWERCASE_CONNECTORS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "con",
  "da",
  "dal",
  "dalla",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "e",
  "il",
  "in",
  "la",
  "le",
  "nel",
  "nella",
  "o",
  "per",
  "su",
  "tra",
])
const TOKEN_LABEL_OVERRIDES: Record<string, string> = {
  whatsapp: "WhatsApp",
  webflow: "Webflow",
  looker: "Looker",
  stripe: "Stripe",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  typeform: "Typeform",
  wized: "Wized",
  klaaryo: "Klaaryo",
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

export function toReadableColumnLabel(key: string) {
  const normalized = key.replace(/__+/g, "_").trim()
  if (!normalized) return key

  const parts = normalized
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return key

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (TOKEN_LABEL_OVERRIDES[lower]) {
        return TOKEN_LABEL_OVERRIDES[lower]
      }

      if (UPPERCASE_TOKENS.has(lower)) {
        return lower.toUpperCase()
      }

      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) {
        return lower
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-50 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-50 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-50 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-50 text-lime-700"
    case "green":
      return "border-green-200 bg-green-50 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-50 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-50 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-50 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-50 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-50 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-50 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-50 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-50 text-zinc-700"
    case "neutral":
      return "border-neutral-200 bg-neutral-50 text-neutral-700"
    case "stone":
      return "border-stone-200 bg-stone-50 text-stone-700"
    default:
      return "border-border bg-muted/60 text-foreground"
  }
}

function resolveLookupColor(
  lookupColors: LookupColorMap,
  entityTable:
    | "famiglie"
    | "processi_matching"
    | "lavoratori"
    | "mesi_lavorati"
    | "pagamenti"
    | "selezioni_lavoratori"
    | "rapporti_lavorativi",
  entityField: string,
  rawValue: unknown
) {
  if (typeof rawValue !== "string" || !rawValue.trim()) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(rawValue)] ?? null
}

function formatArrayItem(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (typeof value === "object") return "[oggetto]"
  return String(value)
}

export function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "-"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (!value.length) return "-"
    const preview = value.slice(0, 3).map((item) => formatArrayItem(item)).join(", ")
    if (value.length <= 3) return preview
    return `${preview}, +${value.length - 3}`
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>)
    if (!keys.length) return "{}"
    const preview = keys.slice(0, 3).join(", ")
    if (keys.length <= 3) return `{ ${preview} }`
    return `{ ${preview}, +${keys.length - 3} }`
  }
  return String(value)
}

function getOrderedKeys(rows: AnagraficaRow[], columns: TableColumnMeta[]) {
  const keys: string[] = []
  const seen = new Set<string>()

  for (const column of columns) {
    if (!seen.has(column.name)) {
      seen.add(column.name)
      keys.push(column.name)
    }
  }

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      keys.push(key)
    }
  }

  return keys
}

function buildColumnDefs(
  rows: AnagraficaRow[],
  columns: TableColumnMeta[],
  entityTable:
    | "famiglie"
    | "processi_matching"
    | "lavoratori"
    | "mesi_lavorati"
    | "pagamenti"
    | "selezioni_lavoratori"
    | "rapporti_lavorativi",
  lookupColors: LookupColorMap,
  sorting: SortingState
): ColDef<AnagraficaRow>[] {
  const keys = getOrderedKeys(rows, columns)

  return keys.map((key) => {
    const sortIndex = sorting.findIndex((item) => item.id === key)
    const sort = sortIndex >= 0 ? (sorting[sortIndex]?.desc ? "desc" : "asc") : null

    return {
      field: key,
      colId: key,
      headerName: toReadableColumnLabel(key),
      sortable: true,
      resizable: true,
      minWidth: 160,
      width: 180,
      sort,
      sortIndex: sortIndex >= 0 ? sortIndex : undefined,
      cellRenderer: (params: { data?: AnagraficaRow; value: unknown }) => {
        const rawValue = params.data?.[key]
        const color = resolveLookupColor(lookupColors, entityTable, key, rawValue)
        const renderedValue = formatCellValue(params.value)

        if (color && typeof renderedValue === "string" && renderedValue !== "-") {
          return (
            <span
              className={cn(
                "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
                getBadgeClassName(color)
              )}
            >
              {renderedValue}
            </span>
          )
        }

        return <span>{renderedValue}</span>
      },
    }
  })
}

type AnagraficheAgGridProps = {
  rows: AnagraficaRow[]
  columns: TableColumnMeta[]
  entityTable:
    | "famiglie"
    | "processi_matching"
    | "lavoratori"
    | "mesi_lavorati"
    | "pagamenti"
    | "selezioni_lavoratori"
    | "rapporti_lavorativi"
  lookupColors: LookupColorMap
  groups: AnagraficheGroupResult[]
  searchPlaceholder: string
  searchValue: string
  sorting: SortingState
  grouping: string[]
  totalRows: number
  pageIndex: number
  pageSize: number
  toolbarActions?: React.ReactNode
  onRowOpen?: (row: AnagraficaRow) => void
  onLoadGroupRows: (
    group: AnagraficheGroupResult,
    pageIndex: number,
    pageSize: number
  ) => Promise<{ rows: AnagraficaRow[]; total: number }>
  onSearchValueChange: (next: string) => void
  onSortingChange: (next: SortingState) => void
  onPaginationChange: (next: { pageIndex: number; pageSize: number }) => void
}

type AnagraficheGridRow =
  | AnagraficaRow
  | {
      __rowType: "group"
      __groupId: string
      __groupField: string
      __groupValue: string
      __groupCount: number
      __groupDepth: number
    }
  | {
      __rowType: "group-action"
      __groupId: string
      __groupLabel: string
      __loadedCount: number
      __totalCount: number
      __loading: boolean
    }

function getGroupDisplayValue(value: unknown) {
  const formatted = formatCellValue(value)
  return formatted === "-" ? "Senza valore" : formatted
}

function buildGroupedRows(
  rows: AnagraficaRow[],
  grouping: string[],
  collapsedGroups: Set<string>
): AnagraficheGridRow[] {
  const activeGrouping = grouping.filter(Boolean)
  if (!activeGrouping.length) return rows

  function buildLevel(currentRows: AnagraficaRow[], depth: number, parentKey: string): AnagraficheGridRow[] {
    const field = activeGrouping[depth]
    if (!field) return currentRows

    const groups = new Map<string, { label: string; rows: AnagraficaRow[] }>()
    for (const row of currentRows) {
      const label = getGroupDisplayValue(row[field])
      const key = `${parentKey}/${field}:${label}`
      const current = groups.get(key) ?? { label, rows: [] }
      current.rows.push(row)
      groups.set(key, current)
    }

    return Array.from(groups.entries()).flatMap(([groupId, group]) => {
      const header: AnagraficheGridRow = {
        __rowType: "group",
        __groupId: groupId,
        __groupField: field,
        __groupValue: group.label,
        __groupCount: group.rows.length,
        __groupDepth: depth,
      }

      if (collapsedGroups.has(groupId)) return [header]
      return [header, ...buildLevel(group.rows, depth + 1, groupId)]
    })
  }

  return buildLevel(rows, 0, "root")
}

function isGroupRow(row: AnagraficheGridRow | undefined): row is Extract<AnagraficheGridRow, { __rowType: "group" }> {
  return row?.__rowType === "group"
}

function isGroupActionRow(
  row: AnagraficheGridRow | undefined
): row is Extract<AnagraficheGridRow, { __rowType: "group-action" }> {
  return row?.__rowType === "group-action"
}

function getServerGroupId(group: AnagraficheGroupResult) {
  return `${group.field}:${group.value || "__empty__"}`
}

type GroupRowsState = {
  rows: AnagraficaRow[]
  total: number
  loading: boolean
}

function buildServerGroupedRows(
  groups: AnagraficheGroupResult[],
  expandedGroups: Set<string>,
  groupRowsById: Record<string, GroupRowsState>
): AnagraficheGridRow[] {
  return groups.flatMap((group) => {
    const groupId = getServerGroupId(group)
    const header: AnagraficheGridRow = {
      __rowType: "group",
      __groupId: groupId,
      __groupField: group.field,
      __groupValue: group.label,
      __groupCount: group.count,
      __groupDepth: 0,
    }

    if (!expandedGroups.has(groupId)) return [header]

    const state = groupRowsById[groupId] ?? { rows: [], total: group.count, loading: false }
    const hasMore = state.rows.length < state.total
    const action: AnagraficheGridRow | null =
      state.loading || hasMore
        ? {
            __rowType: "group-action",
            __groupId: groupId,
            __groupLabel: group.label,
            __loadedCount: state.rows.length,
            __totalCount: state.total,
            __loading: state.loading,
          }
        : null

    return action ? [header, ...state.rows, action] : [header, ...state.rows]
  })
}

function buildGroupsSignature(groups: AnagraficheGroupResult[]) {
  return groups
    .map((group) => `${group.field}:${group.value}:${group.count}`)
    .join("|")
}

export function AnagraficheAgGrid({
  rows,
  columns,
  entityTable,
  lookupColors,
  groups,
  searchPlaceholder,
  searchValue,
  sorting,
  grouping,
  totalRows,
  pageIndex,
  pageSize,
  toolbarActions,
  onRowOpen,
  onLoadGroupRows,
  onSearchValueChange,
  onSortingChange,
  onPaginationChange,
}: AnagraficheAgGridProps) {
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set())
  const [expandedServerGroups, setExpandedServerGroups] = React.useState<Set<string>>(new Set())
  const [groupRowsById, setGroupRowsById] = React.useState<Record<string, GroupRowsState>>({})
  const previousExternalSearchValueRef = React.useRef(searchValue)
  const serverGroupingActive = grouping.length > 0
  const serverGroupById = React.useMemo(
    () => new Map(groups.map((group) => [getServerGroupId(group), group])),
    [groups]
  )
  const groupsSignature = React.useMemo(() => buildGroupsSignature(groups), [groups])
  const groupingSignature = React.useMemo(() => JSON.stringify(grouping), [grouping])
  const sortingSignature = React.useMemo(() => JSON.stringify(sorting), [sorting])

  React.useEffect(() => {
    if (previousExternalSearchValueRef.current === searchValue) return
    previousExternalSearchValueRef.current = searchValue
    setLocalSearchValue(searchValue)
  }, [searchValue])

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      React.startTransition(() => {
        onSearchValueChange(localSearchValue)
      })
    }, 120)

    return () => window.clearTimeout(timeoutId)
  }, [localSearchValue, onSearchValueChange])

  const defaultColDef = React.useMemo<ColDef<AnagraficaRow>>(
    () => ({
      sortable: true,
      resizable: true,
      minWidth: 160,
      width: 180,
      cellDataType: false,
      suppressMovable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    []
  )

  const columnDefs = React.useMemo(
    () => buildColumnDefs(rows, columns, entityTable, lookupColors, sorting),
    [columns, entityTable, lookupColors, rows, sorting]
  )
  const gridRows = React.useMemo(
    () =>
      serverGroupingActive
        ? buildServerGroupedRows(groups, expandedServerGroups, groupRowsById)
        : buildGroupedRows(rows, grouping, collapsedGroups),
    [collapsedGroups, expandedServerGroups, grouping, groupRowsById, groups, rows, serverGroupingActive]
  )

  React.useEffect(() => {
    setCollapsedGroups(new Set())
    setExpandedServerGroups(new Set())
    setGroupRowsById({})
  }, [groupingSignature, groupsSignature, pageIndex, searchValue, sortingSignature])

  const loadServerGroupRows = React.useCallback(
    async (groupId: string) => {
      const group = serverGroupById.get(groupId)
      if (!group) return

      const current = groupRowsById[groupId]
      if (current?.loading) return

      const nextPageIndex = Math.floor((current?.rows.length ?? 0) / pageSize)
      setGroupRowsById((previous) => ({
        ...previous,
        [groupId]: {
          rows: previous[groupId]?.rows ?? [],
          total: previous[groupId]?.total ?? group.count,
          loading: true,
        },
      }))

      try {
        const result = await onLoadGroupRows(group, nextPageIndex, pageSize)
        setGroupRowsById((previous) => ({
          ...previous,
          [groupId]: {
            rows: [...(previous[groupId]?.rows ?? []), ...result.rows],
            total: result.total,
            loading: false,
          },
        }))
      } catch {
        setGroupRowsById((previous) => ({
          ...previous,
          [groupId]: {
            rows: previous[groupId]?.rows ?? [],
            total: previous[groupId]?.total ?? group.count,
            loading: false,
          },
        }))
      }
    },
    [groupRowsById, onLoadGroupRows, pageSize, serverGroupById]
  )

  const handleSortChanged = React.useCallback(
    (event: SortChangedEvent<AnagraficaRow>) => {
      const nextSorting: SortingState = event.api
        .getColumnState()
        .filter((columnState) => columnState.sort)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map((columnState) => ({
          id: columnState.colId,
          desc: columnState.sort === "desc",
        }))

      onSortingChange(nextSorting)
    },
    [onSortingChange]
  )

  const handleRowClicked = React.useCallback(
    (event: RowClickedEvent<AnagraficaRow>) => {
      const data = event.data as AnagraficheGridRow | undefined
      if (!data || isGroupRow(data) || isGroupActionRow(data)) return
      onRowOpen?.(data)
    },
    [onRowOpen]
  )

  const pageCount = serverGroupingActive ? 1 : Math.max(1, Math.ceil(totalRows / pageSize))
  const canGoPrevious = pageIndex > 0
  const canGoNext = !serverGroupingActive && pageIndex + 1 < pageCount
  const rangeStart = serverGroupingActive ? (groups.length > 0 ? 1 : 0) : totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = serverGroupingActive ? groups.length : Math.min(totalRows, (pageIndex + 1) * pageSize)
  const groupingActive = grouping.length > 0
  const groupingLabel = grouping.map(toReadableColumnLabel).join(" / ")

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Anagrafiche</h2>
          <p className="text-muted-foreground text-sm">
            {serverGroupingActive
              ? `${rangeStart}-${rangeEnd} gruppi, ${totalRows} record`
              : `${rangeStart}-${rangeEnd} di ${totalRows} record`}
          </p>
          {groupingActive ? (
            <p className="text-muted-foreground text-xs">
              Raggruppamento server-side: {groupingLabel}
            </p>
          ) : null}
        </div>

        <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto">
          <Input
            value={localSearchValue}
            onChange={(event) => setLocalSearchValue(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 lg:w-80 lg:flex-none"
          />
          {toolbarActions}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-background",
          "[&_.ag-root-wrapper]:border-0 [&_.ag-root-wrapper]:rounded-none",
          "[&_.ag-cell]:border-border [&_.ag-header]:border-border [&_.ag-row]:border-border",
          "[&_.ag-header-cell-label]:font-medium [&_.ag-header-cell]:text-foreground [&_.ag-cell]:text-foreground",
          "[&_.ag-header-cell]:ui-type-label [&_.ag-cell]:ui-type-value [&_.ag-cell]:leading-5"
        )}
      >
        <div className="h-[calc(100svh-14rem)] min-h-[34rem]">
          <AgGridReact<AnagraficaRow>
            theme={anagraficheGridTheme}
            rowData={gridRows as AnagraficaRow[]}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            getRowId={(params) =>
              isGroupRow(params.data as AnagraficheGridRow)
                ? (params.data as Extract<AnagraficheGridRow, { __rowType: "group" }>).__groupId
                : isGroupActionRow(params.data as AnagraficheGridRow)
                  ? `${(params.data as Extract<AnagraficheGridRow, { __rowType: "group-action" }>).__groupId}:action`
                : String((params.data as AnagraficaRow).id ?? JSON.stringify(params.data))
            }
            isFullWidthRow={(params) => {
              const data = params.rowNode.data as AnagraficheGridRow
              return isGroupRow(data) || isGroupActionRow(data)
            }}
            fullWidthCellRenderer={(params: ICellRendererParams<AnagraficheGridRow>) => {
              const data = params.data
              if (isGroupActionRow(data)) {
                return (
                  <button
                    type="button"
                    className="flex h-full w-full items-center justify-center gap-2 bg-background px-4 text-sm text-muted-foreground hover:bg-muted/40"
                    disabled={data.__loading}
                    onClick={() => void loadServerGroupRows(data.__groupId)}
                  >
                    {data.__loading
                      ? "Caricamento..."
                      : `Mostra altri (${data.__loadedCount}/${data.__totalCount})`}
                  </button>
                )
              }
              if (!isGroupRow(data)) return null
              const isServerGroup = serverGroupById.has(data.__groupId)
              const isCollapsed = isServerGroup
                ? !expandedServerGroups.has(data.__groupId)
                : collapsedGroups.has(data.__groupId)

              return (
                <button
                  type="button"
                  className="flex h-full w-full items-center gap-2 bg-muted/40 px-4 text-left text-sm font-medium text-foreground hover:bg-muted/60"
                  style={{ paddingLeft: `${16 + data.__groupDepth * 20}px` }}
                  onClick={() => {
                    if (isServerGroup) {
                      setExpandedServerGroups((previous) => {
                        const next = new Set(previous)
                        if (next.has(data.__groupId)) {
                          next.delete(data.__groupId)
                        } else {
                          next.add(data.__groupId)
                          if (!groupRowsById[data.__groupId]) {
                            void loadServerGroupRows(data.__groupId)
                          }
                        }
                        return next
                      })
                    } else {
                      setCollapsedGroups((previous) => {
                        const next = new Set(previous)
                        if (next.has(data.__groupId)) {
                          next.delete(data.__groupId)
                        } else {
                          next.add(data.__groupId)
                        }
                        return next
                      })
                    }
                  }}
                >
                  <span className="text-muted-foreground">{isCollapsed ? "▶" : "▼"}</span>
                  <span>{toReadableColumnLabel(data.__groupField)}:</span>
                  <span>{data.__groupValue}</span>
                  <span className="text-muted-foreground">({data.__groupCount})</span>
                </button>
              )
            }}
            enableCellTextSelection
            rowHeight={44}
            headerHeight={42}
            animateRows={false}
            suppressMovableColumns
            ensureDomOrder
            suppressFieldDotNotation
            overlayNoRowsTemplate="Nessun record trovato"
            onSortChanged={handleSortChanged}
            onRowClicked={handleRowClicked}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Pagina {Math.min(pageIndex + 1, pageCount)} di {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoPrevious}
            onClick={() => onPaginationChange({ pageIndex: pageIndex - 1, pageSize })}
          >
            Precedente
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canGoNext}
            onClick={() => onPaginationChange({ pageIndex: pageIndex + 1, pageSize })}
          >
            Successiva
          </Button>
        </div>
      </div>
    </div>
  )
}
