import { RapportiLavorativiView } from "@/modules/rapporti/components"

type RapportiLavorativiPageProps = {
  initialSelectedRapportoId?: string | null
  onSelectRapporto?: (rapportoId: string | null) => void
}

export function RapportiLavorativiPage({
  initialSelectedRapportoId = null,
  onSelectRapporto,
}: RapportiLavorativiPageProps) {
  return (
    <RapportiLavorativiView
      initialSelectedRapportoId={initialSelectedRapportoId}
      onSelectRapporto={onSelectRapporto}
    />
  )
}
