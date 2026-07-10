import { RefreshCwIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import type { VariazioneContrattualeRecord } from "@/types"

import { formatRapportoDetailDate } from "../lib/rapporto-detail-panel.utils"
import {
  RapportoDetailPanelEmptyLinkedState,
  RapportoDetailPanelListRowCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelLinkedRowsSkeleton } from "./rapporto-detail-panel-states"

type RapportoDetailPanelSectionVariazioniProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  variazioni: VariazioneContrattualeRecord[]
}

export function RapportoDetailPanelSectionVariazioni({
  sectionRef,
  loadingRelated,
  variazioni,
}: RapportoDetailPanelSectionVariazioniProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <DetailSectionBlock
        title="Variazioni contrattuali"
        icon={<RefreshCwIcon className="size-5" />}
        contentClassName="space-y-3 pt-2"
      >
        {loadingRelated ? (
          <RapportoDetailPanelLinkedRowsSkeleton rows={2} />
        ) : variazioni.length > 0 ? (
          variazioni.map((variazione) => (
            <RapportoDetailPanelListRowCard
              key={variazione.id}
              title={variazione.variazione_da_applicare ?? "Variazione contrattuale"}
              subtitle={[
                variazione.data_variazione
                  ? `Data variazione ${formatRapportoDetailDate(variazione.data_variazione)}`
                  : null,
                variazione.ticket_id ? "Ticket collegato" : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              rightBadge={variazione.stato ?? undefined}
            />
          ))
        ) : (
          <RapportoDetailPanelEmptyLinkedState
            icon={<RefreshCwIcon className="size-8" />}
            label="Nessuna variazione contrattuale collegata"
          />
        )}
      </DetailSectionBlock>
    </div>
  )
}
