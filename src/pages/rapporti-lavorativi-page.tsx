import { RapportiLavorativiView } from "@/components/gestione-contrattuale/rapporti-lavorativi-view"

type RapportiLavorativiPageProps = {
  initialSelectedRapportoId?: string | null
}

export function RapportiLavorativiPage({
  initialSelectedRapportoId = null,
}: RapportiLavorativiPageProps) {
  return (
    <RapportiLavorativiView
      initialSelectedRapportoId={initialSelectedRapportoId}
    />
  )
}
