import { KanbanColumnSkeleton } from "@/components/shared-next/kanban"

import type { RiattivazioneStageId, RiattivazioniBoardColumnData } from "../types"
import { RiattivazioniBoardColumn } from "./riattivazioni-board-column"

export type RiattivazioniBoardKanbanProps = {
  loading: boolean
  columns: RiattivazioniBoardColumnData[]
  draggingRecordId: string | null
  dropTargetColumnId: RiattivazioneStageId | null
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: RiattivazioneStageId) => void
  onDragOverColumn: (columnId: RiattivazioneStageId) => void
  onDragLeaveColumn: (columnId: RiattivazioneStageId) => (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: RiattivazioneStageId, recordId: string | null) => void
}

export function RiattivazioniBoardKanban({
  loading,
  columns,
  draggingRecordId,
  dropTargetColumnId,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: RiattivazioniBoardKanbanProps) {
  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
      <div className="flex h-full min-h-0 min-w-max gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <KanbanColumnSkeleton key={index} />)
          : columns.map((column) => (
              <RiattivazioniBoardColumn
                key={column.id}
                column={column}
                draggingRecordId={draggingRecordId}
                isDropTarget={dropTargetColumnId === column.id}
                onOpenCard={onOpenCard}
                onDragStartCard={onDragStartCard}
                onDragEndCard={onDragEndCard}
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
