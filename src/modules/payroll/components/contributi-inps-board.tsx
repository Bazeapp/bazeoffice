import * as React from "react"

import type { ContributiColumnData } from "../types"
import { ContributiInpsBoardColumn } from "./contributi-inps-board-column"
import { ContributiInpsBoardSkeletonColumn } from "./contributi-inps-board-skeleton"

export type ContributiInpsBoardProps = {
  loading: boolean
  columns: ContributiColumnData[]
  draggingRecordId: string | null
  dropTargetColumnId: string | null
  onOpenCard: (cardId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>, columnId: string) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}

export function ContributiInpsBoard({
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
}: ContributiInpsBoardProps) {
  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
      <div className="flex h-full min-h-0 min-w-max gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <ContributiInpsBoardSkeletonColumn key={index} />)
          : columns.map((column) => (
              <ContributiInpsBoardColumn
                key={column.id}
                column={column}
                draggingRecordId={draggingRecordId}
                isDropTarget={dropTargetColumnId === column.id}
                onOpenCard={onOpenCard}
                onDragStartCard={onDragStartCard}
                onDragEndCard={onDragEndCard}
                onDragEnterColumn={onDragEnterColumn}
                onDragOverColumn={onDragOverColumn}
                onDragLeaveColumn={(event) => onDragLeaveColumn(event, column.id)}
                onDropToColumn={onDropToColumn}
              />
            ))}
      </div>
    </div>
  )
}
