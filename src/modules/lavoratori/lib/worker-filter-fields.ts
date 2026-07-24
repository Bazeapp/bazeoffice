import type { FilterField } from "@/components/data-table/data-table-filters"
import type { TableColumnMeta } from "@/lib/table-query"

import { normalizeDomesticRoleDbLabel, toReadableColumnLabel } from "./base-utils"
import type { LookupOption } from "@/lib/lookup-utils"

export function buildWorkerFilterFields(args: {
  columns: TableColumnMeta[]
  lookupFilterTypeByDomain: Map<string, TableColumnMeta["filterType"]>
  lookupOptionsByDomain: Map<string, LookupOption[]>
  provincieOptions: LookupOption[]
}): FilterField[] {
  const { columns, lookupFilterTypeByDomain, lookupOptionsByDomain, provincieOptions } = args
  return columns.map((column) => {
    // BAZ-37: provincia filtra su indirizzi.provincia_sigla nel RPC → il dropdown emette la SIGLA (value)
    // e il campo inviato è "provincia_sigla" (allineato ai gate1/gate2). Opzioni dalla tabella provincie.
    if (column.name === "provincia") {
      return {
        label: toReadableColumnLabel("provincia"),
        value: "provincia_sigla",
        type: "enum",
        options: provincieOptions,
      } satisfies FilterField
    }
    const domain = `lavoratori.${column.name}`
    const options = lookupOptionsByDomain.get(domain) ?? []
    const resolvedFilterType = lookupFilterTypeByDomain.get(domain) ?? column.filterType
    const filterOptions =
      resolvedFilterType === "enum" || resolvedFilterType === "multi_enum"
        ? options.map((opt) => ({
            value:
              column.name === "tipo_lavoro_domestico"
                ? normalizeDomesticRoleDbLabel(opt.label)
                : opt.label,
            label: opt.label,
          }))
        : undefined
    return {
      label: toReadableColumnLabel(column.name),
      value: column.name,
      type: resolvedFilterType,
      options: filterOptions,
    } satisfies FilterField
  })
}
