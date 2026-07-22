import type { RichiestaAttivazioneRecord } from "@/types"

import type {
  CrmPipelineColumnData,
  GenericRow,
  LookupOptionsByField,
} from "./pipeline"

export type CrmPipelinePreviewState = {
  loading: boolean
  error: string | null
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
  loadedClosedStageIds: Set<string>
  loadClosedStage: (stageId: string) => void
  loadProcessDetail: (processId: string) => Promise<void>
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  updateProcessCard: (
    processId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
  updateFamilyCard: (
    familyId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
  updateAddressCard: (
    processId: string,
    addressId: string | null,
    patch: Record<string, unknown>
  ) => Promise<void>
}

export type LookupColorMap = Record<string, Record<string, string>>

export type CrmPipelineStageDefinition = {
  id: string
  label: string
  color: string | null
  sortOrder: number | null
}

export type FetchBoardDataResult = {
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
}

export type BoardRecordEntry = {
  process: GenericRow
  family: GenericRow | null
  address: GenericRow | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
}

export type BoardRecordBundle = {
  entries: BoardRecordEntry[]
  stageGroups: Array<{ value: string; count: number }>
}
