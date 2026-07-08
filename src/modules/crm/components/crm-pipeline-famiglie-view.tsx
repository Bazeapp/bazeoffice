import * as React from "react"
import {
  BanIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  CheckIcon,
  ChevronDownIcon,
  CircleDotIcon,
  CircleXIcon,
  Clock3Icon,
  FlameIcon,
  PhoneCallIcon,
  PhoneForwardedIcon,
  SnowflakeIcon,
  TrophyIcon,
  UserRoundXIcon,
  XIcon,
} from "lucide-react"

import { FamigliaProcessoDetailShell } from "./famiglia-processo-detail-shell"
import { FamigliaProcessoCard } from "./famiglia-processo-card"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  KanbanDeferredColumnAction,
} from "@/components/shared-next/kanban"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type CrmPipelineFilters,
  type CrmPipelineCardData,
  type CrmPipelineColumnData,
} from "../types"
import { useCrmPipelinePreview } from "../hooks/use-crm-pipeline-preview"
import { romaWallclockToUtcIso, utcIsoToRomaInput } from "@/lib/datetime"
import { matchesSearchQuery } from "@/lib/search-utils"
import { cn } from "@/lib/utils"

const DEFERRED_STAGE_IDS = new Set(["won_ricerca_attivata", "lost", "out_of_target"])
const CRM_PIPELINE_FILTERS_STORAGE_KEY = "bazeoffice.crmPipelineFamiglie.filters.v1"
const VISIBLE_CARD_BATCH_SIZE = 80

type BooleanFilterValue = "all" | "yes" | "no"

type CrmPipelineToolbarFilters = {
  createdFrom: string
  createdTo: string
  tipoLavoro: string[]
  preventivoAccettato: BooleanFilterValue
  chiamataPrenotata: BooleanFilterValue
}

const EMPTY_TOOLBAR_FILTERS: CrmPipelineToolbarFilters = {
  createdFrom: "",
  createdTo: "",
  tipoLavoro: [],
  preventivoAccettato: "all",
  chiamataPrenotata: "all",
}

const DATE_PRESETS = [
  { id: "custom", label: "Da sempre" },
  { id: "24h", label: "Ultime 24h" },
  { id: "7d", label: "Ultimi 7 giorni" },
  { id: "30d", label: "Ultimo mese" },
  { id: "year", label: "Quest'anno" },
] as const

type DatePresetValue = (typeof DATE_PRESETS)[number]["id"]

type ColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

