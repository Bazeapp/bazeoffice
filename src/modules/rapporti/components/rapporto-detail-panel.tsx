import { Form } from "@/components/ui/form"
import { RecordDetailShell } from "@/components/shared-next/record-detail-shell"

import {
  useRapportoDetailPanel,
  type RapportoDetailPanelProps,
} from "../hooks/use-rapporto-detail-panel"
import { RapportoDetailPanelHeader } from "./rapporto-detail-panel-header"
import { RapportoDetailPanelOverlays } from "./rapporto-detail-panel-overlays"
import { RapportoDetailPanelSectionCedolini } from "./rapporto-detail-panel-section-cedolini"
import { RapportoDetailPanelSectionChiusure } from "./rapporto-detail-panel-section-chiusure"
import { RapportoDetailPanelSectionContratto } from "./rapporto-detail-panel-section-contratto"
import { RapportoDetailPanelSectionContributi } from "./rapporto-detail-panel-section-contributi"
import { RapportoDetailPanelSectionGestione } from "./rapporto-detail-panel-section-gestione"
import { RapportoDetailPanelSectionPreventivo } from "./rapporto-detail-panel-section-preventivo"
import { RapportoDetailPanelSectionTickets } from "./rapporto-detail-panel-section-tickets"
import { RapportoDetailPanelSectionVariazioni } from "./rapporto-detail-panel-section-variazioni"
import {
  RapportoDetailPanelEmptySelection,
  RapportoDetailPanelSkeleton,
} from "./rapporto-detail-panel-states"

export type { RapportoDetailPanelProps } from "../hooks/use-rapporto-detail-panel"

export function RapportoDetailPanel(props: RapportoDetailPanelProps) {
  const panel = useRapportoDetailPanel(props)

  if (panel.loading) {
    return <RapportoDetailPanelSkeleton />
  }

  if (!panel.hasSelection || !panel.sections.contratto || !panel.sections.gestione || !panel.shell.header) {
    return <RapportoDetailPanelEmptySelection />
  }

  const headerContent = (
    <RapportoDetailPanelHeader
      relationshipTitle={panel.shell.header.relationshipTitle}
      familyEmail={panel.shell.header.familyEmail}
      startDateLabel={panel.shell.header.startDateLabel}
      rapportoStatus={panel.shell.header.rapportoStatus}
      statoRapportoColor={panel.shell.header.statoRapportoColor}
      rapportoView={panel.shell.header.rapportoView}
    />
  )

  return (
    <Form {...panel.form}>
      <RecordDetailShell
        key={panel.shell.key}
        sectionRef={panel.shell.sectionRef}
        tabs={panel.shell.tabs}
        activeSection={panel.shell.activeSection}
        onSectionChange={panel.shell.onSectionChange}
        header={panel.shell.hideHeader ? undefined : headerContent}
        embedded={panel.shell.embedded}
      >
        <>
          <div className="space-y-6 text-sm">
            <RapportoDetailPanelSectionContratto
              sectionRef={panel.refs.contratto}
              {...panel.sections.contratto}
            />
            <RapportoDetailPanelSectionPreventivo
              sectionRef={panel.refs.preventivo}
              {...panel.sections.preventivo}
            />
            <RapportoDetailPanelSectionGestione
              sectionRef={panel.refs.gestione}
              {...panel.sections.gestione}
            />
            <RapportoDetailPanelSectionTickets
              sectionRef={panel.refs.tickets}
              {...panel.sections.tickets}
            />
            <RapportoDetailPanelSectionCedolini
              sectionRef={panel.refs.cedolini}
              {...panel.sections.cedolini}
            />
            <RapportoDetailPanelSectionContributi
              sectionRef={panel.refs.contributi}
              {...panel.sections.contributi}
            />
            <RapportoDetailPanelSectionVariazioni
              sectionRef={panel.refs.variazioni}
              {...panel.sections.variazioni}
            />
            <RapportoDetailPanelSectionChiusure
              sectionRef={panel.refs.chiusure}
              {...panel.sections.chiusure}
            />
            <div className="h-8" />
          </div>
          <RapportoDetailPanelOverlays {...panel.overlays} />
        </>
      </RecordDetailShell>
    </Form>
  )
}
