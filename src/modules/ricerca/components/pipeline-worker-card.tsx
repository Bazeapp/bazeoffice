import { CalendarDaysIcon } from "lucide-react"

import {
  LavoratoreCard,
  type WorkerOtherSelectionSummaryItem,
} from "@/modules/lavoratori/components/lavoratore-card"
import type { RicercaWorkerSelectionCard } from "../types"
import { getCardOperationalTiming } from "../lib/worker-pipeline-view-utils"

type PipelineWorkerCardProps = {
  card: RicercaWorkerSelectionCard
  onOpenWorker: (card: RicercaWorkerSelectionCard) => void
  onLoadOtherActiveSelectionDetails: (
    workerId: string
  ) => Promise<WorkerOtherSelectionSummaryItem[]>
}

export function PipelineWorkerCard({
  card,
  onOpenWorker,
  onLoadOtherActiveSelectionDetails,
}: PipelineWorkerCardProps) {
  const timing = getCardOperationalTiming(card)

  return (
    <LavoratoreCard
      worker={card.worker}
      isActive={false}
      onClick={() => onOpenWorker(card)}
      onLoadOtherActiveSelectionDetails={onLoadOtherActiveSelectionDetails}
      bottomSlot={
        timing ? (
          <div className="text-muted-foreground flex min-w-0 items-start gap-1.5 text-2xs leading-snug">
            <CalendarDaysIcon className="size-3 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{timing.label}</span>
              {timing.relativeLabel ? (
                <span className="block">{timing.relativeLabel}</span>
              ) : null}
            </span>
          </div>
        ) : null
      }
    />
  )
}
