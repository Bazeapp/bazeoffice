import type * as React from "react"

import type { VariazioniBoardCardData } from "../types"
import { useVariazioniDetailSheet } from "../hooks/use-variazioni-detail-sheet"
import { VariazioniDetailSheetContent } from "./variazioni-detail-sheet-content"

export function VariazioniDetailSheet({
  card,
  open,
  onCardChange,
  onOpenChange,
  commentAnchorRef,
}: {
  card: VariazioniBoardCardData | null
  open: boolean
  onCardChange: (card: VariazioniBoardCardData) => void
  onOpenChange: (open: boolean) => void
  commentAnchorRef?: React.RefObject<HTMLDivElement | null>
}) {
  const vm = useVariazioniDetailSheet({
    card,
    open,
    onCardChange,
    onOpenChange,
  })

  return <VariazioniDetailSheetContent vm={vm} commentAnchorRef={commentAnchorRef} />
}
