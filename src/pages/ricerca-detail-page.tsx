import { RicercaDetailView } from "@/components/ricerca/ricerca-detail-view"

type RicercaDetailPageProps = {
  processId: string
  onBack: () => void
}

export function RicercaDetailPage({
  processId,
  onBack,
}: RicercaDetailPageProps) {
  return <RicercaDetailView processId={processId} onBack={onBack} />
}
