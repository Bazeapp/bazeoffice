export type LookupValueMetadata = {
  color?: string
} & Record<string, unknown>

export type LookupValueRecord = {
  id: string
  entity_table: string
  entity_field: string
  value_key: string
  value_label: string
  sort_order: number | null
  is_active: boolean
  metadata: LookupValueMetadata | null
}
