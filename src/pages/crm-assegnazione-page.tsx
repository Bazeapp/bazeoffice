import { CrmAssegnazioneView } from "@/components/crm/crm-assegnazione-view"

type CrmAssegnazionePageProps = {
  onOpenRicercaDetail?: (processId: string) => void
}

export function CrmAssegnazionePage({
  onOpenRicercaDetail,
}: CrmAssegnazionePageProps) {
  return <CrmAssegnazioneView onOpenRicercaDetail={onOpenRicercaDetail} />
}
