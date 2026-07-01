import { AssunzioniBoardView } from "@/components/gestione-contrattuale/assunzioni-board-view"

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
