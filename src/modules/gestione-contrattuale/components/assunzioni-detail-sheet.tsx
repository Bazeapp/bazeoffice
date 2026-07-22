import type { AssunzioniBoardCardData } from "../types"
import { useAssunzioniDetailSheet } from "../hooks/use-assunzioni-detail-sheet"
import { AssunzioniDetailSheetContent } from "./assunzioni-detail-sheet-content"

export function AssunzioniDetailSheet({
  card,
  open,
  onCardChange,
  onOpenChange,
  onDeleteRapporto,
}: {
  card: AssunzioniBoardCardData | null
  open: boolean
  onCardChange: (card: AssunzioniBoardCardData) => void
  onOpenChange: (open: boolean) => void
  onDeleteRapporto?: (rapportoId: string) => Promise<void>
}) {
  const vm = useAssunzioniDetailSheet({
    card,
    open,
    onCardChange,
    onOpenChange,
    onDeleteRapporto,
  })

  return <AssunzioniDetailSheetContent vm={vm} />
}
