import * as React from "react"

import type { Gate1RpcFilter, QueryFilterGroup } from "@/lib/table-query"
import { buildGate1RpcFilters } from "../lib/gate1-filters"
import { buildGate2RpcStatusFilters } from "../lib/gate2-filters"
import { isRpcSortable } from "../lib/sort-utils"

type UseGate2FiltersOptions = {
  applyGate1BaseFilters: boolean
  filters: QueryFilterGroup | undefined
  forcedWorkerStatus: string | string[] | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
  sorting: { id: string; desc: boolean }[]
}

export function useGate2Filters({
  applyGate1BaseFilters,
  filters,
  forcedWorkerStatus,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
  sorting,
}: UseGate2FiltersOptions) {
  const userRpcFilters = React.useMemo(
    () =>
      buildGate1RpcFilters({
        filters,
        gate1ProvinciaFilter,
        gate1FollowupFilter,
      }),
    [filters, gate1FollowupFilter, gate1ProvinciaFilter]
  )

  const statusRpcFilters = React.useMemo(
    () => buildGate2RpcStatusFilters(forcedWorkerStatus),
    [forcedWorkerStatus]
  )

  const rpcFilters = React.useMemo(() => {
    if (!userRpcFilters || !statusRpcFilters) return null
    return [...userRpcFilters, ...statusRpcFilters]
  }, [statusRpcFilters, userRpcFilters])

  const rpcFilterGroup = React.useMemo<QueryFilterGroup | null>(() => {
    if (userRpcFilters !== null || statusRpcFilters === null) return null

    return {
      kind: "group",
      id: "gate2-rpc-filter-group",
      logic: "and",
      nodes: [
        ...(filters && Array.isArray(filters.nodes) && filters.nodes.length > 0
          ? [filters]
          : []),
        ...statusRpcFilters.map((filter, index) => ({
          kind: "condition" as const,
          id: `gate2-rpc-status-${index}`,
          field: filter.field,
          operator: filter.operator,
          value: filter.value ?? "",
        })),
      ],
    }
  }, [filters, statusRpcFilters, userRpcFilters])

  const canUseGate2Rpc = React.useMemo(
    () =>
      !applyGate1BaseFilters &&
      (rpcFilters !== null || rpcFilterGroup !== null) &&
      isRpcSortable(sorting),
    [applyGate1BaseFilters, rpcFilterGroup, rpcFilters, sorting]
  )

  return {
    userRpcFilters,
    statusRpcFilters,
    rpcFilters,
    rpcFilterGroup,
    canUseGate2Rpc,
  } satisfies {
    userRpcFilters: Gate1RpcFilter[] | null
    statusRpcFilters: Gate1RpcFilter[] | null
    rpcFilters: Gate1RpcFilter[] | null
    rpcFilterGroup: QueryFilterGroup | null
    canUseGate2Rpc: boolean
  }
}
