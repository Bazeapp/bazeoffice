import { ProveColloquiView } from "@/modules/support/components"

type ProveColloquiPageProps = {
  onOpenRicercaDetail: (processId: string) => void
}

export function ProveColloquiPage({ onOpenRicercaDetail }: ProveColloquiPageProps) {
  return <ProveColloquiView onOpenRicercaDetail={onOpenRicercaDetail} />
}
