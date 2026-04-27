import * as React from "react"
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  XIcon,
} from "lucide-react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import {
  evaluateGroup,
  type FilterField,
} from "@/components/data-table/data-table-filters"
import { CardMetaRow } from "@/components/shared-next/card-meta-row"
import { RecordCard } from "@/components/shared-next/record-card"
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel"
import { Badge } from "@/components/ui-next/badge"
import { Button } from "@/components/ui-next/button"
import { FieldLabel } from "@/components/ui-next/field"
import { Pagination } from "@/components/ui-next/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select"
import { useTableQueryState } from "@/hooks/use-table-query-state"
import { getTagClassName, resolveLookupColor } from "@/features/lavoratori/lib/lookup-utils"
import { cn } from "@/lib/utils"
import type { RapportoLavorativoRecord } from "@/types"

type RapportiListItem = {
  id: string
  famigliaLabel: string
  lavoratoreLabel: string
  stato_rapporto: string | null
  stato_servizio: string | null
  stato_assunzione: string | null
  stato_riattivazione: string | null
  tipo_contratto: string | null
  tipo_rapporto: string | null
  ore_a_settimana: number | null
  data_inizio_rapporto: string | null
  distribuzione_ore_settimana: string | null
  raw: RapportoLavorativoRecord
}

type RapportiListPanelProps = {
  rapporti: RapportoLavorativoRecord[]
  totalCount: number
  loading: boolean
  error: string | null
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  searchValue: string
  onSearchValueChange: (value: string) => void
  selectedRapportoId: string | null
  onSelect: (id: string) => void
  lookupColorsByDomain: Map<string, string>
}

const VIEWS_STORAGE_KEY = "gestione-contrattuale.rapporti.saved-views"

function getFamilyName(rapporto: RapportoLavorativoRecord) {
  return rapporto.cognome_nome_datore_proper?.trim() || "Famiglia senza nome"
}

function getWorkerName(rapporto: RapportoLavorativoRecord) {
  return rapporto.nome_lavoratore_per_url?.trim() || "Lavoratore non associato"
}

function normalizeSearchToken(value: string) {
  return value.trim().toLowerCase()
}

function matchesSearchCandidate(candidate: string, searchValue: string) {
  const normalizedCandidate = normalizeSearchToken(candidate)
  const normalizedSearch = normalizeSearchToken(searchValue)
  if (!normalizedSearch) return true
  if (normalizedCandidate.includes(normalizedSearch)) return true

  const searchTokens = normalizedSearch.split(/\s+/).filter(Boolean)
  if (searchTokens.length <= 1) return false

  return searchTokens.every((token) => normalizedCandidate.includes(token))
}

function formatCompactDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function sortItems(items: RapportiListItem[], sorting: Array<{ id: string; desc: boolean }>) {
  if (sorting.length === 0) return items

  const nextItems = [...items]
  nextItems.sort((left, right) => {
    for (const sort of sorting) {
      const leftValue = left[sort.id as keyof RapportiListItem]
      const rightValue = right[sort.id as keyof RapportiListItem]

      let comparison = 0
      if (typeof leftValue === "number" || typeof rightValue === "number") {
        comparison = (Number(leftValue) || 0) - (Number(rightValue) || 0)
      } else {
        comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""))
      }

      if (comparison !== 0) {
        return sort.desc ? -comparison : comparison
      }
    }

    return 0
  })

  return nextItems
}

function getStatusColor(lookupColorsByDomain: Map<string, string>, domain: string, value: string | null) {
  return resolveLookupColor(lookupColorsByDomain, domain, value)
}

function getStatusBadgeLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim()
  return normalized || "Sconosciuto"
}

function getFallbackColor(value: string | null | undefined) {
  const token = String(value ?? "").trim().toLowerCase().replaceAll("_", " ")
  if (!token) return null
  if (token.includes("attivo")) return "emerald"
  if (token.includes("attiv") || token.includes("in corso")) return "amber"
  if (token.includes("chius") || token.includes("non attivo") || token.includes("cess")) return "zinc"
  return "sky"
}

