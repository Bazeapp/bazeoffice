import * as React from "react"
import {
  CalendarIcon,
  ExternalLinkIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import {
  type AssunzioniBoardCardData,
  type AssunzioniBoardColumnData,
  useAssunzioniBoard,
} from "@/hooks/use-assunzioni-board"
import { AssunzioniDetailSheet } from "@/components/gestione-contrattuale/assunzioni-detail-sheet"
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban"
import { RecordCard } from "@/components/shared-next/record-card"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { buildPathForRoute } from "@/routes/app-routes"
import { cn } from "@/lib/utils"

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" }
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" }
    case "amber":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" }
    case "lime":
      return { columnClassName: "bg-lime-400", headerClassName: "", iconClassName: "text-lime-500" }
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" }
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" }
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" }
  }
}

function formatItalianDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function AssunzioniBoardCard({
  card,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  card: AssunzioniBoardCardData
  dragging: boolean
  onClick: () => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  const dateLabel = card.rapporto?.data_inizio_rapporto
    ? formatItalianDate(card.rapporto.data_inizio_rapporto)
    : card.deadline

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <RecordCard>
        <RecordCard.Header
          title={`${card.nomeFamiglia} – ${card.nomeLavoratore}`}
          rightSlot={
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="-mr-1 -mt-1 shrink-0"
            >
              <a
                href={
                  card.processId
                    ? buildPathForRoute({
                        mainSection: "ricerca_pipeline",
                        anagraficheTab: "famiglie",
                        ricercaProcessId: card.processId,
                      })
                    : "#"
                }
                title="Apri processo"
                aria-disabled={!card.processId}
                onClick={(event) => {
                  event.stopPropagation()
                  if (card.processId) return
                  event.preventDefault()
                }}
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          }
        />
        <RecordCard.Body>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className={cn(
                card.famiglia
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600",
              )}
            >
              <UsersIcon />
              Famiglia
            </Badge>
            <Badge
              className={cn(
                card.lavoratore
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-600",
              )}
            >
              <UserCheckIcon />
              Lavoratore
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 border-t pt-2 text-xs">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}

function AssunzioniBoardColumn({
  column,
  draggingProcessId,
  isDropTarget,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onCardClick,
}: {
  column: AssunzioniBoardColumnData
  draggingProcessId: string | null
  isDropTarget: boolean
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
  onCardClick: (card: AssunzioniBoardCardData) => void
}) {
  const visual = getColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "processo" : "processi"}`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyMessage="Nessun processo"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <AssunzioniBoardCard
          key={card.id}
          card={card}
          dragging={draggingProcessId === card.id}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          onClick={() => onCardClick(card)}
        />
      ))}
    </KanbanColumnShell>
  )
}

function AssunzioniBoardSkeletonColumn() {
  return <KanbanColumnSkeleton showBadgeRow />
}

export function AssunzioniBoardView() {
  const { loading, error, columns, moveCard } = useAssunzioniBoard()
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedCard, setSelectedCard] = React.useState<AssunzioniBoardCardData | null>(null)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredColumns = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return columns
    const tokens = query.split(/\s+/).filter(Boolean)
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        const haystack = [
          card.nomeFamiglia,
          card.nomeLavoratore,
          card.email,
          card.telefono,
          card.rapporto?.tipo_rapporto,
          card.rapporto?.tipo_contratto,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return tokens.every((token) => haystack.includes(token))
      }),
    }))
  }, [columns, searchValue])

  const totalProcesses = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  )

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalProcesses} ${totalProcesses === 1 ? "processo" : "processi"}`}
        >
          Assunzioni
        </SectionHeader.Title>
        <SectionHeader.Toolbar>
          <SearchInput
            className="md:max-w-sm"
            placeholder="Cerca per famiglia, lavoratore, email..."
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onClear={() => setSearchValue("")}
          />
        </SectionHeader.Toolbar>
      </SectionHeader>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assunzioni: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <AssunzioniBoardSkeletonColumn key={index} />)
            : filteredColumns.map((column) => (
                <AssunzioniBoardColumn
                  key={column.id}
                  column={column}
                  draggingProcessId={draggingProcessId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onDragStartCard={setDraggingProcessId}
                  onDragEndCard={() => {
                    window.setTimeout(() => {
                      setDraggingProcessId(null)
                      setDropTargetColumnId(null)
                    }, 0)
                  }}
                  onDragEnterColumn={setDropTargetColumnId}
                  onDragOverColumn={setDropTargetColumnId}
                  onDragLeaveColumn={(event) => {
                    const nextTarget = event.relatedTarget
                    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
                    setDropTargetColumnId((current) => (current === column.id ? null : current))
                  }}
                  onDropToColumn={(columnId, processId) => {
                    setDropTargetColumnId(null)
                    setDraggingProcessId(null)
                    if (!processId) return
                    void moveCard(processId, columnId)
                  }}
                  onCardClick={setSelectedCard}
                />
              ))}
        </div>
      </div>

      <AssunzioniDetailSheet
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null)
        }}
      />
    </section>
  )
}
