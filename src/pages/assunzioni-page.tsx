import { AssunzioniBoardView } from "@/modules/gestione-contrattuale"

type AssunzioniPageProps = {
  initialSelectedRapportoId?: string | null
}

export function AssunzioniPage({
  initialSelectedRapportoId = null,
}: AssunzioniPageProps) {
  return (
    <AssunzioniBoardView initialSelectedRapportoId={initialSelectedRapportoId} />
  )
}