function RapportoCard({
  rapporto,
  isActive,
  onClick,
  lookupColorsByDomain,
}: {
  rapporto: RapportiListItem
  isActive: boolean
  onClick: () => void
  lookupColorsByDomain: Map<string, string>
}) {
  return (
    <RecordCard
      onClick={onClick}
      className={cn(isActive && "ring-primary/35 ring-2")}
    >
      <RecordCard.Header
        title={<span className="text-sm font-semibold">{rapporto.famigliaLabel}</span>}
        subtitle={rapporto.lavoratoreLabel}
        rightSlot={
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-2 text-[11px] font-medium",
              getTagClassName(
                getStatusColor(
                  lookupColorsByDomain,
                  "rapporti_lavorativi.stato_rapporto",
                  rapporto.stato_rapporto,
                ) ?? getFallbackColor(getStatusBadgeLabel(rapporto.stato_rapporto)),
              ),
            )}
          >
            {getStatusBadgeLabel(rapporto.stato_rapporto)}
          </Badge>
        }
      />
      <RecordCard.Body className="gap-1 text-[11px]">
        <CardMetaRow icon={<ClockIcon className="size-3 shrink-0" />}>
          <span>{rapporto.ore_a_settimana ?? 0}h/sett</span>
          {rapporto.distribuzione_ore_settimana ? (
            <>
              <span className="text-muted-foreground/60 mx-1">•</span>
              <span className="truncate">{rapporto.distribuzione_ore_settimana}</span>
            </>
          ) : null}
        </CardMetaRow>
        <CardMetaRow icon={<CalendarDaysIcon className="size-3 shrink-0" />}>
          <span>{formatCompactDate(rapporto.data_inizio_rapporto)}</span>
        </CardMetaRow>
      </RecordCard.Body>
    </RecordCard>
  )
}

