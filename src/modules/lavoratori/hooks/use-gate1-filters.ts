import * as React from "react"

import type { QueryFilterGroup } from "@/lib/table-query"
import {
  buildGate1RpcFilterGroup,
  buildGate1RpcFilters,
} from "../lib/gate1-filters"

type UseGate1FiltersOptions = {
  filters: QueryFilterGroup | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
}

export function useGate1Filters({
  filters,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
}: UseGate1FiltersOptions) {
  const rpcFilters = React.useMemo(
    () =>
      buildGate1RpcFilters({
        filters,
        gate1ProvinciaFilter,
        gate1FollowupFilter,
      }),
    [filters, gate1FollowupFilter, gate1ProvinciaFilter]
  )

  const rpcFilterGroup = React.useMemo(
    () =>
      buildGate1RpcFilterGroup({
        filters,
        gate1ProvinciaFilter,
        gate1FollowupFilter,
      }),
    [filters, gate1FollowupFilter, gate1ProvinciaFilter]
  )

  return React.useMemo(
    () => ({
      rpcFilters,
      rpcFilterGroup,
    }),
    [rpcFilters, rpcFilterGroup]
  )
}
