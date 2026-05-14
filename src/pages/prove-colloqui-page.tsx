import { ProveColloquiView } from "@/components/prove-colloqui/prove-colloqui-view"

type ProveColloquiPageProps = {
  onOpenRicercaDetail: (processId: string) => void
}

export function ProveColloquiPage({ onOpenRicercaDetail }: ProveColloquiPageProps) {
  return <ProveColloquiView onOpenRicercaDetail={onOpenRicercaDetail} />
}
