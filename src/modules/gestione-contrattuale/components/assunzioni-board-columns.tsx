import { KanbanColumnSkeleton } from "@/components/shared-next/kanban"
import type { AssunzioniBoardCardData, AssunzioniBoardColumnData, AssunzioniBoardDragHandlers } from "../types"
import { AssunzioniBoardColumn } from "./assunzioni-board-column"

function AssunzioniBoardSkeletonColumn() {
  return <KanbanColumnSkeleton showBadgeRow />
}

export function AssunzioniBoardColumns({
  loading,
  columns,
  drag,
  onCardClick,
  onLoadDeferredColumn,
}: {
  loading: boolean
  columns: AssunzioniBoardColumnData[]
  drag: AssunzioniBoardDragHandlers
  onCardClick: (card: AssunzioniBoardCardData) => void
  onLoadDeferredColumn: (columnId: string) => void
}) {
  if (loading) {
    return Array.from({ length: 4 }).map((_, index) => (
      <AssunzioniBoardSkeletonColumn key={index} />
    ))
  }

  return columns.map((column) => (
    <AssunzioniBoardColumn
      key={column.id}
      column={column}
      drag={drag}
      onCardClick={onCardClick}
      onLoadDeferredColumn={onLoadDeferredColumn}
    />
  ))
}
