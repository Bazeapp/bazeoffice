import { ShieldAlertIcon, TriangleAlertIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import type { ChiusuraContrattoRecord } from "@/types"

import { formatRapportoDetailDate } from "../lib/rapporto-detail-panel.utils"
import {
  RapportoDetailPanelEmptyLinkedState,
  RapportoDetailPanelListRowCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelLinkedRowsSkeleton } from "./rapporto-detail-panel-states"

type RapportoDetailPanelSectionChiusureProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  chiusure: ChiusuraContrattoRecord[]
}

export function RapportoDetailPanelSectionChiusure({
  sectionRef,
  loadingRelated,
  chiusure,
}: RapportoDetailPanelSectionChiusureProps) {
  return (
    <div ref={sectionRef} className="space-y-4">
      <DetailSectionBlock
        title="Chiusure"
        icon={<ShieldAlertIcon className="size-5" />}
        contentClassName="space-y-3 pt-2"
      >
        {loadingRelated ? (
          <RapportoDetailPanelLinkedRowsSkeleton rows={2} />
        ) : chiusure.length > 0 ? (
          chiusure.map((chiusura) => (
            <RapportoDetailPanelListRowCard
              key={chiusura.id}
              title={
                chiusura.tipo_licenziamento ??
                chiusura.motivazione_cessazione_rapporto ??
                "Chiusura contrattuale"
              }
              subtitle={[
                chiusura.data_fine_rapporto
                  ? `Fine rapporto ${formatRapportoDetailDate(chiusura.data_fine_rapporto)}`
                  : null,
                chiusura.informazioni_aggiuntive ?? null,
              ]
                .filter(Boolean)
                .join(" • ")}
              rightBadge={chiusura.stato ?? undefined}
            />
          ))
        ) : (
          <RapportoDetailPanelEmptyLinkedState
            icon={<TriangleAlertIcon className="size-8" />}
            label="Nessuna chiusura collegata"
          />
        )}
      </DetailSectionBlock>
    </div>
  )
}
