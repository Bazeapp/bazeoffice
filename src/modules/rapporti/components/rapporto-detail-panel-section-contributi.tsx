import { CalendarDaysIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { formatItalianCurrency, formatItalianDateTimeOr } from "@/lib/format-utils"
import type { ContributoInpsRecord } from "@/types"

import {
  formatRapportoDetailDate,
  getContributoTitle,
  resolveContributoStage,
} from "../lib/rapporto-detail-panel.utils"
import {
  RapportoDetailPanelEmptyLinkedState,
  RapportoDetailPanelListRowCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelLinkedRowsSkeleton } from "./rapporto-detail-panel-states"

type RapportoDetailPanelSectionContributiProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  contributi: ContributoInpsRecord[]
  onSelectContributo: (id: string) => void
}

export function RapportoDetailPanelSectionContributi({
  sectionRef,
  loadingRelated,
  contributi,
  onSelectContributo,
}: RapportoDetailPanelSectionContributiProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <DetailSectionBlock
        title="Contributi INPS"
        icon={<CalendarDaysIcon className="size-5" />}
        contentClassName="space-y-3 pt-2"
      >
        {loadingRelated ? (
          <RapportoDetailPanelLinkedRowsSkeleton />
        ) : contributi.length > 0 ? (
          contributi.map((contributo) => (
            <RapportoDetailPanelListRowCard
              key={contributo.id}
              title={getContributoTitle(contributo)}
              subtitle={[
                contributo.data_invio_famiglia
                  ? `Inviato il ${formatRapportoDetailDate(contributo.data_invio_famiglia)}`
                  : contributo.data_ora_creazione
                    ? `Creato il ${formatItalianDateTimeOr(contributo.data_ora_creazione, "-")}`
                    : null,
                contributo.valore_pagopa != null
                  ? `PagoPA ${formatItalianCurrency(contributo.valore_pagopa)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              rightBadge={resolveContributoStage(contributo.stato_contributi_inps)}
              trailing={
                <span className="text-xs font-semibold whitespace-nowrap">
                  {typeof contributo.importo_contributi_inps === "number"
                    ? formatItalianCurrency(contributo.importo_contributi_inps)
                    : "-"}
                </span>
              }
              onClick={() => onSelectContributo(contributo.id)}
            />
          ))
        ) : (
          <RapportoDetailPanelEmptyLinkedState
            icon={<CalendarDaysIcon className="size-8" />}
            label="Nessun contributo INPS collegato"
          />
        )}
      </DetailSectionBlock>
    </div>
  )
}
