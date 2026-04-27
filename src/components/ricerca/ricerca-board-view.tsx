import * as React from "react"

import {
  type RicercaBoardCardData,
  type RicercaBoardColumnData,
  useRicercaBoard,
} from "@/hooks/use-ricerca-board"
import { RicercaActiveSearchCard } from "@/components/ricerca/ricerca-active-search-card"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  KanbanDeferredColumnAction,
} from "@/components/shared-next/kanban"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Avatar } from "@/components/ui-next/avatar"
import { Badge } from "@/components/ui-next/badge"
import { SearchInput } from "@/components/ui-next/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui-next/select"
import { cn } from "@/lib/utils"

type ColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

function toAvatarRingClass(legacy: string) {
  // Convert legacy `after:border-X-Y` -> new `ring-2 ring-X-Y` for ui-next Avatar.
  return legacy.replace(/after:border-/g, "ring-2 ring-")
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

  // Stage-specific shades — preserva la progressione di intensità del legacy:
  // selezione_inviata (chiaro) → match (intenso) sull'asse emerald.
  switch (token) {
    case "fare ricerca":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "selezione inviata":
      return { columnClassName: "bg-emerald-300", headerClassName: "", iconClassName: "text-emerald-400" }
    case "fase di colloqui":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" }
    case "in prova con lavoratore":
      return { columnClassName: "bg-emerald-500", headerClassName: "", iconClassName: "text-emerald-600" }
    case "match":
      return { columnClassName: "bg-emerald-600", headerClassName: "", iconClassName: "text-emerald-700" }
    case "no match":
      return { columnClassName: "bg-red-400", headerClassName: "", iconClassName: "text-red-500" }
    case "stand by":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" }
    default:
      break
  }

  // Fallback su color generico → bg-{color}-400 + icon text-{color}-500.
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return { columnClassName: "bg-red-400", headerClassName: "", iconClassName: "text-red-500" }
    case "rose":
      return { columnClassName: "bg-rose-400", headerClassName: "", iconClassName: "text-rose-500" }
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" }
    case "amber":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "yellow":
      return { columnClassName: "bg-yellow-400", headerClassName: "", iconClassName: "text-yellow-500" }
    case "lime":
      return { columnClassName: "bg-lime-400", headerClassName: "", iconClassName: "text-lime-500" }
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" }
    case "emerald":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" }
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" }
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" }
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "blue":
      return { columnClassName: "bg-blue-400", headerClassName: "", iconClassName: "text-blue-500" }
    case "indigo":
      return { columnClassName: "bg-indigo-400", headerClassName: "", iconClassName: "text-indigo-500" }
    case "violet":
      return { columnClassName: "bg-violet-400", headerClassName: "", iconClassName: "text-violet-500" }
    case "purple":
      return { columnClassName: "bg-purple-400", headerClassName: "", iconClassName: "text-purple-500" }
    case "fuchsia":
      return { columnClassName: "bg-fuchsia-400", headerClassName: "", iconClassName: "text-fuchsia-500" }
    case "pink":
      return { columnClassName: "bg-pink-400", headerClassName: "", iconClassName: "text-pink-500" }
    case "slate":
      return { columnClassName: "bg-slate-400", headerClassName: "", iconClassName: "text-slate-500" }
    case "gray":
      return { columnClassName: "bg-gray-400", headerClassName: "", iconClassName: "text-gray-500" }
    case "zinc":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
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
      <RicercaActiveSearchCard data={data} />
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
  onLoadDeferredColumn,
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
  onLoadDeferredColumn: (columnId: string) => void
}) {
  const visual = getColumnVisual(column.id, column.label, column.color)
  const count = column.totalCount
  const deferredActionLabel = (() => {
    const token = normalizeStageToken(column.label || column.id)
    if (token === "match") return "Mostra Match"
    if (token === "no match") return "Mostra NoMatch"
    return `Mostra ${column.label}`
  })()

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${count} ${count === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      widthClassName="w-[300px]"
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna ricerca"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.deferred && !column.isLoaded ? (
        <KanbanDeferredColumnAction
          label={deferredActionLabel}
          isLoading={column.isLoading}
          onClick={() => {
            onLoadDeferredColumn(column.id)
          }}
        />
      ) : null}
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
  const { loading, error, columns, moveCard, loadDeferredColumn } = useRicercaBoard()
  const { options: operatorOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOperatorId, setSelectedOperatorId] = React.useState("all")
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
    const q = searchQuery.trim().toLowerCase()

    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        if (selectedOperatorId !== "all" && card.operatorId !== selectedOperatorId) {
          return false
        }
        if (q) {
          const matches =
            card.cognomeFamiglia.toLowerCase().includes(q) ||
            card.email.toLowerCase().includes(q) ||
            card.id.toLowerCase().includes(q)
          if (!matches) return false
        }
        return true
      }),
    }))
  }, [columns, searchQuery, selectedOperatorId])
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

  const totalRicerche = React.useMemo(
    () =>
      filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns]
  )

  return (
    <section className="ui-next flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento board ricerca: {error}
        </div>
      ) : null}

      <SectionHeader>
        <SectionHeader.Title
          badge={
            <Badge>
              {totalRicerche} {totalRicerche === 1 ? "ricerca" : "ricerche"}
            </Badge>
          }
        >
          Ricerche
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
            <SelectTrigger className="w-[240px]">
              {selectedOperator ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar
                    size="sm"
                    fallback={selectedOperator.avatar}
                    className={toAvatarRingClass(
                      selectedOperator.avatarBorderClassName,
                    )}
                  />
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
                    <Avatar
                      size="sm"
                      fallback={operator.avatar}
                      className={toAvatarRingClass(operator.avatarBorderClassName)}
                    />
                    <span>{operator.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-[420px]">
            <SearchInput
              placeholder="Cerca per cognome, email o ID..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4 px-6">
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
                    setDraggingProcessId(processId)
                  }}
                  onDragEndCard={() => {
                    setDraggingProcessId(null)
                    setDropTargetColumnId(null)
                  }}
                  onCardClick={(card) => {
                    onOpenDetail(card.id)
                  }}
                  onLoadDeferredColumn={(columnId) => {
                    void loadDeferredColumn(columnId)
                  }}
                />
              ))}
        </div>
      </div>
    </section>
  )
}
