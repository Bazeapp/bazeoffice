import { Form } from "@/components/ui/form"
import { Tabs, TabsContent } from "@/components/ui/tabs"

import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  crmProcessoCommentRow,
  crmProcessoDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"

import {
  useRicercaDetailView,
  type RicercaDetailViewProps,
} from "../hooks/use-ricerca-detail-view"
import { RicercaDetailViewHeader } from "./ricerca-detail-view-header"
import { RicercaDetailViewSectionAnnuncio } from "./ricerca-detail-view-section-annuncio"
import { RicercaDetailViewSectionFamiglia } from "./ricerca-detail-view-section-famiglia"
import { RicercaDetailViewSectionLuogoLavoro } from "./ricerca-detail-view-section-luogo-lavoro"
import { RicercaDetailViewSectionMansioni } from "./ricerca-detail-view-section-mansioni"
import { RicercaDetailViewSectionOrari } from "./ricerca-detail-view-section-orari"
import { RicercaDetailViewSectionRecruiter } from "./ricerca-detail-view-section-recruiter"
import { RicercaDetailViewSectionRichiesteSpecifiche } from "./ricerca-detail-view-section-richieste-specifiche"
import { RicercaDetailViewSectionTempistiche } from "./ricerca-detail-view-section-tempistiche"
import { RicercaDetailViewSidebar } from "./ricerca-detail-view-sidebar"
import {
  RicercaDetailViewError,
  RicercaDetailViewLoading,
  RicercaDetailViewNotFound,
} from "./ricerca-detail-view-states"
import { RicercaDetailViewTabMappa } from "./ricerca-detail-view-tab-mappa"
import { RicercaDetailViewTabPipeline } from "./ricerca-detail-view-tab-pipeline"

export type { RicercaDetailViewProps } from "../hooks/use-ricerca-detail-view"

function RicercaDetailViewBody({
  detail,
  card,
}: {
  detail: ReturnType<typeof useRicercaDetailView>
  card: NonNullable<ReturnType<typeof useRicercaDetailView>["card"]>
}) {
  return (
    <div className={detail.layout.gridClassName}>
      <RicercaDetailViewSidebar
        isSidebarCollapsed={detail.layout.isSidebarCollapsed}
        setIsSidebarCollapsed={detail.layout.setIsSidebarCollapsed}
        summary={{ ...detail.summary, card }}
      >
        <RicercaDetailViewSectionOrari {...detail.sections.orari} card={card} />
        <RicercaDetailViewSectionLuogoLavoro
          {...detail.sections.luogoLavoro}
          card={card}
        />
        <RicercaDetailViewSectionFamiglia {...detail.sections.famiglia} card={card} />
        <RicercaDetailViewSectionMansioni {...detail.sections.mansioni} card={card} />
        <RicercaDetailViewSectionRichiesteSpecifiche
          {...detail.sections.richiesteSpecifiche}
          card={card}
        />
        <RicercaDetailViewSectionRecruiter {...detail.sections.recruiter} card={card} />
        <RicercaDetailViewSectionTempistiche
          {...detail.sections.tempistiche}
          card={card}
        />
        <RicercaDetailViewSectionAnnuncio {...detail.sections.annuncio} card={card} />
      </RicercaDetailViewSidebar>

      <div className="flex min-h-0 flex-col overflow-hidden">
        <TabsContent
          value="pipeline"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RicercaDetailViewTabPipeline {...detail.tabs.pipeline} card={card} />
        </TabsContent>
        <TabsContent
          value="mappa"
          className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <RicercaDetailViewTabMappa {...detail.tabs.mappa} card={card} />
        </TabsContent>
      </div>
    </div>
  )
}

export function RicercaDetailView(props: RicercaDetailViewProps) {
  const detail = useRicercaDetailView(props)
  const card = detail.card
  const focusedSelectionId = detail.tabs.pipeline.focusedSelectionId

  useCommentRouteContext({
    enabled: Boolean(card) && !focusedSelectionId,
    pageFocus: card ? { entityType: "ricerca", entityId: props.processId } : null,
    row: card ? crmProcessoCommentRow(card) : {},
    sourceInterface: "dettaglio_ricerca",
    displayNames: card ? crmProcessoDisplayNames(card) : undefined,
  })

  return (
    <Form {...detail.form}>
      <section
        className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
      >
        <Tabs
          defaultValue="pipeline"
          className="flex h-full min-h-0 flex-col gap-0"
        >
          <RicercaDetailViewHeader {...detail.header} />

          {detail.asyncState.error ? (
            <RicercaDetailViewError error={detail.asyncState.error} />
          ) : null}

          {detail.asyncState.loading ? (
            <RicercaDetailViewLoading />
          ) : !detail.card ? (
            <RicercaDetailViewNotFound />
          ) : (
            <RicercaDetailViewBody detail={detail} card={detail.card} />
          )}
        </Tabs>
      </section>
    </Form>
  )
}
