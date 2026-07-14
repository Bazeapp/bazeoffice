import type * as React from "react"

import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  ChiusureRapportoOption,
  TipoLicenziamentoOption,
} from "../types"
import { useChiusureDetailSheet } from "../hooks/use-chiusure-detail-sheet"
import { ChiusureDetailSheetContent } from "./chiusure-detail-sheet-content"

export function ChiusureDetailSheet({
  card,
  columns,
  rapportoOptions,
  tipoLicenziamentoOptions,
  open,
  onOpenChange,
  onStatusChange,
  onLinkRapporto,
  onCardChange,
  onPatchChiusura,
  onDeleteChiusura,
  commentAnchorRef,
}: {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: ChiusureRapportoOption[]
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (recordId: string, targetStageId: string) => Promise<void>
  onLinkRapporto: (chiusuraId: string, rapportoId: string | null) => Promise<void>
  onCardChange: (card: ChiusureBoardCardData) => void
  onPatchChiusura: (
    recordId: string,
    patch: Partial<ChiusureBoardCardData["record"]>,
  ) => Promise<void>
  onDeleteChiusura?: (recordId: string) => Promise<void>
  commentAnchorRef?: React.RefObject<HTMLDivElement | null>
}) {
  const vm = useChiusureDetailSheet({
    card,
    columns,
    rapportoOptions,
    tipoLicenziamentoOptions,
    open,
    onOpenChange,
    onStatusChange,
    onLinkRapporto,
    onCardChange,
    onPatchChiusura,
    onDeleteChiusura,
  })

  return <ChiusureDetailSheetContent vm={vm} commentAnchorRef={commentAnchorRef} />
}
