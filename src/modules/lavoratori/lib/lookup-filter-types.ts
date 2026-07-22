import type { LookupValueRecord } from "@/types/entities/lookup-values"
import type { TableColumnMeta } from "@/lib/table-query"

export function buildLookupFilterTypeMap(rows: LookupValueRecord[]) {
  const filterTypeMap = new Map<string, TableColumnMeta["filterType"]>()

  for (const row of rows) {
    if (!row.is_active) continue
    if (row.entity_table !== "lavoratori") continue
    const domain = `${row.entity_table}.${row.entity_field}`
    const metadata = row.metadata
    const filterType =
      metadata && typeof metadata === "object" && "filter_type" in metadata
        ? metadata.filter_type
        : null
    if (filterType === "enum" || filterType === "multi_enum") {
      filterTypeMap.set(domain, filterType)
    }
  }

  return filterTypeMap
}
