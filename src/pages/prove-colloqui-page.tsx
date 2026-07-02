import { ProveColloquiView } from "@/modules/support"

type ProveColloquiPageProps = {
  onOpenRicercaDetail: (processId: string) => void
}

export function ProveColloquiPage({ onOpenRicercaDetail }: ProveColloquiPageProps) {
  return <ProveColloquiView onOpenRicercaDetail={onOpenRicercaDetail} />
}
