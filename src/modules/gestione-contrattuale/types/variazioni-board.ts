import type { DragEvent } from "react"

import type { RapportoLavorativoRecord, VariazioneContrattualeRecord } from "@/types"

export type VariazioniBoardCardData = {
  id: string
  stage: string
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  famiglia: Record<string, unknown> | null
  lavoratore: Record<string, unknown> | null
  nomeCompleto: string
  dataVariazione: string
  variazioneDaApplicare: string | null
}

export type VariazioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: VariazioniBoardCardData[]
}

export type VariazioniRapportoOption = {
  id: string
  label: string
  rapporto: RapportoLavorativoRecord
}

export type VariazioniBoardDragHandlers = {
  draggingRecordId: string | null
  dropTargetColumnId: string | null
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (columnId: string, event: DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}
