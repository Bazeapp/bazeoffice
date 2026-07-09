import * as React from "react"

import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"
import { useRicercaBoard } from "../hooks/use-ricerca-board"
import {
  RicercaActiveSearchCard,
  type RicercaCardRecruiter,
} from "./ricerca-active-search-card"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  KanbanDeferredColumnAction,
} from "@/components/shared-next/kanban"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { matchesSearchQuery } from "@/lib/search-utils"
import { cn, toAvatarRingClass } from "@/lib/utils"
import { getRicercaColumnVisual, normalizeRicercaStageToken } from "../lib/board-column-utils"

function RicercaBoardSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-75" showBadgeRow />
}

function RicercaBoardCard({
  data,
  onClick,
  dragging,
  onDragStart,
  onDragEnd,
  recruitersById,
}: {
  data: RicercaBoardCardData
  onClick: () => void
  dragging: boolean
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  recruitersById: Map<string, RicercaCardRecruiter>
}) {
  return (
    <div
      draggable
      data-testid={`ricerca-card-${data.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40"
      )}
      onClick={onClick}
    >
      <RicercaActiveSearchCard
        data={data}
        recruiter={
          data.operatorId ? (recruitersById.get(data.operatorId) ?? null) : null
        }
      />
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
  recruitersById,
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
  recruitersById: Map<string, RicercaCardRecruiter>
}) {
  const visual = getRicercaColumnVisual(column.id, column.label, column.color)
  const count = column.totalCount
  const deferredActionLabel = (() => {
    const token = normalizeRicercaStageToken(column.label || column.id)
    if (token === "match") return "Mostra Match"
    if (token === "no match") return "Mostra NoMatch"
    return `Mostra ${column.label}`
  })()

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={`kanban-column-${column.id}`}
      title={column.label}
      countLabel={`${count} ${count === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      widthClassName="w-75"
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
          recruitersById={recruitersById}
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
  const recruitersById = React.useMemo(
    () =>
      new Map<string, RicercaCardRecruiter>(
        operatorOptions.map((option) => [
          option.id,
          {
            avatar: option.avatar,
            ringClassName: toAvatarRingClass(option.avatarBorderClassName),
            label: option.label,
          },
        ]),
      ),
    [operatorOptions],
  )
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOperatorId, setSelectedOperatorId] = React.useState("all")

  const filteredColumns = React.useMemo(() => {
    const hasActiveFilters =
      selectedOperatorId !== "all" || searchQuery.trim().length > 0

    const mappedColumns = columns.map((column) => {
      const filteredCards = column.cards.filter((card) => {
        if (selectedOperatorId === "unassigned" && card.operatorId) {
          return false
        }
        if (
          selectedOperatorId !== "all" &&
          selectedOperatorId !== "unassigned" &&
          card.operatorId !== selectedOperatorId
        ) {
          return false
        }
        return matchesSearchQuery(
          [
            card.id,
            card.nomeFamiglia,
            card.cognomeFamiglia,
            card.email,
            card.telefono,
            card.zona,
            ...(card.tipoLavoroBadges ?? []),
            card.tipoLavoroBadge,
            card.tipoRapportoBadge,
            card.oreSettimanali,
            card.giorniSettimanali,
          ],
          searchQuery,
        )
      })

      return {
        ...column,
        totalCount:
          column.deferred && !column.isLoaded && !hasActiveFilters
            ? column.totalCount
            : filteredCards.length,
        cards: filteredCards,
      }
    })

    return mappedColumns
  }, [columns, searchQuery, selectedOperatorId])
  const selectedOperator = React.useMemo(
    () =>
      operatorOptions.find((operator) => operator.id === selectedOperatorId) ?? null,
    [operatorOptions, selectedOperatorId]
  )
  React.useEffect(() => {
    if (selectedOperatorId === "all" || selectedOperatorId === "unassigned") return

    const isSelectable = operatorOptions.some(
      (operator) => operator.id === selectedOperatorId
    )
    if (!isSelectable) {
      setSelectedOperatorId("all")
    }
  }, [operatorOptions, selectedOperatorId])
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
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
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
            <SelectTrigger className="w-60" data-testid="ricerca-filter-recruiter">
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
                <span>
                  {selectedOperatorId === "unassigned"
                    ? "Senza recruiter"
                    : "Tutti i recruiter"}
                </span>
              )}
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Tutti i recruiter</SelectItem>
              <SelectItem value="unassigned">Senza recruiter</SelectItem>
              {operatorOptions.map((operator) => (
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
          <div className="min-w-0 flex-1 max-w-105">
            <SearchInput
              data-testid="ricerca-search-input"
              placeholder="Cerca per cognome, email o ID..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4 px-6">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <RicercaBoardSkeletonColumn key={index} />
              ))
            : filteredColumns.map((column) => (
                <RicercaBoardColumn
                  key={column.id}
                  column={column}
                  recruitersById={recruitersById}
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