function getColumnVisual(color: string | null): ColumnVisual {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return {
        columnClassName: "bg-red-400",
        headerClassName: "",
        iconClassName: "text-red-500",
      }
    case "rose":
      return {
        columnClassName: "bg-rose-400",
        headerClassName: "",
        iconClassName: "text-rose-500",
      }
    case "orange":
      return {
        columnClassName: "bg-orange-400",
        headerClassName: "",
        iconClassName: "text-orange-500",
      }
    case "amber":
      return {
        columnClassName: "bg-amber-400",
        headerClassName: "",
        iconClassName: "text-amber-500",
      }
    case "yellow":
      return {
        columnClassName: "bg-yellow-400",
        headerClassName: "",
        iconClassName: "text-yellow-500",
      }
    case "lime":
      return {
        columnClassName: "bg-lime-400",
        headerClassName: "",
        iconClassName: "text-lime-500",
      }
    case "green":
      return {
        columnClassName: "bg-green-400",
        headerClassName: "",
        iconClassName: "text-green-500",
      }
    case "emerald":
      return {
        columnClassName: "bg-emerald-400",
        headerClassName: "",
        iconClassName: "text-emerald-500",
      }
    case "teal":
      return {
        columnClassName: "bg-teal-400",
        headerClassName: "",
        iconClassName: "text-teal-500",
      }
    case "cyan":
      return {
        columnClassName: "bg-cyan-400",
        headerClassName: "",
        iconClassName: "text-cyan-500",
      }
    case "sky":
      return {
        columnClassName: "bg-sky-400",
        headerClassName: "",
        iconClassName: "text-sky-500",
      }
    case "blue":
      return {
        columnClassName: "bg-blue-400",
        headerClassName: "",
        iconClassName: "text-blue-500",
      }
    case "indigo":
      return {
        columnClassName: "bg-indigo-400",
        headerClassName: "",
        iconClassName: "text-indigo-500",
      }
    case "violet":
      return {
        columnClassName: "bg-violet-400",
        headerClassName: "",
        iconClassName: "text-violet-500",
      }
    case "purple":
      return {
        columnClassName: "bg-purple-400",
        headerClassName: "",
        iconClassName: "text-purple-500",
      }
    case "fuchsia":
      return {
        columnClassName: "bg-fuchsia-400",
        headerClassName: "",
        iconClassName: "text-fuchsia-500",
      }
    case "pink":
      return {
        columnClassName: "bg-pink-400",
        headerClassName: "",
        iconClassName: "text-pink-500",
      }
    case "slate":
      return {
        columnClassName: "bg-slate-400",
        headerClassName: "",
        iconClassName: "text-slate-500",
      }
    case "gray":
      return {
        columnClassName: "bg-gray-400",
        headerClassName: "",
        iconClassName: "text-gray-500",
      }
    case "zinc":
      return {
        columnClassName: "bg-zinc-400",
        headerClassName: "",
        iconClassName: "text-zinc-500",
      }
    default:
      return {
        columnClassName: "",
        headerClassName: "",
        iconClassName: "text-muted-foreground/80",
      }
  }
}

function getStageIcon(stageId: string, iconClassName: string) {
  const className = cn("size-4", iconClassName)

  switch (stageId) {
    case "warm_lead":
      return <FlameIcon className={className} />
    case "hot_ingresso":
      return <PhoneForwardedIcon className={className} />
    case "hot_in_attesa_di_primo_contatto":
      return <Clock3Icon className={className} />
    case "hot_contatto_avvenuto":
      return <PhoneCallIcon className={className} />
    case "hot_callback_programmato":
      return <CalendarClockIcon className={className} />
    case "hot_decisione_rimandata":
      return <Clock3Icon className={className} />
    case "hot_call_attivazione_prenotata":
      return <CalendarPlusIcon className={className} />
    case "hot_call_attivazione_fatta":
      return <CheckCircle2Icon className={className} />
    case "hot_follow_up_post_call":
      return <CalendarClockIcon className={className} />
    case "hot_no_show":
      return <UserRoundXIcon className={className} />
    case "cold_ricerca_futura":
      return <SnowflakeIcon className={className} />
    case "won_in_attesa_di_conferma":
      return <CheckCircle2Icon className={className} />
    case "won_ricerca_attivata":
      return <TrophyIcon className={className} />
    case "lost":
      return <CircleXIcon className={className} />
    case "out_of_target":
      return <BanIcon className={className} />
    default:
      return <CircleDotIcon className={className} />
  }
}

function toDateTimeLocalValue(date: Date) {
  return utcIsoToRomaInput(date.toISOString())
}

function dateTimeLocalToIso(value: string) {
  return romaWallclockToUtcIso(value)
}

function booleanFilterToValue(value: BooleanFilterValue) {
  if (value === "yes") return true
  if (value === "no") return false
  return null
}

function sanitizeToolbarFilters(value: unknown): CrmPipelineToolbarFilters {
  if (!value || typeof value !== "object") return EMPTY_TOOLBAR_FILTERS
  const raw = value as Partial<CrmPipelineToolbarFilters>
  return {
    createdFrom: typeof raw.createdFrom === "string" ? raw.createdFrom : "",
    createdTo: typeof raw.createdTo === "string" ? raw.createdTo : "",
    tipoLavoro: Array.isArray(raw.tipoLavoro)
      ? raw.tipoLavoro.filter((item): item is string => typeof item === "string")
      : [],
    preventivoAccettato:
      raw.preventivoAccettato === "yes" || raw.preventivoAccettato === "no"
        ? raw.preventivoAccettato
        : "all",
    chiamataPrenotata:
      raw.chiamataPrenotata === "yes" || raw.chiamataPrenotata === "no"
        ? raw.chiamataPrenotata
        : "all",
  }
}

