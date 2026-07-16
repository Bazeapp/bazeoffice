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

// BAZ-37: come useProvincieOptions ma con l'etichetta = NOME esteso della provincia
// (il value resta la sigla, che è ciò che il filtro invia). Usata nel catalogo filtri
// di /cerca-lavoratori così l'utente vede "Milano" invece di "MI".
export function useProvincieNameOptions(): LookupOption[] {
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
