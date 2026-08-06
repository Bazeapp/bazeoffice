import { RicercaDetailView } from "@/modules/ricerca/components"

type RicercaDetailPageProps = {
  processId: string
  selectionId?: string | null
  onBack: () => void
  onOpenRelatedRicerca?: (processId: string, selectionId: string) => void
  onFocusSelection?: (selectionId: string | null) => void
  onOpenLavoratoreCercaPage?: (workerId: string) => void
}

export function RicercaDetailPage({
  processId,
  selectionId = null,
  onBack,
  onOpenRelatedRicerca,
  onFocusSelection,
  onOpenLavoratoreCercaPage,
}: RicercaDetailPageProps) {
  return (
    <RicercaDetailView
      processId={processId}
      selectionId={selectionId}
      onBack={onBack}
      onOpenRelatedRicerca={onOpenRelatedRicerca}
      onFocusSelection={onFocusSelection}
      onOpenLavoratoreCercaPage={onOpenLavoratoreCercaPage}
    />
  )
}
