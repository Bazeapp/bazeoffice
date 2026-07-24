import { CalendarDaysIcon, ClockIcon } from "lucide-react"

import { CardMetaRow } from "@/components/shared-next/card-meta-row"
import { RecordCard } from "@/components/shared-next/record-card"
import { Badge } from "@/components/ui/badge"
import { getTagClassName } from "@/lib/lookup-utils"
import { getRapportoStatusColor } from "@/modules/rapporti/lib"
import { cn } from "@/lib/utils"

import {
  formatCompactDate,
  type RapportiListItem,
} from "../lib/list-panel-utils"
import {
  getRapportiListStatusBadgeLabel,
  getRapportiListStatusColor,
} from "../lib/rapporti-list-panel.mappers"

export type RapportiListPanelCardProps = {
  rapporto: RapportiListItem
  selected: boolean
  onSelect: () => void
  lookupColorsByDomain: Map<string, string>
}

export function RapportiListPanelCard({
  rapporto,
  selected,
  onSelect,
  lookupColorsByDomain,
}: RapportiListPanelCardProps) {
  return (
    <RecordCard
      data-testid={`rapporti-card-${rapporto.id}`}
      onClick={onSelect}
      selected={selected}
    >
      <RecordCard.Header
        title={<span className="text-sm font-semibold">{rapporto.famigliaLabel}</span>}
        subtitle={rapporto.lavoratoreLabel}
        rightSlot={
          <Badge
            variant="outline"
            className={cn(
              "h-5 shrink-0 px-2 text-2xs font-medium",
              getTagClassName(
                getRapportiListStatusColor(
                  lookupColorsByDomain,
                  "rapporti_lavorativi.stato_rapporto",
                  rapporto.stato_rapporto,
                ) ?? getRapportoStatusColor(rapporto.stato_rapporto),
              ),
            )}
          >
            {getRapportiListStatusBadgeLabel(rapporto.stato_rapporto)}
          </Badge>
        }
      />
      <RecordCard.Body className="gap-1 text-2xs">
        <CardMetaRow icon={<ClockIcon className="size-3 shrink-0" />}>
          <span>{rapporto.ore_a_settimana ?? 0}h/sett</span>
          {rapporto.distribuzione_ore_settimana ? (
            <>
              <span className="text-muted-foreground/60 mx-1">•</span>
              <span className="truncate">{rapporto.distribuzione_ore_settimana}</span>
            </>
          ) : null}
        </CardMetaRow>
        <CardMetaRow icon={<CalendarDaysIcon className="size-3 shrink-0" />}>
          <span>{formatCompactDate(rapporto.data_inizio_rapporto)}</span>
        </CardMetaRow>
      </RecordCard.Body>
    </RecordCard>
  )
}
