import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  ListFilterIcon,
  MapPinIcon,
} from "lucide-react"

import {
  type RicercaBoardCardData,
  type RicercaBoardColumnData,
  useRicercaBoard,
} from "@/hooks/use-ricerca-board"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim()
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

type ColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

function normalizeStageToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function getColumnVisual(columnId: string, columnLabel: string, color: string | null): ColumnVisual {
  const token = normalizeStageToken(columnLabel || columnId)

  switch (token) {
    case "fare ricerca":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "selezione inviata":
      return {
        columnClassName: "border-emerald-200 bg-emerald-50/60",
        headerClassName: "border-b border-emerald-200/70",
        iconClassName: "text-emerald-400",
      }
    case "fase di colloqui":
      return {
        columnClassName: "border-emerald-300 bg-emerald-50/70",
        headerClassName: "border-b border-emerald-300/70",
        iconClassName: "text-emerald-500",
      }
    case "in prova con lavoratore":
      return {
        columnClassName: "border-emerald-400 bg-emerald-100/70",
        headerClassName: "border-b border-emerald-400/60",
        iconClassName: "text-emerald-600",
      }
    case "match":
      return {
        columnClassName: "border-emerald-600 bg-emerald-100/90",
        headerClassName: "border-b border-emerald-600/40",
        iconClassName: "text-emerald-700",
      }
    case "no match":
      return {
        columnClassName: "border-red-300 bg-red-50/70",
        headerClassName: "border-b border-red-200/70",
        iconClassName: "text-red-500",
      }
    case "stand by":
      return {
        columnClassName: "border-zinc-300 bg-zinc-50/70",
        headerClassName: "border-b border-zinc-200/70",
        iconClassName: "text-zinc-500",
      }
    default:
      break
  }

  switch ((color ?? "").toLowerCase()) {
    case "red":
      return {
        columnClassName: "border-red-300 bg-red-50/70",
        headerClassName: "border-b border-red-200/70",
        iconClassName: "text-red-500",
      }
    case "rose":
      return {
        columnClassName: "border-rose-300 bg-rose-50/70",
        headerClassName: "border-b border-rose-200/70",
        iconClassName: "text-rose-500",
      }
    case "orange":
      return {
        columnClassName: "border-orange-300 bg-orange-50/70",
        headerClassName: "border-b border-orange-200/70",
        iconClassName: "text-orange-500",
      }
    case "amber":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "yellow":
      return {
        columnClassName: "border-yellow-300 bg-yellow-50/70",
        headerClassName: "border-b border-yellow-200/70",
        iconClassName: "text-yellow-500",
      }
    case "lime":
      return {
        columnClassName: "border-lime-300 bg-lime-50/70",
        headerClassName: "border-b border-lime-200/70",
        iconClassName: "text-lime-500",
      }
    case "green":
      return {
        columnClassName: "border-green-300 bg-green-50/70",
        headerClassName: "border-b border-green-200/70",
        iconClassName: "text-green-500",
      }
    case "emerald":
      return {
        columnClassName: "border-emerald-300 bg-emerald-50/70",
        headerClassName: "border-b border-emerald-200/70",
        iconClassName: "text-emerald-500",
      }
    case "teal":
      return {
        columnClassName: "border-teal-300 bg-teal-50/70",
        headerClassName: "border-b border-teal-200/70",
        iconClassName: "text-teal-500",
      }
    case "cyan":
      return {
        columnClassName: "border-cyan-300 bg-cyan-50/70",
        headerClassName: "border-b border-cyan-200/70",
        iconClassName: "text-cyan-500",
      }
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "blue":
      return {
        columnClassName: "border-blue-300 bg-blue-50/70",
        headerClassName: "border-b border-blue-200/70",
        iconClassName: "text-blue-500",
      }
    case "indigo":
      return {
        columnClassName: "border-indigo-300 bg-indigo-50/70",
        headerClassName: "border-b border-indigo-200/70",
        iconClassName: "text-indigo-500",
      }
    case "violet":
      return {
        columnClassName: "border-violet-300 bg-violet-50/70",
        headerClassName: "border-b border-violet-200/70",
        iconClassName: "text-violet-500",
      }
    case "purple":
      return {
        columnClassName: "border-purple-300 bg-purple-50/70",
        headerClassName: "border-b border-purple-200/70",
        iconClassName: "text-purple-500",
      }
    case "fuchsia":
      return {
        columnClassName: "border-fuchsia-300 bg-fuchsia-50/70",
        headerClassName: "border-b border-fuchsia-200/70",
        iconClassName: "text-fuchsia-500",
      }
    case "pink":
      return {
        columnClassName: "border-pink-300 bg-pink-50/70",
        headerClassName: "border-b border-pink-200/70",
        iconClassName: "text-pink-500",
      }
    case "slate":
      return {
        columnClassName: "border-slate-300 bg-slate-50/70",
        headerClassName: "border-b border-slate-200/70",
        iconClassName: "text-slate-500",
      }
    case "gray":
      return {
        columnClassName: "border-gray-300 bg-gray-50/70",
        headerClassName: "border-b border-gray-200/70",
        iconClassName: "text-gray-500",
      }
    case "zinc":
      return {
        columnClassName: "border-zinc-300 bg-zinc-50/70",
        headerClassName: "border-b border-zinc-200/70",
        iconClassName: "text-zinc-500",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground/80",
      }
  }
}

function RicercaBoardSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-[300px]" showBadgeRow />
}

function RicercaBoardCard({
  data,
  onClick,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  data: RicercaBoardCardData
  onClick: () => void
  dragging: boolean
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40"
      )}
      onClick={onClick}
    >
      <Card className="border border-border/70 bg-white py-2 transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 px-3">
          <p className="truncate text-sm font-semibold">{data.nomeFamiglia}</p>
          <div className="flex min-h-4 flex-col gap-1.5">
            {data.tipoLavoroBadge ? (
              <Badge
                variant="outline"
                className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                  data.tipoLavoroColor
                )}`}
              >
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoLavoroBadge)}
              </Badge>
            ) : null}
            {data.tipoRapportoBadge ? (
              <Badge
                variant="outline"
                className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                  data.tipoRapportoColor
                )}`}
              >
                <Clock3Icon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoRapportoBadge)}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-start justify-between gap-2 border-t pt-2">
            <div className="text-muted-foreground min-w-0 space-y-1 text-xs">
              <p className="flex items-center gap-1.5 truncate">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span className="truncate">{data.deadline}</span>
              </p>
              <p className="flex items-center gap-1.5 truncate">
                <MapPinIcon className="size-3.5 shrink-0" />
                <span className="truncate">{data.zona}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RicercaBoardColumn({
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
  suppressCardClickRef,
}: {
  column: RicercaBoardColumnData
  isDropTarget: boolean
  draggingProcessId: string | null
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
  onCardClick: (card: RicercaBoardCardData) => void
  suppressCardClickRef: React.MutableRefObject<boolean>
}) {
  const visual = getColumnVisual(column.id, column.label, column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      widthClassName="w-[300px]"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessuna ricerca
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <RicercaBoardCard
          key={card.id}
          data={card}
          dragging={draggingProcessId === card.id}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          onClick={() => {
            if (suppressCardClickRef.current) return
            onCardClick(card)
          }}
        />
      ))}
    </KanbanColumnShell>
  )
}

type RicercaBoardViewProps = {
  onOpenDetail: (processId: string) => void
}

