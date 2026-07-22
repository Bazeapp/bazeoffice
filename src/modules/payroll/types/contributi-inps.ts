import type { ContributoInpsBoardCardData } from "./contributi-inps-board"
import type { ContributoQuarterValue } from "./contributi-inps-board"

export type ContributiPeriod = {
  quarter: ContributoQuarterValue
  year: number
}

export type ContributiColumnData = {
  id: string
  label: string
  color: string
  cards: ContributoInpsBoardCardData[]
}

export type ContributiStageDefinition = {
  id: string
  label: string
  color: string
}

export type ContributiMetric = {
  title: string
  value: string
  className?: string
}

export type ContributoInpsDetailSheetProps = {
  card: ContributoInpsBoardCardData | null
  columns: ContributiColumnData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange: (recordId: string, targetStageId: string) => Promise<void>
  onPatchCard: (
    recordId: string,
    patch: Partial<ContributoInpsBoardCardData["record"]>,
  ) => Promise<void>
}
