import { getTagClassName } from "@/modules/lavoratori/lib"
import { TipoContrattoBadge } from "@/components/shared-next/tipo-contratto-badge"
import { Badge } from "@/components/ui/badge"
import type { RapportoLavorativoRecord } from "@/types"

import type { RapportoDetailHeaderView } from "../lib/rapporto-detail-panel.mappers"

type RapportoDetailPanelHeaderProps = RapportoDetailHeaderView & {
  rapportoView: RapportoLavorativoRecord
}

export function RapportoDetailPanelHeader({
  relationshipTitle,
  familyEmail,
  startDateLabel,
  rapportoStatus,
  statoRapportoColor,
  rapportoView,
}: RapportoDetailPanelHeaderProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="truncate text-xl leading-tight font-semibold">{relationshipTitle}</h2>
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {familyEmail ? <span>{familyEmail}</span> : null}
          {familyEmail && startDateLabel !== "-" ? <span>•</span> : null}
          {startDateLabel !== "-" ? <span>dal {startDateLabel}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={getTagClassName(statoRapportoColor)}>{rapportoStatus}</Badge>
        {rapportoView.stato_servizio ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.stato_servizio}
          </Badge>
        ) : null}
        {rapportoView.tipo_rapporto ? (
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_rapporto}
          </Badge>
        ) : null}
        {rapportoView.tipo_contratto ? (
          <Badge variant="secondary" className="h-6 rounded-full px-2.5 text-2xs font-medium">
            {rapportoView.tipo_contratto}
          </Badge>
        ) : null}
        <TipoContrattoBadge
          isAbbonamento={rapportoView.richiesta_attivazione_id == null}
          className="h-6 rounded-full px-2.5 text-2xs font-medium"
        />
      </div>
    </div>
  )
}
