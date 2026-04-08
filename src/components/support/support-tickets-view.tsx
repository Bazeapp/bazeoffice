import * as React from "react"
import { Clock3Icon, PaperclipIcon, PlusIcon, SearchIcon } from "lucide-react"

import { SupportTicketCreateDialog } from "@/components/support/support-ticket-create-dialog"
import { SupportTicketDetailSheet } from "@/components/support/support-ticket-detail-sheet"
import {
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketType,
} from "@/components/support/support-ticket-config"
import {
  type SupportTicketBoardCardData,
  useSupportTicketsBoard,
} from "@/hooks/use-support-tickets-board"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type SupportColumnData = {
  id: string
  label: string
  color: string
  cards: SupportTicketBoardCardData[]
}

function getColumnClasses(color: string) {
  switch (color.toLowerCase()) {
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "amber":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "orange":
      return {
        columnClassName: "border-orange-300 bg-orange-50/70",
        headerClassName: "border-b border-orange-200/70",
        iconClassName: "text-orange-500",
      }
    case "green":
      return {
        columnClassName: "border-green-300 bg-green-50/70",
        headerClassName: "border-b border-green-200/70",
        iconClassName: "text-green-500",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground",
      }
  }
}

function SupportTicketCard({ card }: { card: SupportTicketBoardCardData }) {
  const tagConfig = resolveSupportTicketTag(card.tag)
  const urgencyConfig = resolveSupportTicketUrgency(card.urgenza)
  const TagIcon = tagConfig.icon

  return (
    <Card className="border border-border/70 bg-white py-0 transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="space-y-1">
          <p className="line-clamp-2 text-sm font-semibold leading-tight">{card.causale}</p>
          <p className="text-muted-foreground truncate text-xs">{card.nomeCompleto}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={tagConfig.colorClassName}>
            <TagIcon className="mr-1 size-3.5" />
            {tagConfig.label}
          </Badge>
          <Badge variant="secondary" className={urgencyConfig.badgeClassName}>
            {urgencyConfig.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px]">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Clock3Icon className="size-3.5" />
            <span>{card.dataAperturaLabel}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            {card.attachmentCount > 0 ? (
              <span className="flex items-center gap-1">
                <PaperclipIcon className="size-3.5" />
                {card.attachmentCount}
              </span>
            ) : null}
            <span className="font-medium text-foreground">{card.assegnatario.split(" ")[0]}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SupportTicketsBoardColumn({
  column,
  draggingTicketId,
  isDropTarget,
  onOpenTicket,
  onDragStartTicket,
  onDragEndTicket,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: {
  column: SupportColumnData
  draggingTicketId: string | null
  isDropTarget: boolean
  onOpenTicket: (ticketId: string) => void
  onDragStartTicket: (ticketId: string) => void
  onDragEndTicket: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, ticketId: string | null) => void
}) {
  const visual = getColumnClasses(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "ticket" : "ticket"}`}
      visual={visual}
      density="compact"
      widthClassName="w-[292px]"
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessun ticket
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <div
          key={card.id}
          draggable
          onClick={() => onOpenTicket(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartTicket(card.id)
          }}
          onDragEnd={onDragEndTicket}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingTicketId === card.id && "opacity-40"
          )}
        >
          <SupportTicketCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}

function SupportTicketsBoardSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-[292px]" density="compact" showBadgeRow />
}

export function SupportTicketsView({ ticketType }: { ticketType: SupportTicketType }) {
  const [search, setSearch] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [draggingTicketId, setDraggingTicketId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null)
  const {
    loading,
    error,
    stages,
    cards,
    rapportoOptions,
    createTicket,
    moveTicket,
    patchTicket,
  } = useSupportTicketsBoard(ticketType)

  const filteredCards = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return cards.filter((card) => {
      if (stageFilter !== "all" && card.stage !== stageFilter) return false
      if (!normalizedSearch) return true

      return (
        card.causale.toLowerCase().includes(normalizedSearch) ||
        card.nomeFamiglia.toLowerCase().includes(normalizedSearch) ||
        card.nomeLavoratore.toLowerCase().includes(normalizedSearch) ||
        card.tag.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [cards, search, stageFilter])

  const columns = React.useMemo<SupportColumnData[]>(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        color: stage.color,
        cards: filteredCards.filter((card) => card.stage === stage.id),
      })),
    [filteredCards, stages]
  )

  const selectedCard = React.useMemo(
    () => cards.find((card) => card.id === selectedTicketId) ?? null,
    [cards, selectedTicketId]
  )

  return (
    <section className="flex h-[calc(100vh-6.5rem)] min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
              placeholder="Cerca causale, famiglia o lavoratore"
            />
          </div>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || stageFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("")
                setStageFilter("all")
              }}
            >
              Reset filtri
            </Button>
          )}
        </div>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Apri ticket
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento ticket: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => <SupportTicketsBoardSkeletonColumn key={index} />)
            : columns.map((column) => (
                <SupportTicketsBoardColumn
                  key={column.id}
                  column={column}
                  draggingTicketId={draggingTicketId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenTicket={setSelectedTicketId}
                  onDragStartTicket={setDraggingTicketId}
                  onDragEndTicket={() => {
                    window.setTimeout(() => {
                      setDraggingTicketId(null)
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
                  onDropToColumn={(columnId, ticketId) => {
                    setDropTargetColumnId(null)
                    setDraggingTicketId(null)
                    if (!ticketId) return
                    void moveTicket(ticketId, columnId)
                  }}
                />
              ))}
        </div>
      </div>

      <SupportTicketCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultTicketType={ticketType}
        rapportoOptions={rapportoOptions}
        onCreateTicket={createTicket}
      />

      {selectedCard ? (
        <SupportTicketDetailSheet
          card={selectedCard}
          stages={stages}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedTicketId(null)
          }}
          onMoveTicket={moveTicket}
          onPatchTicket={patchTicket}
        />
      ) : null}
    </section>
  )
}