export function RicercaBoardView({ onOpenDetail }: RicercaBoardViewProps) {
  const { loading, error, columns, moveCard } = useRicercaBoard()
  const { options: operatorOptions } = useOperatoriOptions()
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [filters, setFilters] = React.useState({
    cognome: "",
    email: "",
    id: "",
  })
  const [selectedOperatorId, setSelectedOperatorId] = React.useState("all")
  const suppressCardClickRef = React.useRef(false)
  const operatorFilterAllowedStages = React.useMemo(
    () =>
      new Set([
        "fare_ricerca",
        "selezione_inviata",
        "selezione_inviata,_in_attesa_di_feedback",
        "fase_di_colloqui",
        "in_prova_con_lavoratore",
      ]),
    []
  )
  const selectableOperatorOptions = React.useMemo(() => {
    const operatorIdsWithEligibleSearch = new Set<string>()

    for (const column of columns) {
      const columnStageId = String(column.id || "")
        .trim()
        .toLowerCase()
      if (!operatorFilterAllowedStages.has(columnStageId)) continue

      for (const card of column.cards) {
        if (!card.operatorId) continue
        operatorIdsWithEligibleSearch.add(card.operatorId)
      }
    }

    return operatorOptions.filter((operator) =>
      operatorIdsWithEligibleSearch.has(operator.id)
    )
  }, [columns, operatorFilterAllowedStages, operatorOptions])

  const filteredColumns = React.useMemo(() => {
    const cognomeFilter = filters.cognome.trim().toLowerCase()
    const emailFilter = filters.email.trim().toLowerCase()
    const idFilter = filters.id.trim().toLowerCase()

    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        if (selectedOperatorId !== "all" && card.operatorId !== selectedOperatorId) {
          return false
        }
        if (
          cognomeFilter &&
          !card.cognomeFamiglia.toLowerCase().includes(cognomeFilter)
        ) {
          return false
        }
        if (emailFilter && !card.email.toLowerCase().includes(emailFilter)) {
          return false
        }
        if (idFilter && !card.id.toLowerCase().includes(idFilter)) {
          return false
        }
        return true
      }),
    }))
  }, [columns, filters, selectedOperatorId])
  const selectedOperator = React.useMemo(
    () =>
      selectableOperatorOptions.find((operator) => operator.id === selectedOperatorId) ??
      null,
    [selectableOperatorOptions, selectedOperatorId]
  )
  React.useEffect(() => {
    if (selectedOperatorId === "all") return

    const isSelectable = selectableOperatorOptions.some(
      (operator) => operator.id === selectedOperatorId
    )
    if (!isSelectable) {
      setSelectedOperatorId("all")
    }
  }, [selectableOperatorOptions, selectedOperatorId])
  const activeFilterCount = React.useMemo(() => {
    return [
      filters.cognome.trim(),
      filters.email.trim(),
      filters.id.trim(),
      selectedOperatorId !== "all" ? selectedOperatorId : "",
    ].filter(Boolean).length
  }, [filters, selectedOperatorId])
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
    <section className="flex h-[calc(100vh-6.5rem)] min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento board ricerca: {error}
        </div>
      ) : null}

      <div className="flex items-center justify-start">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                className="relative"
                title="Filtri"
                aria-label={`Filtri (${activeFilterCount})`}
              >
                <ListFilterIcon />
                <span className="bg-muted text-muted-foreground absolute -top-1 -right-1 rounded-full px-1 text-[10px] leading-4">
                  {activeFilterCount}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" side="bottom" sideOffset={8} className="w-[360px] p-0">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">Filtri ricerca</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Filtra la board per cognome, email o ID.
                </p>
              </div>
              <div className="px-4 py-3">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Cognome</FieldLabel>
                    <FieldContent>
                      <Input
                        value={filters.cognome}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            cognome: event.target.value,
                          }))
                        }
                        placeholder="Filtra per cognome"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <FieldContent>
                      <Input
                        value={filters.email}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="Filtra per email"
                      />
                    </FieldContent>
                  </Field>
                  <Field>
                    <FieldLabel>ID</FieldLabel>
                    <FieldContent>
                      <Input
                        value={filters.id}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            id: event.target.value,
                          }))
                        }
                        placeholder="Filtra per ID"
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
            <SelectTrigger className="w-[240px]">
              {selectedOperator ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar size="sm" className={selectedOperator.avatarBorderClassName}>
                    <AvatarFallback>{selectedOperator.avatar}</AvatarFallback>
                  </Avatar>
                  <span>{selectedOperator.label}</span>
                </span>
              ) : (
                <span>Tutti gli operatori</span>
              )}
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Tutti gli operatori</SelectItem>
              {selectableOperatorOptions.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  <span className="inline-flex items-center gap-2">
                    <Avatar size="sm" className={operator.avatarBorderClassName}>
                      <AvatarFallback>{operator.avatar}</AvatarFallback>
                    </Avatar>
                    <span>{operator.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-w-max gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <RicercaBoardSkeletonColumn key={index} />
              ))
            : filteredColumns.map((column) => (
                <RicercaBoardColumn
                  key={column.id}
                  column={column}
                  isDropTarget={dropTargetColumnId === column.id}
                  draggingProcessId={draggingProcessId}
                  onDragEnterColumn={setDropTargetColumnId}
                  onDragOverColumn={setDropTargetColumnId}
                  onDragLeaveColumn={handleDragLeaveColumn}
                  onDropToColumn={handleDropToColumn}
                  onDragStartCard={(processId) => {
                    suppressCardClickRef.current = true
                    setDraggingProcessId(processId)
                  }}
                  onDragEndCard={() => {
                    setDraggingProcessId(null)
                    setDropTargetColumnId(null)
                    setTimeout(() => {
                      suppressCardClickRef.current = false
                    }, 150)
                  }}
                  onCardClick={(card) => {
                    onOpenDetail(card.id)
                  }}
                  suppressCardClickRef={suppressCardClickRef}
                />
              ))}
        </div>
      </div>
    </section>
  )
}
