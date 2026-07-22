import { KanbanColumnSkeleton } from "@/components/shared-next/kanban"
import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniBoardDragHandlers,
} from "../types"
import { VariazioniBoardColumn } from "./variazioni-board-column"

function VariazioniBoardSkeletonColumn() {
  return <KanbanColumnSkeleton />
}

export function VariazioniBoardColumns({
  loading,
  columns,
  drag,
  onCardClick,
}: {
  loading: boolean
  columns: VariazioniBoardColumnData[]
  drag: VariazioniBoardDragHandlers
  onCardClick: (card: VariazioniBoardCardData) => void
}) {
  if (loading) {
    return Array.from({ length: 3 }).map((_, index) => (
      <VariazioniBoardSkeletonColumn key={index} />
    ))
  }

  return columns.map((column) => (
    <VariazioniBoardColumn
      key={column.id}
      column={column}
      drag={drag}
      onCardClick={onCardClick}
    />
  ))
}
