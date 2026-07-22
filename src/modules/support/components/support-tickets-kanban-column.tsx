import {
  KanbanColumnShell,
  KanbanDeferredColumnAction,
} from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"

import { ticketsStageTestId } from "../lib/support-tickets-view.utils"
import type { SupportTicketsColumnData } from "../types"
import { SupportTicketsCard } from "./support-tickets-card"

export type SupportTicketsKanbanColumnProps = {
  column: SupportTicketsColumnData
  boardTestIdPrefix: string
  draggingTicketId: string | null
  isDropTarget: boolean
  onOpenTicket: (ticketId: string) => void
  onLoadDeferredColumn: (columnId: string) => void
  onDragStartTicket: (ticketId: string) => void
  onDragEndTicket: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, ticketId: string | null) => void
}

export function SupportTicketsKanbanColumn({
  column,
  boardTestIdPrefix,
  draggingTicketId,
  isDropTarget,
  onOpenTicket,
  onLoadDeferredColumn,
  onDragStartTicket,
  onDragEndTicket,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: SupportTicketsKanbanColumnProps) {
  const visual = getKanbanColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.totalCount} ticket`}
      visual={visual}
      density="compact"
      widthClassName="w-73"
      testId={`kanban-column-${ticketsStageTestId(column.id)}`}
      isDropTarget={isDropTarget}
      emptyMessage="Nessun ticket"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.deferred && !column.isLoaded ? (
        <KanbanDeferredColumnAction
          label={column.deferredActionLabel ?? `Mostra ${column.label}`}
          onClick={() => {
            onLoadDeferredColumn(column.id)
          }}
        />
      ) : null}
      {column.cards.map((card) => (
        <SupportTicketsCard
          key={card.id}
          card={card}
          cardTestId={`${boardTestIdPrefix}-card-${card.id}`}
          dragging={draggingTicketId === card.id}
          onOpen={() => onOpenTicket(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartTicket(card.id)
          }}
          onDragEnd={onDragEndTicket}
        />
      ))}
    </KanbanColumnShell>
  )
}
