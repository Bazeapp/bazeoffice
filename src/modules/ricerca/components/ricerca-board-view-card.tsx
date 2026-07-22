import * as React from "react"

import { cn } from "@/lib/utils"

import {
  RicercaActiveSearchCard,
  type RicercaCardRecruiter,
} from "./ricerca-active-search-card"
import type { RicercaBoardCardData } from "../types"

export type RicercaBoardViewCardProps = {
  data: RicercaBoardCardData
  onClick: () => void
  dragging: boolean
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  recruitersById: Map<string, RicercaCardRecruiter>
}

export function RicercaBoardViewCard({
  data,
  onClick,
  dragging,
  onDragStart,
  onDragEnd,
  recruitersById,
}: RicercaBoardViewCardProps) {
  return (
    <div
      draggable
      data-testid={`ricerca-card-${data.id}`}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
      onClick={onClick}
    >
      <RicercaActiveSearchCard
        data={data}
        recruiter={
          data.operatorId ? (recruitersById.get(data.operatorId) ?? null) : null
        }
      />
    </div>
  )
}
