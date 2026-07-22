import {
  KanbanColumnShell,
  KanbanDeferredColumnAction,
} from "@/components/shared-next/kanban"

import { getDeferredColumnActionLabel } from "../lib/ricerca-board-view.mappers"
import { getRicercaColumnVisual } from "../lib/board-column-utils"
import type { RicercaBoardViewDragHandlers } from "../hooks/use-ricerca-board-view"
import type { RicercaCardRecruiter } from "./ricerca-active-search-card"
import { RicercaBoardViewCard } from "./ricerca-board-view-card"
import type { RicercaBoardCardData, RicercaBoardColumnData } from "../types"

export type RicercaBoardViewColumnProps = {
  column: RicercaBoardColumnData
  isDropTarget: boolean
  draggingProcessId: string | null
  drag: RicercaBoardViewDragHandlers
  onCardClick: (card: RicercaBoardCardData) => void
  onLoadDeferredColumn: (columnId: string) => void
  recruitersById: Map<string, RicercaCardRecruiter>
}

export function RicercaBoardViewColumn({
  column,
  isDropTarget,
  draggingProcessId,
  drag,
  onCardClick,
  onLoadDeferredColumn,
  recruitersById,
}: RicercaBoardViewColumnProps) {
  const visual = getRicercaColumnVisual(column.id, column.label, column.color)
  const count = column.totalCount
  const deferredActionLabel = getDeferredColumnActionLabel(column)

  return (
    <KanbanColumnShell
      columnId={column.id}
      testId={`kanban-column-${column.id}`}
      title={column.label}
      countLabel={`${count} ${count === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      widthClassName="w-75"
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna ricerca"
      onDragEnter={drag.onDragEnterColumn}
      onDragOver={drag.onDragOverColumn}
      onDragLeave={drag.onDragLeaveColumn}
      onDrop={drag.onDropToColumn}
    >
      {column.deferred && !column.isLoaded ? (
        <KanbanDeferredColumnAction
          label={deferredActionLabel}
          isLoading={column.isLoading}
          onClick={() => {
            onLoadDeferredColumn(column.id)
          }}
        />
      ) : null}
      {column.cards.map((card) => (
        <RicercaBoardViewCard
          key={card.id}
          data={card}
          recruitersById={recruitersById}
          dragging={draggingProcessId === card.id}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            drag.onDragStartCard(card.id)
          }}
          onDragEnd={drag.onDragEndCard}
          onClick={() => {
            onCardClick(card)
          }}
        />
      ))}
    </KanbanColumnShell>
  )
}
