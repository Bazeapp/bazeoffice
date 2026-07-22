import { TabsContent } from "@/components/ui/tabs"
import type { RicercaDetailCardData } from "../lib/ricerca-detail-view.types"
import type { useRicercaWorkersPipeline } from "../hooks/use-ricerca-workers-pipeline"
import { RicercaWorkersMapView } from "./ricerca-workers-map-view"

type Props = {
  processId: string
  card: RicercaDetailCardData
  pipelineState: ReturnType<typeof useRicercaWorkersPipeline>
  onCoordinatesGeocoded: () => void
}

export function RicercaDetailViewTabMappa({
  processId,
  card,
  pipelineState,
  onCoordinatesGeocoded,
}: Props) {
  return (
    <TabsContent
      value="mappa"
      className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <RicercaWorkersMapView
        className="min-h-0 flex-1 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]"
        processId={processId}
        searchLat={card.indirizzoProvaLatitudine}
        searchLng={card.indirizzoProvaLongitudine}
        jobRole={card.tipoLavoroBadge}
        weeklyDays={card.giorniSettimana}
        pipelineState={pipelineState}
        onCoordinatesGeocoded={onCoordinatesGeocoded}
      />
    </TabsContent>
  )
}
