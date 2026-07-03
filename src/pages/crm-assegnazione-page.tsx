import { CrmAssegnazioneView } from "@/modules/crm/components"

type CrmAssegnazionePageProps = {
  onOpenRicercaDetail?: (processId: string) => void
}

export function CrmAssegnazionePage({
  onOpenRicercaDetail,
}: CrmAssegnazionePageProps) {
  return <CrmAssegnazioneView onOpenRicercaDetail={onOpenRicercaDetail} />
}
