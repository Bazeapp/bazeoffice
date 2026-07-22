import { KanbanColumnSkeleton } from "@/components/shared-next/kanban"
import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  ChiusureBoardDragHandlers,
} from "../types"
import { ChiusureBoardColumn } from "./chiusure-board-column"

function ChiusureBoardSkeletonColumn() {
  return <KanbanColumnSkeleton />
}

export function ChiusureBoardColumns({
  loading,
  columns,
  drag,
  onCardClick,
}: {
  loading: boolean
  columns: ChiusureBoardColumnData[]
  drag: ChiusureBoardDragHandlers
  onCardClick: (card: ChiusureBoardCardData) => void
}) {
  if (loading) {
    return Array.from({ length: 4 }).map((_, index) => (
      <ChiusureBoardSkeletonColumn key={index} />
    ))
  }

  return columns.map((column) => (
    <ChiusureBoardColumn
      key={column.id}
      column={column}
      drag={drag}
      onCardClick={onCardClick}
    />
  ))
}
