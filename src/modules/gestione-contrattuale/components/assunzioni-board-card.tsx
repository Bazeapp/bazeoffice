import type { DragEvent } from "react"
import { CalendarIcon, UserCheckIcon, UsersIcon } from "lucide-react"

import { RecordCard } from "@/components/shared-next/record-card"
import { Badge } from "@/components/ui/badge"
import { formatItalianDate } from "@/lib/value-utils"
import { cn } from "@/lib/utils"
import type { AssunzioniBoardCardData } from "../types"

export function AssunzioniBoardCard({
  card,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  card: AssunzioniBoardCardData
  dragging: boolean
  onClick: () => void
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  const dateLabel = card.rapporto?.data_inizio_rapporto
    ? formatItalianDate(card.rapporto.data_inizio_rapporto)
    : card.deadline

  return (
    <div
      draggable
      data-testid={`assunzioni-card-${card.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <RecordCard>
        <RecordCard.Header
          title={`${card.nomeFamiglia} – ${card.nomeLavoratore}`}
        />
        <RecordCard.Body>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className={cn(
                card.assunzione
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-red-200 bg-red-100 text-red-700",
              )}
            >
              <UsersIcon />
              Famiglia
            </Badge>
            <Badge
              className={cn(
                card.lavoratoreAssunzione
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-red-200 bg-red-100 text-red-700",
              )}
            >
              <UserCheckIcon />
              Lavoratore
            </Badge>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 border-t pt-2 text-xs">
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}