function readStoredToolbarFilters() {
  if (typeof window === "undefined") return EMPTY_TOOLBAR_FILTERS
  try {
    const raw = window.localStorage.getItem(CRM_PIPELINE_FILTERS_STORAGE_KEY)
    return raw ? sanitizeToolbarFilters(JSON.parse(raw)) : EMPTY_TOOLBAR_FILTERS
  } catch {
    return EMPTY_TOOLBAR_FILTERS
  }
}

function buildServerFilters(filters: CrmPipelineToolbarFilters): CrmPipelineFilters {
  return {
    createdFrom: dateTimeLocalToIso(filters.createdFrom),
    createdTo: dateTimeLocalToIso(filters.createdTo),
    tipoLavoro: filters.tipoLavoro,
    preventivoAccettato: booleanFilterToValue(filters.preventivoAccettato),
    chiamataPrenotata: booleanFilterToValue(filters.chiamataPrenotata),
  }
}

function applyDatePreset(
  preset: DatePresetValue,
  setFilters: React.Dispatch<React.SetStateAction<CrmPipelineToolbarFilters>>
) {
  if (preset === "custom") return

  const now = new Date()
  const from = new Date(now)

  if (preset === "24h") {
    from.setUTCHours(from.getUTCHours() - 24)
  } else if (preset === "7d") {
    from.setUTCDate(from.getUTCDate() - 7)
  } else if (preset === "30d") {
    from.setUTCMonth(from.getUTCMonth() - 1)
  } else {
    from.setUTCMonth(0, 1)
    from.setUTCHours(0, 0, 0, 0)
  }

  setFilters((current) => ({
    ...current,
    createdFrom: toDateTimeLocalValue(from),
    createdTo: toDateTimeLocalValue(now),
  }))
}

function toggleFilterValue(values: string[], value: string, checked: boolean) {
  if (checked) return values.includes(value) ? values : [...values, value]
  return values.filter((item) => item !== value)
}

function hasActiveFilters(filters: CrmPipelineToolbarFilters) {
  return (
    Boolean(filters.createdFrom) ||
    Boolean(filters.createdTo) ||
    filters.tipoLavoro.length > 0 ||
    filters.preventivoAccettato !== "all" ||
    filters.chiamataPrenotata !== "all"
  )
}

function serializeToolbarFilters(filters: CrmPipelineToolbarFilters) {
  return JSON.stringify({
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    tipoLavoro: [...filters.tipoLavoro].sort(),
    preventivoAccettato: filters.preventivoAccettato,
    chiamataPrenotata: filters.chiamataPrenotata,
  })
}

function ToolbarField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      <span>{label}</span>
      {children}
    </label>
  )
}

function CrmPipelineSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-73" showBadgeRow />
}

type ColumnProps = {
  column: CrmPipelineColumnData
  isDropTarget: boolean
  draggingProcessId: string | null
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
  onCardClick: (card: CrmPipelineCardData) => void
  isDeferred: boolean
  onLoadDeferred: (columnId: string) => void
}

