import { RicercaBoardView } from "@/components/ricerca/ricerca-board-view"

type RicercaBoardPageProps = {
  onOpenDetail: (processId: string) => void
}

export function RicercaBoardPage({ onOpenDetail }: RicercaBoardPageProps) {
  return <RicercaBoardView onOpenDetail={onOpenDetail} />
}
