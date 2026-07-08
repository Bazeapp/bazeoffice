import type { Gate1RpcFilter, QueryFilterGroup } from "@/lib/table-query"

export function toCanonicalWorkerStatus(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll("_", " ")

  switch (normalized) {
    case "non qualificato":
      return "Non qualificato"
    case "qualificato":
      return "Qualificato"
    case "non idoneo":
      return "Non idoneo"
    case "idoneo":
      return "Idoneo"
    case "certificato":
      return "Certificato"
    default:
      return value.trim()
  }
}


export function collectGate1RpcFilters(
  group: QueryFilterGroup | undefined
): Gate1RpcFilter[] | null {
  if (!group || !Array.isArray(group.nodes) || group.nodes.length === 0) return []
  if (group.logic !== "and") return null

  const filters: Gate1RpcFilter[] = []
  for (const node of group.nodes) {
    if (node.kind === "condition") {
      filters.push({
        field: node.field,
        operator: node.operator,
        value: node.value,
        valueTo: node.valueTo,
      })
      continue
    }

    const nestedFilters = collectGate1RpcFilters(node)
    if (!nestedFilters) return null
    filters.push(...nestedFilters)
  }

  return filters
}

export function buildGate1RpcFilters({
  filters,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
}: {
  filters: QueryFilterGroup | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
}) {
  const rpcFilters = collectGate1RpcFilters(filters)
  if (!rpcFilters) return null

  if (gate1ProvinciaFilter !== "all") {
    rpcFilters.push({
      field: "provincia_sigla",
      operator: "is",
      value: gate1ProvinciaFilter,
    })
  }

  if (gate1FollowupFilter !== "all") {
    rpcFilters.push({
      field: "followup_chiamata_idoneita",
      operator: "is",
      value: gate1FollowupFilter,
    })
  }

  return rpcFilters
}

// Variante per filtri con logica OR (non appiattibili in array): costruisce il
// GRUPPO annidato { and: [filtriUtente, provincia?, followup?] } che gate1/gate2
// valutano via lavoratore_matches_filter_group. Niente più fallback table-query.
export function buildGate1RpcFilterGroup({
  filters,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
}: {
  filters: QueryFilterGroup | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
}): QueryFilterGroup {
  const nodes: QueryFilterGroup["nodes"] = []
  if (filters && Array.isArray(filters.nodes) && filters.nodes.length > 0) {
    nodes.push(filters)
  }
  if (gate1ProvinciaFilter !== "all") {
    nodes.push({
      kind: "condition",
      id: "gate-rpc-provincia",
      field: "provincia_sigla",
      operator: "is",
      value: gate1ProvinciaFilter,
    })
  }
  if (gate1FollowupFilter !== "all") {
    nodes.push({
      kind: "condition",
      id: "gate-rpc-followup",
      field: "followup_chiamata_idoneita",
      operator: "is",
      value: gate1FollowupFilter,
    })
  }
  return { kind: "group", id: "gate-rpc-filter-group", logic: "and", nodes }
}
