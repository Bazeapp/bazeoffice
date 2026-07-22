import { KanbanColumnShell } from "@/components/shared-next/kanban"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"

import { riattivazioniStageTestId } from "../lib/riattivazioni-board.utils"
import type { RiattivazioneStageId, RiattivazioniBoardColumnData } from "../types"
import { RiattivazioniBoardCard } from "./riattivazioni-board-card"

export type RiattivazioniBoardColumnProps = {
  column: RiattivazioniBoardColumnData
  draggingRecordId: string | null
  isDropTarget: boolean
  onOpenCard: (recordId: string) => void
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: RiattivazioneStageId) => void
  onDragOverColumn: (columnId: RiattivazioneStageId) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: RiattivazioneStageId, recordId: string | null) => void
}

export function RiattivazioniBoardColumn({
  column,
  draggingRecordId,
  isDropTarget,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: RiattivazioniBoardColumnProps) {
  const visual = getKanbanColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${column.cards.length === 1 ? "chiusura" : "chiusure"}`}
      visual={visual}
      testId={riattivazioniStageTestId(column.id)}
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna chiusura"
      onDragEnter={(columnId) => onDragEnterColumn(columnId as RiattivazioneStageId)}
      onDragOver={(columnId) => onDragOverColumn(columnId as RiattivazioneStageId)}
      onDragLeave={onDragLeaveColumn}
      onDrop={(columnId, payload) => onDropToColumn(columnId as RiattivazioneStageId, payload)}
    >
      {column.cards.map((card) => (
        <RiattivazioniBoardCard
          key={card.id}
          card={card}
          dragging={draggingRecordId === card.id}
          onOpen={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
        />
      ))}
    </KanbanColumnShell>
  )
}
