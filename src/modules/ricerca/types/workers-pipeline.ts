import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"

export type GenericRow = Record<string, unknown>

export type RicercaWorkerSelectionCard = {
  id: string
  status: string
  punteggio: string
  scheduledAt: string | null
  endedAt: string | null
  worker: LavoratoreListItem
}

export type RicercaWorkerSelectionColumn = {
  id: string
  label: string
  color: string | null
  dropStatusId?: string
  groupColors?: Record<string, string | null>
  groupStatusIds?: Record<string, string>
  cards: RicercaWorkerSelectionCard[]
}

export type RicercaWorkersPipelineState = {
  loading: boolean
  error: string | null
  columns: RicercaWorkerSelectionColumn[]
  moveCard: (selectionId: string, targetStatusId: string) => Promise<void>
  refresh: () => void
}

export type StageDefinition = {
  id: string
  label: string
  color: string | null
}

export type StageMetadata = {
  definitions: StageDefinition[]
  aliases: Map<string, string>
}
