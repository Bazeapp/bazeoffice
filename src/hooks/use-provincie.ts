import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { fetchProvincie } from "@/lib/provincie-api"
import type { ProvinciaRecord } from "@/lib/provincie-api"
import type { LookupOption } from "@/lib/lookup-utils"

export const PROVINCIE_QUERY_KEY = ["provincie"] as const

export function useProvincie() {
  return useQuery<ProvinciaRecord[]>({
    queryKey: PROVINCIE_QUERY_KEY,
    queryFn: fetchProvincie,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Options for provincia selects/filters: value = sigla (what we persist /
 * send to RPCs), label = nome esteso (what the user reads).
 * BAZ-181 / BAZ-37: never show the sigla as the option label.
 */
export function useProvincieOptions(): LookupOption[] {
  const { data } = useProvincie()
  return React.useMemo<LookupOption[]>(
    () =>
      (data ?? []).map((row) => ({
        value: row.sigla,
        label: row.nome,
      })),
    [data],
  )
}

/** @deprecated Prefer useProvincieOptions — same value/label contract. */
export function useProvincieNameOptions(): LookupOption[] {
  return useProvincieOptions()
}
