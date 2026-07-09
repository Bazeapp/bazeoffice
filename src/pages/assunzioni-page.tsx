import { AssunzioniBoardView } from "@/modules/gestione-contrattuale/components"

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
