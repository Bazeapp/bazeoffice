import type { Gate1RpcFilter } from "@/lib/table-query"

import { toCanonicalWorkerStatus } from "./gate1-filters"

export function buildGate2RpcStatusFilters(
  forcedWorkerStatus: string | string[] | undefined
): Gate1RpcFilter[] | null {
  const statuses = (Array.isArray(forcedWorkerStatus) ? forcedWorkerStatus : [forcedWorkerStatus ?? ""])
    .map((status) => toCanonicalWorkerStatus(status))
    .filter(Boolean)
  const uniqueStatuses = Array.from(new Set(statuses)).sort()

  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === "Idoneo") {
    return [
      {
        field: "stato_lavoratore",
        operator: "is",
        value: "Idoneo",
      },
    ]
  }

  if (
    uniqueStatuses.length === 2 &&
    uniqueStatuses[0] === "Idoneo" &&
    uniqueStatuses[1] === "Qualificato"
  ) {
    return []
  }

  return null
}
