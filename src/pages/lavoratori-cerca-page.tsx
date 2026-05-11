import { LavoratoriCercaView } from "@/components/lavoratori/lavoratori-cerca-view"

type LavoratoriCercaPageProps = {
  initialSelectedWorkerId?: string | null
  onOpenRicercaDetail?: (processId: string) => void
}

export function LavoratoriCercaPage({
  initialSelectedWorkerId = null,
  onOpenRicercaDetail,
}: LavoratoriCercaPageProps) {
  return (
    <LavoratoriCercaView
      initialSelectedWorkerId={initialSelectedWorkerId}
      onOpenRicercaDetail={onOpenRicercaDetail}
    />
  )
}