function Column({
  column,
  isDropTarget,
  draggingProcessId,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onDragStartCard,
  onDragEndCard,
  onCardClick,
  isDeferred,
  onLoadDeferred,
}: ColumnProps) {
  const [visibleCardCount, setVisibleCardCount] = React.useState(VISIBLE_CARD_BATCH_SIZE)
  const visual = getColumnVisual(column.color)
  const visibleCards = column.cards.slice(0, visibleCardCount)
  const hiddenCardsCount = Math.max(0, column.cards.length - visibleCards.length)

  React.useEffect(() => {
    setVisibleCardCount(VISIBLE_CARD_BATCH_SIZE)
  }, [column.id, column.cards.length])

  const emptyState = isDeferred ? (
    <div className="space-y-3 rounded-lg border border-dashed border-border/60 px-4 py-6">
      <p className="text-sm text-muted-foreground/80">
        Colonna non caricata di default.
      </p>
      <KanbanDeferredColumnAction
        label={`Carica ${column.totalCount} ${column.totalCount === 1 ? "ricerca" : "ricerche"}`}
        onClick={() => onLoadDeferred(column.id)}
      />
    </div>
  ) : undefined

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={`kanban-column-${column.id}`}
      title={column.label}
      countLabel={`${column.totalCount} ${column.totalCount === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      headerIcon={getStageIcon(column.id, visual.iconClassName)}
      widthClassName="w-73"
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna ricerca"
      emptyState={emptyState}
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {visibleCards.map((card) => (
        <div
          key={card.id}
          data-testid={`pipeline-card-${card.id}`}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingProcessId === card.id && "opacity-40"
          )}
          onClick={() => {
            onCardClick(card)
          }}
        >
          <FamigliaProcessoCard data={card} />
        </div>
      ))}
      {hiddenCardsCount > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            setVisibleCardCount((current) => current + VISIBLE_CARD_BATCH_SIZE)
          }
        >
          Mostra altre {Math.min(VISIBLE_CARD_BATCH_SIZE, hiddenCardsCount)}
        </Button>
      ) : null}
    </KanbanColumnShell>
  )
}

export function CrmPipelineFamiglieView() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = React.useState("")
  const [toolbarFilters, setToolbarFilters] =
    React.useState<CrmPipelineToolbarFilters>(() => readStoredToolbarFilters())
  const [appliedToolbarFilters, setAppliedToolbarFilters] =
    React.useState<CrmPipelineToolbarFilters>(() => readStoredToolbarFilters())
  const [datePreset, setDatePreset] = React.useState<DatePresetValue>("custom")
  const serverFilters = React.useMemo(
    () => buildServerFilters(appliedToolbarFilters),
    [appliedToolbarFilters]
  )
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const {
    loading,
    error,
    columns,
    lookupOptionsByField,
    loadedClosedStageIds,
    loadClosedStage,
    loadProcessDetail,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
    updateAddressCard,
  } =
    useCrmPipelinePreview(
      appliedSearchQuery,
      serverFilters,
      isDetailOpen ? selectedCardId : null
    )
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(
    null
  )
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(
    null
  )
  const tipoLavoroOptions = lookupOptionsByField.tipo_lavoro ?? []
  const filtersActive =
    hasActiveFilters(appliedToolbarFilters) || appliedSearchQuery.trim().length > 0
  const hasPendingFilters =
    searchQuery !== appliedSearchQuery ||
    serializeToolbarFilters(toolbarFilters) !== serializeToolbarFilters(appliedToolbarFilters)
  const tipoLavoroFilterLabel =
    toolbarFilters.tipoLavoro.length === 0
      ? "Tutti"
      : toolbarFilters.tipoLavoro.length === 1
        ? toolbarFilters.tipoLavoro[0]
        : `${toolbarFilters.tipoLavoro.length} selezionati`

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        CRM_PIPELINE_FILTERS_STORAGE_KEY,
        JSON.stringify(appliedToolbarFilters)
      )
    } catch {
      // localStorage may be unavailable in private or embedded contexts.
    }
  }, [appliedToolbarFilters])

  const filteredColumns = React.useMemo(() => {
    const mappedColumns = columns.map((column) => {
      const filteredCards = column.cards.filter((card) =>
        matchesSearchQuery(
          [
            card.id,
            card.nomeFamiglia,
            card.email,
            card.telefono,
            ...(card.tipoLavoroBadges ?? []),
            card.tipoLavoroBadge,
            card.tipoRapportoBadge,
            card.stage,
            card.statoRes,
          ],
          appliedSearchQuery,
        )
      )

      return {
        ...column,
        totalCount: column.totalCount,
        cards: filteredCards,
      }
    })

    return mappedColumns
  }, [columns, appliedSearchQuery])

  const totalRicerche = React.useMemo(
    () =>
      filteredColumns.reduce((sum, column) => sum + column.totalCount, 0),
    [filteredColumns]
  )

  const selectedCard = React.useMemo(() => {
    if (!selectedCardId) return null
    for (const column of columns) {
      const matched = column.cards.find((card) => card.id === selectedCardId)
      if (matched) return matched
    }
    return null
  }, [columns, selectedCardId])

  React.useEffect(() => {
    if (!isDetailOpen || !selectedCardId) return
    void loadProcessDetail(selectedCardId)
  }, [isDetailOpen, loadProcessDetail, selectedCardId])

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId
      setDropTargetColumnId(null)
      setDraggingProcessId(null)
      if (!processId) return
      void moveCard(processId, columnId)
    },
    [draggingProcessId, moveCard]
  )

  const handleDragLeaveColumn = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const stillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (stillInside) return
      setDropTargetColumnId(null)
    },
    []
  )

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          badge={
            <Badge>
              {totalRicerche} {totalRicerche === 1 ? "ricerca" : "ricerche"}
            </Badge>
          }
        >
          Sales Pipeline
        </SectionHeader.Title>
        <SectionHeader.Toolbar className="flex-nowrap items-end gap-2 overflow-x-auto">
          <ToolbarField label="Cerca" className="w-72 shrink-0">
            <SearchInput
              data-testid="pipeline-search-input"
              placeholder="Cerca famiglia, email, telefono..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </ToolbarField>
          <ToolbarField label="Periodo">
            <Select
              value={datePreset}
              onValueChange={(value) => {
                const nextPreset = value as DatePresetValue
                setDatePreset(nextPreset)
                applyDatePreset(nextPreset, setToolbarFilters)
              }}
            >
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarField>
          <div className="flex shrink-0 items-end gap-2">
            <ToolbarField label="Creato da">
              <Input
                type="datetime-local"
                className="h-8 w-38 text-xs"
                value={toolbarFilters.createdFrom}
                onChange={(event) => {
                  setDatePreset("custom")
                  setToolbarFilters((current) => ({
                    ...current,
                    createdFrom: event.target.value,
                  }))
                }}
              />
            </ToolbarField>
            <ToolbarField label="Creato a">
              <Input
                type="datetime-local"
                className="h-8 w-38 text-xs"
                value={toolbarFilters.createdTo}
                onChange={(event) => {
                  setDatePreset("custom")
                  setToolbarFilters((current) => ({
                    ...current,
                    createdTo: event.target.value,
                  }))
                }}
              />
            </ToolbarField>
          </div>
          {tipoLavoroOptions.length ? (
            <ToolbarField label="Tipo ricerca">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-40 justify-between"
                  >
                    <span className="truncate">{tipoLavoroFilterLabel}</span>
                    <ChevronDownIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-80 w-72 overflow-y-auto">
                  <DropdownMenuLabel>Tipo ricerca</DropdownMenuLabel>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault()
                      setToolbarFilters((current) => ({ ...current, tipoLavoro: [] }))
                    }}
                  >
                    Tutti
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {tipoLavoroOptions.map((option) => {
                    const checked = toolbarFilters.tipoLavoro.includes(option.valueLabel)

                    return (
                      <DropdownMenuItem
                        key={option.valueKey}
                        onSelect={(event) => {
                          event.preventDefault()
                          setToolbarFilters((current) => ({
                            ...current,
                            tipoLavoro: toggleFilterValue(
                              current.tipoLavoro,
                              option.valueLabel,
                              !checked
                            ),
                          }))
                        }}
                      >
                        <Checkbox checked={checked} className="pointer-events-none" />
                        {option.valueLabel}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </ToolbarField>
          ) : null}
          <ToolbarField label="Preventivo">
            <Select
              value={toolbarFilters.preventivoAccettato}
              onValueChange={(value) =>
                setToolbarFilters((current) => ({
                  ...current,
                  preventivoAccettato: value as BooleanFilterValue,
                }))
              }
            >
              <SelectTrigger className="h-8 w-34 text-xs">
                <SelectValue placeholder="Preventivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="yes">Accettato</SelectItem>
                <SelectItem value="no">Non accettato</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>
          <ToolbarField label="Chiamata">
            <Select
              value={toolbarFilters.chiamataPrenotata}
              onValueChange={(value) =>
                setToolbarFilters((current) => ({
                  ...current,
                  chiamataPrenotata: value as BooleanFilterValue,
                }))
              }
            >
              <SelectTrigger className="h-8 w-30 text-xs">
                <SelectValue placeholder="Chiamata" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="yes">Sì</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarField>
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mb-0.5 shrink-0"
              data-testid="pipeline-reset-filters"
              title="Reset filtri"
              aria-label="Reset filtri"
              onClick={() => {
                setDatePreset("custom")
                setSearchQuery("")
                setAppliedSearchQuery("")
                setToolbarFilters(EMPTY_TOOLBAR_FILTERS)
                setAppliedToolbarFilters(EMPTY_TOOLBAR_FILTERS)
              }}
            >
              <XIcon className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            className="mb-0.5 shrink-0"
            data-testid="pipeline-apply-filters"
            disabled={!hasPendingFilters}
            title="Applica filtri"
            aria-label="Applica filtri"
            onClick={() => {
              setAppliedSearchQuery(searchQuery)
              setAppliedToolbarFilters(toolbarFilters)
            }}
          >
            <CheckIcon className="size-3.5" />
          </Button>
        </SectionHeader.Toolbar>
      </SectionHeader>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dati CRM: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-gutter:stable]">
        <div className="flex h-full min-w-max gap-4 px-6">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <CrmPipelineSkeletonColumn key={index} />
                  ))
                : filteredColumns.map((column) => (
                    <Column
                      key={column.id}
                      column={column}
                      isDropTarget={dropTargetColumnId === column.id}
                      draggingProcessId={draggingProcessId}
                      onDragEnterColumn={setDropTargetColumnId}
                      onDragOverColumn={setDropTargetColumnId}
                      onDragLeaveColumn={handleDragLeaveColumn}
                      onDropToColumn={handleDropToColumn}
                      onDragStartCard={(processId) => {
                        setDraggingProcessId(processId)
                      }}
                      onDragEndCard={() => {
                        setDraggingProcessId(null)
                        setDropTargetColumnId(null)
                      }}
                      onCardClick={(card) => {
                        setSelectedCardId(card.id)
                        setIsDetailOpen(true)
                      }}
                      isDeferred={
                        !filtersActive &&
                        DEFERRED_STAGE_IDS.has(column.id) &&
                        !loadedClosedStageIds.has(column.id)
                      }
                      onLoadDeferred={loadClosedStage}
                    />
                  ))}
        </div>
      </div>

      <FamigliaProcessoDetailShell
        // Remount when the selected card changes so input components reset
        // their local debounced-save state (hasUserEditedRef) and don't show
        // a stale draft from the previously selected card.
        key={selectedCardId ?? "__empty__"}
        mode="sheet"
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedCardId(null)
          }
        }}
        card={selectedCard}
        lookupOptionsByField={lookupOptionsByField}
        onChangeStatoSales={moveCard}
        onPatchProcess={async (processId, patch) => {
          await updateProcessCard(processId, patch)
        }}
        onPatchFamily={async (familyId, patch) => {
          await updateFamilyCard(familyId, patch)
        }}
        onPatchAddress={async (processId, addressId, patch) => {
          await updateAddressCard(processId, addressId, patch)
        }}
      />
    </section>
  )
}
