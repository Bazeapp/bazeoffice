export type GenericRow = Record<string, unknown>

export type UseLavoratoriDataOptions = {
  initialSelectedWorkerId?: string | null
  forcedWorkerStatus?: string | string[]
  applyGate1BaseFilters?: boolean
  includeRelatedSelectionDetails?: boolean
  gate1ProvinciaFilter?: string
  gate1FollowupFilter?: string
}
