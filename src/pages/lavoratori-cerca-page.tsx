import { LavoratoriCercaView } from "@/components/lavoratori/lavoratori-cerca-view"

type LavoratoriCercaPageProps = {
  onOpenRicercaDetail?: (processId: string) => void
}

export function LavoratoriCercaPage({
  onOpenRicercaDetail,
}: LavoratoriCercaPageProps) {
  return <LavoratoriCercaView onOpenRicercaDetail={onOpenRicercaDetail} />
}
