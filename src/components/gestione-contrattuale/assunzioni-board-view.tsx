import * as React from "react"
import {
  CalendarIcon,
  ExternalLinkIcon,
  FilePlus2Icon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"

import {
  type AssunzioniBoardCardData,
  type AssunzioniBoardColumnData,
  useAssunzioniBoard,
} from "@/hooks/use-assunzioni-board"
import { AssunzioniDetailSheet } from "@/components/gestione-contrattuale/assunzioni-detail-sheet"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { buildPathForRoute } from "@/routes/app-routes"
import { cn } from "@/lib/utils"

function getColumnClasses(color: string) {
  switch (color.toLowerCase()) {
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "teal":
      return {
        columnClassName: "border-teal-300 bg-teal-50/70",
        headerClassName: "border-b border-teal-200/70",
        iconClassName: "text-teal-500",
      }
    case "amber":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
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
        iconClassName: "text-green-600",
      }
    case "orange":
      return {
        columnClassName: "border-orange-300 bg-orange-50/70",
        headerClassName: "border-b border-orange-200/70",
        iconClassName: "text-orange-600",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground",
      }
  }
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
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <Card className="border border-border/70 bg-white py-2 transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 px-3">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm font-semibold leading-tight">
              {card.nomeFamiglia} – {card.nomeLavoratore}
            </p>
            <Button asChild variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0">
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
                  if (card.processId) return
                  event.preventDefault()
                }}
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          </div>

          <div className="flex min-h-5 flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-medium",
                card.famiglia ? "border-green-200 bg-green-100 text-green-700" : "border-zinc-200 bg-zinc-100 text-zinc-600"
              )}
            >
              <UsersIcon className="mr-1 size-3" />
              Famiglia
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] font-medium",
                card.lavoratore ? "border-green-200 bg-green-100 text-green-700" : "border-zinc-200 bg-zinc-100 text-zinc-600"
              )}
            >
              <UserCheckIcon className="mr-1 size-3" />
              Lavoratore
            </Badge>
          </div>

          <div className="text-muted-foreground space-y-1.5 border-t pt-2 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {card.rapporto?.data_inizio_rapporto ? formatItalianDate(card.rapporto.data_inizio_rapporto) : card.deadline}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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
  const visual = getColumnClasses(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "processo" : "processi"}`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun processo
        </div>
      }
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

  return (
    <section className="flex h-[calc(100vh-6.5rem)] min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
      <div className="flex items-center gap-2 px-1">
        <FilePlus2Icon className="text-muted-foreground size-4" />
        <h1 className="text-base font-semibold">Assunzioni</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assunzioni: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <AssunzioniBoardSkeletonColumn key={index} />)
            : columns.map((column) => (
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
