import type { DragEvent } from "react"

import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { chiusureStageTestId } from "../lib/chiusure-board-constants"
import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  ChiusureBoardDragHandlers,
} from "../types"
import { ChiusureBoardCard } from "./chiusure-board-card"

export function ChiusureBoardColumn({
  column,
  drag,
  onCardClick,
}: {
  column: ChiusureBoardColumnData
  drag: ChiusureBoardDragHandlers
  onCardClick: (card: ChiusureBoardCardData) => void
}) {
  const visual = getKanbanColumnVisual(column.color)

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
    drag.onDragLeaveColumn(column.id, event)
  }

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "chiusura" : "chiusure"}`}
      visual={visual}
      testId={chiusureStageTestId(column.id)}
      isDropTarget={drag.dropTargetColumnId === column.id}
      emptyMessage="Nessuna chiusura"
      onDragEnter={drag.onDragEnterColumn}
      onDragOver={drag.onDragOverColumn}
      onDragLeave={handleDragLeave}
      onDrop={drag.onDropToColumn}
    >
      {column.cards.map((card) => (
        <ChiusureBoardCard
          key={card.id}
          card={card}
          dragging={drag.draggingRecordId === card.id}
          onClick={() => onCardClick(card)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            drag.onDragStartCard(card.id)
          }}
          onDragEnd={drag.onDragEndCard}
        />
      ))}
    </KanbanColumnShell>
  )
}
