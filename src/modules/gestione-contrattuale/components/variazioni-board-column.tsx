import type { DragEvent } from "react"

import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { variazioniStageTestId } from "../lib/variazioni-board-constants"
import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniBoardDragHandlers,
} from "../types"
import { VariazioniBoardCard } from "./variazioni-board-card"

export function VariazioniBoardColumn({
  column,
  drag,
  onCardClick,
}: {
  column: VariazioniBoardColumnData
  drag: VariazioniBoardDragHandlers
  onCardClick: (card: VariazioniBoardCardData) => void
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
      testId={variazioniStageTestId(column.id)}
      title={column.label}
      countLabel={`${column.cards.length} ${
        column.cards.length === 1 ? "variazione" : "variazioni"
      }`}
      visual={visual}
      isDropTarget={drag.dropTargetColumnId === column.id}
      emptyMessage="Nessuna variazione"
      onDragEnter={drag.onDragEnterColumn}
      onDragOver={drag.onDragOverColumn}
      onDragLeave={handleDragLeave}
      onDrop={drag.onDropToColumn}
    >
      {column.cards.map((card) => (
        <VariazioniBoardCard
          key={card.id}
          card={card}
          dragging={drag.draggingRecordId === card.id}
          onOpen={() => onCardClick(card)}
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
