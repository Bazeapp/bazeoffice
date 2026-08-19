import * as React from "react"
import { AlarmClockIcon, CalendarIcon, PhoneCallIcon, PhoneIcon } from "lucide-react"

import { LavoratoreCard } from "@/modules/lavoratori/components/lavoratore-card"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared-next/kanban"
import { matchesSearchQuery } from "@/lib/search-utils"
import { getKanbanColumnVisual } from "@/lib/kanban-column-utils"
import { cn } from "@/lib/utils"
import {
  getCheckinDaysLabel,
  getCheckinDaysRemaining,
  getCheckinUrgency,
  getTrialElapsedDays,
  type CheckinUrgency,
} from "../lib"
import { isProvaCheckinColumn } from "../lib/prove-colloqui-data.utils"
import {
  buildProvaWorkerCardItem,
  formatProvaDate,
} from "../lib/prove-colloqui-view.utils"
import type { ProvaCardData, ProvaColumnData } from "../types"

const CHECKIN_URGENCY_CLASS: Record<CheckinUrgency, string> = {
  overdue: "font-medium text-red-600",
  urgent: "font-medium text-red-600",
  soon: "font-medium text-amber-600",
  normal: "",
}

export type ProveColloquiKanbanProps = {
  columns: ProvaColumnData[]
  searchQuery: string
  loading: boolean
  onCardClick: (card: ProvaCardData) => void
}

function ProvaCard({
  card,
  showCheckinDate,
  onClick,
}: {
  card: ProvaCardData
  showCheckinDate: boolean
  onClick: () => void
}) {
  const elapsedDays = getTrialElapsedDays(card.rapporto.data_inizio_rapporto)
  const elapsedDaysLabel =
    elapsedDays === null
      ? "-"
      : `${elapsedDays} ${elapsedDays === 1 ? "giorno" : "giorni"}`
  const checkinDate = card.rapporto.prova_data_checkin
  const checkinDaysRemaining = getCheckinDaysRemaining(checkinDate)
  // Senza data di check-in la card resta sulla data di inizio rapporto.
  const useCheckin = showCheckinDate && checkinDaysRemaining !== null
  const worker = React.useMemo(() => buildProvaWorkerCardItem(card), [card])

  return (
    <LavoratoreCard
      worker={worker}
      isActive={false}
      onClick={onClick}
      cardTestId={`prove-colloqui-card-${card.id}`}
      subtitle={<span>{card.famigliaLabel}</span>}
      rightSlot={null}
      showQualificationStatus={false}
      bodySlot={
        <>
          <div className="border-t" />
          <div className="space-y-1.5 text-2xs text-muted-foreground">
            {useCheckin ? (
              <p
                className={cn(
                  "flex min-w-0 items-center gap-1.5",
                  CHECKIN_URGENCY_CLASS[getCheckinUrgency(checkinDaysRemaining)],
                )}
                data-testid="prova-card-checkin"
              >
                <AlarmClockIcon className="size-3.5 shrink-0" />
                <span className="truncate">{formatProvaDate(checkinDate)}</span>
                <span className="shrink-0 opacity-60">•</span>
                <span className="shrink-0">{getCheckinDaysLabel(checkinDaysRemaining)}</span>
              </p>
            ) : (
              <p className="flex min-w-0 items-center gap-1.5">
                <CalendarIcon className="size-3.5 shrink-0" />
                <span className="truncate">{formatProvaDate(card.rapporto.data_inizio_rapporto)}</span>
                <span className="shrink-0 text-muted-foreground/60">•</span>
                <span className="shrink-0">{elapsedDaysLabel}</span>
              </p>
            )}
            <p className="flex min-w-0 items-center gap-1.5">
              <PhoneIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {card.famiglia?.telefono ?? "Telefono famiglia non disponibile"}
              </span>
            </p>
            <p className="flex min-w-0 items-center gap-1.5">
              <PhoneCallIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {card.lavoratore?.telefono ?? "Telefono lavoratore non disponibile"}
              </span>
            </p>
          </div>
        </>
      }
    />
  )
}

export function ProveColloquiKanban({
  columns,
  searchQuery,
  loading,
  onCardClick,
}: ProveColloquiKanbanProps) {
  const filteredColumns = React.useMemo(
    () =>
      columns.map((column) => {
        const cards = column.cards.filter((card) =>
          matchesSearchQuery(
            [
              card.title,
              card.famigliaLabel,
              card.lavoratoreLabel,
              card.famiglia?.email,
              card.lavoratore?.email,
              card.rapporto.prova_stato_cs,
            ],
            searchQuery,
          ),
        )
        return { ...column, cards, totalCount: cards.length }
      }),
    [columns, searchQuery],
  )
  const totalCards = filteredColumns.reduce((sum, column) => sum + column.cards.length, 0)

  if (!loading && totalCards === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed bg-muted/10 text-sm text-muted-foreground">
        Nessun rapporto in prova al momento
      </div>
    )
  }

  return (
    <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-gutter:stable]">
      <div className="flex h-full min-w-max gap-4 px-6">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <KanbanColumnSkeleton key={index} widthClassName="w-80" cardCount={3} />
            ))
          : filteredColumns.map((column) => (
              <KanbanColumnShell
                key={column.id}
                columnId={column.id}
                title={column.label}
                countLabel={`${column.totalCount} ${column.totalCount === 1 ? "prova" : "prove"}`}
                visual={getKanbanColumnVisual(column.color)}
                widthClassName="w-80"
                emptyMessage="Nessuna prova"
                testId={`kanban-column-${column.label.replace(/\s+/g, "_").replace(/—/g, "-")}`}
              >
                {column.cards.map((card) => (
                  <ProvaCard
                    key={card.id}
                    card={card}
                    showCheckinDate={isProvaCheckinColumn(column)}
                    onClick={() => onCardClick(card)}
                  />
                ))}
              </KanbanColumnShell>
            ))}
      </div>
    </div>
  )
}
