import type { ChiusuraTipoMetadata } from "../lib/chiusure-board"
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
  tipoMetadata,
  open,
  onOpenChange,
  onStatusChange,
  onLinkRapporto,
  onCardChange,
  onPatchChiusura,
  onDeleteChiusura,
}: {
  card: ChiusureBoardCardData | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: ChiusureRapportoOption[]
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
  tipoMetadata?: ChiusuraTipoMetadata
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
}) {
  const vm = useChiusureDetailSheet({
    card,
    columns,
    rapportoOptions,
    tipoLicenziamentoOptions,
    tipoMetadata,
    open,
    onOpenChange,
    onStatusChange,
    onLinkRapporto,
    onCardChange,
    onPatchChiusura,
    onDeleteChiusura,
  })

  return <ChiusureDetailSheetContent vm={vm} />
}
