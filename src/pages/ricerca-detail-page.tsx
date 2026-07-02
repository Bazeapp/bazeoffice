import { RicercaDetailView } from "@/components/ricerca/ricerca-detail-view"

type RicercaDetailPageProps = {
  processId: string
  selectionId?: string | null
  onBack: () => void
  onOpenRelatedRicerca?: (processId: string, selectionId: string) => void
  onFocusSelection?: (selectionId: string | null) => void
}

export function RicercaDetailPage({
  processId,
  selectionId = null,
  onBack,
  onOpenRelatedRicerca,
  onFocusSelection,
}: RicercaDetailPageProps) {
  return (
    <RicercaDetailView
      processId={processId}
      selectionId={selectionId}
      onBack={onBack}
      onOpenRelatedRicerca={onOpenRelatedRicerca}
      onFocusSelection={onFocusSelection}
    />
  )
}
