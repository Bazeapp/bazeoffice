import { LavoratoriCercaView } from "@/modules/lavoratori/components/lavoratori-cerca-view"
import type { OpenRicercaDetailOptions } from "@/routes/app-routes"

type LavoratoriCercaPageProps = {
  initialSelectedWorkerId?: string | null
  onOpenRicercaDetail?: (processId: string, options?: OpenRicercaDetailOptions) => void
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
