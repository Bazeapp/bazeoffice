import { TabsContent } from "@/components/ui/tabs"
import type { CrmPipelineCardData } from "@/modules/crm/types"
import type { useRicercaWorkersPipeline } from "../hooks/use-ricerca-workers-pipeline"
import { RicercaWorkersPipelineView } from "./ricerca-workers-pipeline-view"

type Props = {
  processId: string
  card: CrmPipelineCardData
  focusedSelectionId: string | null
  onOpenRelatedSearch: (processId: string, selectionId: string) => void
  onFocusSelection?: (selectionId: string | null) => void
  onPatchProcess?: (
    targetProcessId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>
  pipelineState: ReturnType<typeof useRicercaWorkersPipeline>
  recruiterLabelsById: Map<string, string>
}

export function RicercaDetailViewTabPipeline({
  processId,
  card,
  focusedSelectionId,
  onOpenRelatedSearch,
  onFocusSelection,
  onPatchProcess,
  pipelineState,
  recruiterLabelsById,
}: Props) {
  return (
    <TabsContent
      value="pipeline"
      className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <RicercaWorkersPipelineView
        key={processId}
        className="min-h-0 flex-1"
        processId={processId}
        card={card}
        focusSelectionId={focusedSelectionId}
        onOpenRelatedSearch={onOpenRelatedSearch}
        onFocusSelectionChange={onFocusSelection}
        onPatchProcess={onPatchProcess}
        pipelineState={pipelineState}
        recruiterLabelsById={recruiterLabelsById}
      />
    </TabsContent>
  )
}