function renderGroupTree(
  items: RapportiListItem[],
  grouping: string[],
  depth: number,
  collapsedGroups: Record<string, boolean>,
  onToggleGroup: (groupKey: string) => void,
  selectedRapportoId: string | null,
  onSelect: (id: string) => void,
  lookupColorsByDomain: Map<string, string>,
): React.ReactNode {
  if (grouping.length === 0) {
    return (
      <div className="space-y-2">
        {items.map((rapporto) => (
          <RapportoCard
            key={rapporto.id}
            rapporto={rapporto}
            isActive={selectedRapportoId === rapporto.id}
            onClick={() => onSelect(rapporto.id)}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ))}
      </div>
    )
  }

  const [currentGroup, ...nextGroups] = grouping
  const grouped = new Map<string, RapportiListItem[]>()

  for (const item of items) {
    const key = String(item[currentGroup as keyof RapportiListItem] ?? "Senza valore")
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  return Array.from(grouped.entries()).map(([groupValue, groupItems]) => {
    const groupKey = `${depth}:${currentGroup}:${groupValue}`
    const isCollapsed = collapsedGroups[groupKey] ?? false
    const color =
      currentGroup === "stato_rapporto"
        ? getStatusColor(lookupColorsByDomain, "rapporti_lavorativi.stato_rapporto", groupValue)
        : currentGroup === "stato_assunzione"
          ? getStatusColor(lookupColorsByDomain, "rapporti_lavorativi.stato_assunzione", groupValue)
          : currentGroup === "stato_riattivazione"
            ? getStatusColor(lookupColorsByDomain, "rapporti_lavorativi.stato_riattivazione", groupValue)
            : null

    return (
      <div key={groupKey} className="space-y-2">
        <button
          type="button"
          onClick={() => onToggleGroup(groupKey)}
          className={cn(
            "text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-1 text-sm font-medium transition-colors",
            depth > 0 && "pl-4",
          )}
        >
          {isCollapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          <span>{groupValue}</span>
          {color ? <Badge className={getTagClassName(color)}>{currentGroup}</Badge> : null}
          <Badge variant="outline" className="ml-auto">
            {groupItems.length}
          </Badge>
        </button>
        {!isCollapsed ? (
          <div className={cn("space-y-2", depth > 0 && "pl-4")}>
            {renderGroupTree(
              groupItems,
              nextGroups,
              depth + 1,
              collapsedGroups,
              onToggleGroup,
              selectedRapportoId,
              onSelect,
              lookupColorsByDomain,
            )}
          </div>
        ) : null}
      </div>
    )
  })
}

export function RapportiListPanel({
  rapporti,
  totalCount,
  loading,
  error,
  pageIndex,
  pageSize,
  onPageChange,
  searchValue: externalSearchValue,
  onSearchValueChange,
  selectedRapportoId,
  onSelect,
  lookupColorsByDomain,
}: RapportiListPanelProps) {
  const [filterAssunzione, setFilterAssunzione] = React.useState("all")
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})
  const initialQuery = React.useMemo(
    () => ({
      grouping: [],
      sorting: [{ id: "data_inizio_rapporto", desc: true }],
    }),
    [],
  )
  const {
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    savedViews,
    activeViewId,
    saveView,
    applyView,
    deleteView,
    hasPendingFilters,
    applyFilters,
  } = useTableQueryState({
    viewsStorageKey: VIEWS_STORAGE_KEY,
    debounceMs: 0,
    initialQuery,
  })

  React.useEffect(() => {
    if (searchValue === externalSearchValue) return
    onSearchValueChange(searchValue)
  }, [externalSearchValue, onSearchValueChange, searchValue])

  const items = React.useMemo<RapportiListItem[]>(
    () =>
      rapporti.map((rapporto) => ({
        id: rapporto.id,
        famigliaLabel: getFamilyName(rapporto),
        lavoratoreLabel: getWorkerName(rapporto),
        stato_rapporto: rapporto.stato_rapporto,
        stato_servizio: rapporto.stato_servizio,
        stato_assunzione: rapporto.stato_assunzione,
        stato_riattivazione: rapporto.stato_riattivazione,
        tipo_contratto: rapporto.tipo_contratto,
        tipo_rapporto: rapporto.tipo_rapporto,
        ore_a_settimana: rapporto.ore_a_settimana,
        data_inizio_rapporto: rapporto.data_inizio_rapporto,
        distribuzione_ore_settimana: rapporto.distribuzione_ore_settimana,
        raw: rapporto,
      })),
    [rapporti],
  )

  const columns = React.useMemo<ColumnDef<RapportiListItem>[]>(
    () => [
      { accessorKey: "famigliaLabel", header: "Famiglia" },
      { accessorKey: "lavoratoreLabel", header: "Lavoratore" },
      { accessorKey: "stato_rapporto", header: "Stato rapporto" },
      { accessorKey: "stato_servizio", header: "Stato servizio" },
      { accessorKey: "stato_assunzione", header: "Stato assunzione" },
      { accessorKey: "stato_riattivazione", header: "Stato riattivazione" },
      { accessorKey: "tipo_contratto", header: "Tipo contratto" },
      { accessorKey: "tipo_rapporto", header: "Tipo rapporto" },
      { accessorKey: "ore_a_settimana", header: "Ore" },
      { accessorKey: "data_inizio_rapporto", header: "Data inizio" },
    ],
    [],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, grouping },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    getCoreRowModel: getCoreRowModel(),
  })

  const uniqueAssunzioni = React.useMemo(
    () =>
      Array.from(
        new Set(
          rapporti
            .map((rapporto) => rapporto.stato_assunzione?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rapporti],
  )

  const uniqueTipiContratto = React.useMemo(
    () =>
      Array.from(
        new Set(
          rapporti
            .map((rapporto) => rapporto.tipo_contratto?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rapporti],
  )

  const uniqueTipiRapporto = React.useMemo(
    () =>
      Array.from(
        new Set(
          rapporti
            .map((rapporto) => rapporto.tipo_rapporto?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [rapporti],
  )

  const activeFilterCount = filterAssunzione !== "all" ? 1 : 0

  const filterFields = React.useMemo<FilterField[]>(
    () => [
      {
        label: "Stato rapporto",
        value: "stato_rapporto",
        type: "enum",
        options: Array.from(
          new Set(items.map((item) => item.stato_rapporto).filter((value): value is string => Boolean(value))),
        ).map((value) => ({ label: value, value })),
      },
      {
        label: "Stato servizio",
        value: "stato_servizio",
        type: "enum",
        options: Array.from(
          new Set(items.map((item) => item.stato_servizio).filter((value): value is string => Boolean(value))),
        ).map((value) => ({ label: value, value })),
      },
      {
        label: "Stato assunzione",
        value: "stato_assunzione",
        type: "enum",
        options: uniqueAssunzioni.map((value) => ({ label: value, value })),
      },
      {
        label: "Tipo contratto",
        value: "tipo_contratto",
        type: "enum",
        options: uniqueTipiContratto.map((value) => ({ label: value, value })),
      },
      {
        label: "Tipo rapporto",
        value: "tipo_rapporto",
        type: "enum",
        options: uniqueTipiRapporto.map((value) => ({ label: value, value })),
      },
    ],
    [items, uniqueAssunzioni, uniqueTipiContratto, uniqueTipiRapporto],
  )

  const visibleItems = React.useMemo(() => {
    const filtered = items
      .filter((rapporto) => {
        return (
          matchesSearchCandidate(rapporto.famigliaLabel, searchValue) ||
          matchesSearchCandidate(rapporto.lavoratoreLabel, searchValue) ||
          matchesSearchCandidate(rapporto.id, searchValue)
        )
      })
      .filter((rapporto) =>
        filterAssunzione === "all" ? true : rapporto.stato_assunzione === filterAssunzione,
      )
      .filter((rapporto) => evaluateGroup(rapporto as unknown as Record<string, unknown>, filters, filterFields))

    return sortItems(filtered, sorting)
  }, [
    filterFields,
    filterAssunzione,
    filters,
    items,
    searchValue,
    sorting,
  ])

  function clearFilters() {
    setFilterAssunzione("all")
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = pageIndex + 1

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <SideCardsPanel
        title="Rapporti lavorativi"
        headerClassName="hidden"
        contentClassName="space-y-3 px-5 pt-3 pb-3"
        className="h-full gap-2"
      >
        <DataTableToolbar
          table={table}
          searchValue={searchValue}
          onSearchValueChange={setSearchValue}
          filters={filters}
          onFiltersChange={setFilters}
          filterFields={filterFields}
          searchPlaceholder="Cerca famiglia o lavoratore..."
          groupOptions={[
            { label: "Stato rapporto", value: "stato_rapporto" },
            { label: "Stato servizio", value: "stato_servizio" },
            { label: "Stato assunzione", value: "stato_assunzione" },
            { label: "Stato riattivazione", value: "stato_riattivazione" },
            { label: "Tipo contratto", value: "tipo_contratto" },
            { label: "Tipo rapporto", value: "tipo_rapporto" },
          ]}
          compactControls
          savedViews={savedViews.map((view) => ({
            id: view.id,
            name: view.name,
            updatedAt: view.updatedAt,
          }))}
          activeViewId={activeViewId}
          onSaveCurrentView={saveView}
          onApplySavedView={applyView}
          onDeleteSavedView={deleteView}
          onApplyFilters={applyFilters}
          hasPendingFilters={hasPendingFilters}
        />

        <div className="space-y-1">
          <FieldLabel>Stato assunzione</FieldLabel>
          <Select value={filterAssunzione} onValueChange={setFilterAssunzione}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {uniqueAssunzioni.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              {visibleItems.length} di {items.length} rapporti
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              <XIcon className="size-3" />
              Reset filtri
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted-foreground py-6 text-sm">Caricamento rapporti lavorativi...</p>
        ) : error ? (
          <p className="py-6 text-sm text-red-600">{error}</p>
        ) : visibleItems.length === 0 ? (
          <p className="text-muted-foreground py-6 text-sm">Nessun rapporto lavorativo trovato.</p>
        ) : (
          <div className="space-y-4">
            {renderGroupTree(
              visibleItems,
              grouping,
              0,
              collapsedGroups,
              (groupKey) =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [groupKey]: !current[groupKey],
                })),
              selectedRapportoId,
              onSelect,
              lookupColorsByDomain,
            )}
          </div>
        )}
      </SideCardsPanel>

      <Pagination className="px-1">
        <Pagination.Pages
          page={currentPage}
          pageCount={pageCount}
          onChange={(nextPage) => {
            if (loading) return
            onPageChange(Math.max(nextPage - 1, 0))
          }}
        />
        <span className="text-muted-foreground tabular-nums">
          {totalCount} {totalCount === 1 ? "rapporto" : "rapporti"}
        </span>
      </Pagination>
    </div>
  )
}
