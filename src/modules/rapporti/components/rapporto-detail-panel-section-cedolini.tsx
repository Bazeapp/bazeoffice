import { CalendarDaysIcon, CreditCardIcon, FileTextIcon, StarIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { CedolinoListRow } from "../lib/rapporto-detail-panel.mappers"
import {
  RapportoDetailPanelEmptyLinkedState,
  RapportoDetailPanelListRowCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelLinkedRowsSkeleton } from "./rapporto-detail-panel-states"

type RapportoDetailPanelSectionCedoliniProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  rows: CedolinoListRow[]
  presenzeUrl: string | null
  onSelectCedolino: (id: string) => void
}

export function RapportoDetailPanelSectionCedolini({
  sectionRef,
  loadingRelated,
  rows,
  presenzeUrl,
  onSelectCedolino,
}: RapportoDetailPanelSectionCedoliniProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <DetailSectionBlock
        title="Cedolini"
        icon={<FileTextIcon className="size-5" />}
        contentClassName="space-y-3 pt-2"
        action={
          presenzeUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={presenzeUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Apri il calendario presenze della famiglia"
              >
                <CalendarDaysIcon className="size-4" />
                Calendario presenze
              </a>
            </Button>
          ) : undefined
        }
      >
        {loadingRelated ? (
          <RapportoDetailPanelLinkedRowsSkeleton />
        ) : rows.length > 0 ? (
          rows.map((row) => (
            <RapportoDetailPanelListRowCard
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              rightBadge={row.rightBadge}
              trailing={
                <div className="flex items-center gap-2">
                  {row.ratingValue > 0 ? (
                    <div
                      className="flex items-center gap-0.5"
                      title={row.feedbackText ?? `Rating famiglia: ${row.ratingValue}/5`}
                      aria-label={`Rating famiglia ${row.ratingValue} su 5`}
                    >
                      {Array.from({ length: 5 }).map((_, index) => (
                        <StarIcon
                          key={index}
                          className={cn(
                            "size-3.5",
                            index < row.ratingValue
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                  ) : null}
                  <span className="text-xs font-semibold whitespace-nowrap">{row.importoLabel}</span>
                </div>
              }
              onClick={() => onSelectCedolino(row.id)}
            />
          ))
        ) : (
          <RapportoDetailPanelEmptyLinkedState
            icon={<CreditCardIcon className="size-8" />}
            label="Nessun cedolino collegato"
          />
        )}
      </DetailSectionBlock>
    </div>
  )
}
