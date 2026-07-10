import type * as React from "react"
import { Clock3Icon, PaperclipIcon } from "lucide-react"

import { RecordCard } from "@/components/shared-next/record-card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { resolveSupportTicketTag, resolveSupportTicketUrgency } from "../lib"
import type { SupportTicketBoardCardData } from "../types"

export type SupportTicketsCardProps = {
  card: SupportTicketBoardCardData
  cardTestId: string
  dragging: boolean
  onOpen: () => void
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}

export function SupportTicketsCard({
  card,
  cardTestId,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: SupportTicketsCardProps) {
  const tagConfig = resolveSupportTicketTag(card.tag)
  const urgencyConfig = resolveSupportTicketUrgency(card.urgenza)
  const TagIcon = tagConfig.icon

  return (
    <div
      draggable
      data-testid={cardTestId}
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <RecordCard>
        <RecordCard.Header title={card.causale} subtitle={card.nomeCompleto} />
        <RecordCard.Body>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={tagConfig.colorClassName}>
              <TagIcon className="size-3" />
              {tagConfig.label}
            </Badge>
            <Badge className={urgencyConfig.badgeClassName}>{urgencyConfig.label}</Badge>
          </div>

          <div className="flex items-center justify-between gap-3 text-2xs">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <Clock3Icon className="size-3.5" />
              <span>{card.dataAperturaLabel}</span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              {card.attachmentCount > 0 ? (
                <span className="flex items-center gap-1">
                  <PaperclipIcon className="size-3.5" />
                  {card.attachmentCount}
                </span>
              ) : null}
              <span className="font-medium text-foreground">
                {card.assegnatario.split(" ")[0]}
              </span>
            </div>
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  )
}
