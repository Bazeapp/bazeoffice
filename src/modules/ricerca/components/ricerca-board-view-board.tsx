import type { RicercaBoardViewDragHandlers } from "../hooks/use-ricerca-board-view"
import { RICERCA_BOARD_VIEW_SKELETON_COLUMN_COUNT } from "../lib/ricerca-board-view.constants"
import type { RicercaCardRecruiter } from "./ricerca-active-search-card"
import { RicercaBoardViewColumn } from "./ricerca-board-view-column"
import { RicercaBoardViewSkeleton } from "./ricerca-board-view-skeleton"
import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"

export type RicercaBoardViewBoardProps = {
  loading: boolean
  columns: RicercaBoardColumnData[]
  recruitersById: Map<string, RicercaCardRecruiter>
  draggingProcessId: string | null
  dropTargetColumnId: string | null
  drag: RicercaBoardViewDragHandlers
  onCardClick: (card: RicercaBoardCardData) => void
  onLoadDeferredColumn: (columnId: string) => void
}

export function RicercaBoardViewBoard({
  loading,
  columns,
  recruitersById,
  draggingProcessId,
  dropTargetColumnId,
  drag,
  onCardClick,
  onLoadDeferredColumn,
}: RicercaBoardViewBoardProps) {
  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-gutter:stable]">
      <div className="flex h-full min-h-0 min-w-max gap-4 px-6">
        {loading
          ? Array.from({ length: RICERCA_BOARD_VIEW_SKELETON_COLUMN_COUNT }).map(
              (_, index) => <RicercaBoardViewSkeleton key={index} />,
            )
          : columns.map((column) => (
              <RicercaBoardViewColumn
                key={column.id}
                column={column}
                recruitersById={recruitersById}
                isDropTarget={dropTargetColumnId === column.id}
                draggingProcessId={draggingProcessId}
                drag={drag}
                onCardClick={onCardClick}
                onLoadDeferredColumn={onLoadDeferredColumn}
              />
            ))}
      </div>
    </div>
  )
}
