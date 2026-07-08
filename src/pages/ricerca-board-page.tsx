import { RicercaBoardView } from "@/modules/ricerca/components"

type RicercaBoardPageProps = {
  onOpenDetail: (processId: string) => void
}

export function RicercaBoardPage({ onOpenDetail }: RicercaBoardPageProps) {
  return <RicercaBoardView onOpenDetail={onOpenDetail} />
}
