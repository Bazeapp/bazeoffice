import type * as React from "react"

import {
  CalendarClockIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Clock3Icon,
  MailIcon,
  PhoneCallIcon,
  XCircleIcon,
} from "lucide-react"

import { RecordCard } from "@/components/shared-next/record-card"
import { Badge } from "@/components/ui/badge"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { formatItalianDate } from "@/lib/value-utils"
import { cn } from "@/lib/utils"

import { getStageColor } from "../lib/riattivazioni-board.utils"
import type { RiattivazioneStageId, RiattivazioniBoardCardData } from "../types"

export type RiattivazioniBoardCardProps = {
  card: RiattivazioniBoardCardData
  dragging: boolean
  onOpen: () => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}

function RiattivazioniStageIcon({ stageId }: { stageId: RiattivazioneStageId }) {
  switch (stageId) {
    case "da sentire":
      return <PhoneCallIcon className="size-3.5" />
    case "in attesa":
      return <Clock3Icon className="size-3.5" />
    case "riattivato":
      return <CheckCircle2Icon className="size-3.5" />
    case "non riattiva":
      return <XCircleIcon className="size-3.5" />
  }
}

export function RiattivazioniBoardCard({
  card,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: RiattivazioniBoardCardProps) {
  return (
    <div
      draggable
      data-testid={`riattivazioni-card-${card.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn("cursor-grab transition-opacity active:cursor-grabbing", dragging && "opacity-40")}
    >
      <RecordCard>
        <RecordCard.Header
          title={card.famigliaLabel}
          subtitle={card.lavoratoreLabel}
          rightSlot={
            <Badge
              variant="outline"
              className={cn(
                "flex size-6 items-center justify-center rounded-full p-0",
                getLookupBadgeSoftClassName(getStageColor(card.stage)),
              )}
              aria-label={card.stage}
              title={card.stage}
            >
              <RiattivazioniStageIcon stageId={card.stage} />
            </Badge>
          }
        />
        <RecordCard.Body>
          <div>
            <Badge variant="outline" className="rounded-full px-2.5 text-2xs font-medium">
              {card.tipoLabel}
            </Badge>
          </div>
          <div className="space-y-1.5 border-t pt-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 truncate">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.email}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataFineRapporto}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <CalendarClockIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {formatItalianDate(card.record.data_per_riattivazione)}
              </span>
            </p>
            {card.motivazione ? <p className="line-clamp-2">{card.motivazione}</p> : null}
            {card.record.sconto_proposto_riattivazione ? (
              <p className="truncate">Sconto {card.record.sconto_proposto_riattivazione}</p>
            ) : null}
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}
