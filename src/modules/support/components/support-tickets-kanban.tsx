import { KanbanColumnSkeleton } from "@/components/shared-next/kanban"

import type { SupportTicketsColumnData } from "../types"
import { SupportTicketsKanbanColumn } from "./support-tickets-kanban-column"

export type SupportTicketsKanbanProps = {
  loading: boolean
  columns: SupportTicketsColumnData[]
  boardTestIdPrefix: string
  draggingTicketId: string | null
  dropTargetColumnId: string | null
  onOpenTicket: (ticketId: string) => void
  onLoadDeferredColumn: (columnId: string) => void
  onDragStartTicket: (ticketId: string) => void
  onDragEndTicket: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (columnId: string) => (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, ticketId: string | null) => void
}

function SupportTicketsKanbanSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-73" density="compact" showBadgeRow />
}

export function SupportTicketsKanban({
  loading,
  columns,
  boardTestIdPrefix,
  draggingTicketId,
  dropTargetColumnId,
  onOpenTicket,
  onLoadDeferredColumn,
  onDragStartTicket,
  onDragEndTicket,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: SupportTicketsKanbanProps) {
  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
      <div className="flex h-full min-h-0 min-w-max gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <SupportTicketsKanbanSkeletonColumn key={index} />
            ))
          : columns.map((column) => (
              <SupportTicketsKanbanColumn
                key={column.id}
                column={column}
                boardTestIdPrefix={boardTestIdPrefix}
                draggingTicketId={draggingTicketId}
                isDropTarget={dropTargetColumnId === column.id}
                onOpenTicket={onOpenTicket}
                onLoadDeferredColumn={onLoadDeferredColumn}
                onDragStartTicket={onDragStartTicket}
                onDragEndTicket={onDragEndTicket}
                onDragEnterColumn={onDragEnterColumn}
                onDragOverColumn={onDragOverColumn}
                onDragLeaveColumn={onDragLeaveColumn(column.id)}
                onDropToColumn={onDropToColumn}
              />
            ))}
      </div>
    </div>
  )
}
