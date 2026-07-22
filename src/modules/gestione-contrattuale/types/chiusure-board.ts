import type { DragEvent } from "react"

import type { ChiusuraContrattoRecord, RapportoLavorativoRecord } from "@/types"

export type TipoLicenziamentoOption = { value: string; label: string }

export type ChiusureRapportoOption = {
  id: string
  label: string
  rapporto: RapportoLavorativoRecord
}

export type ChiusureBoardCardData = {
  id: string
  stage: string
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
  tipoColor: string | null
  hasAssunzioneDatore: boolean
  hasAssunzioneLavoratore: boolean
}

export type ChiusureBoardColumnData = {
  id: string
  label: string
  color: string
  cards: ChiusureBoardCardData[]
}

export type ChiusureBoardDragHandlers = {
  draggingRecordId: string | null
  dropTargetColumnId: string | null
  onDragStartCard: (recordId: string) => void
  onDragEndCard: () => void
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (columnId: string, event: DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, recordId: string | null) => void
}
