import {
  CalendarIcon,
  MailIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react"
import type { DragEvent } from "react"

import { RecordCard } from "@/components/shared-next/record-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getLicenziamentoVariant, getLookupBadgeClasses } from "../lib/chiusure-board-visual"
import type { ChiusureBoardCardData } from "../types"

export function ChiusureBoardCard({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  card: ChiusureBoardCardData
  dragging: boolean
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onClick: () => void
}) {
  return (
    <div
      draggable
      data-testid={`chiusure-card-${card.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <RecordCard>
        <RecordCard.Header title={card.nomeCompleto} />
        <RecordCard.Body>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              className={cn(
                card.tipoColor
                  ? getLookupBadgeClasses(card.tipoColor)
                  : getLicenziamentoVariant(card.record.tipo_licenziamento),
              )}
            >
              {card.tipoLabel}
            </Badge>
            <Badge
              className={cn(
                card.hasAssunzioneDatore
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-red-200 bg-red-100 text-red-700",
              )}
            >
              <UsersIcon />
              Famiglia
            </Badge>
            <Badge
              className={cn(
                card.hasAssunzioneLavoratore
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-red-200 bg-red-100 text-red-700",
              )}
            >
              <UserCheckIcon />
              Lavoratore
            </Badge>
          </div>
          <div className="text-muted-foreground space-y-1.5 border-t pt-2 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.email}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataFineRapporto}</span>
            </p>
            {card.motivazione ? <p className="line-clamp-2">{card.motivazione}</p> : null}
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}
