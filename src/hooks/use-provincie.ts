import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { fetchProvincie } from "@/lib/provincie-api"
import type { ProvinciaRecord } from "@/lib/provincie-api"
import type { LookupOption } from "@/modules/lavoratori/lib"

export const PROVINCIE_QUERY_KEY = ["provincie"] as const

export function useProvincie() {
  return useQuery<ProvinciaRecord[]>({
    queryKey: PROVINCIE_QUERY_KEY,
    queryFn: fetchProvincie,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useProvincieOptions(): LookupOption[] {
  const { data } = useProvincie()
  return React.useMemo<LookupOption[]>(
    () =>
      (data ?? []).map((row) => ({
        value: row.sigla,
        label: row.sigla,
      })),
    [data],
  )
}
