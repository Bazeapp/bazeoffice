import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchLavoratori,
  fetchProcessiMatching,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

export type AnagraficaRow = Record<string, unknown>
export type LookupColorMap = Record<string, Record<string, string>>
export type AnagraficheTab = "famiglie" | "processi" | "lavoratori"

type UseAnagraficheDataParams = {
  activeTab: AnagraficheTab
  pageIndex: number
  pageSize: number
}

type AnagraficheDataState = {
  workers: AnagraficaRow[]
  families: AnagraficaRow[]
  processes: AnagraficaRow[]
  workersTotal: number
  familiesTotal: number
  processesTotal: number
  lookupColors: LookupColorMap
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null

  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    return acc
  }, {})
}

function toRows(data: unknown[]): AnagraficaRow[] {
  return data.map((row) =>
    row && typeof row === "object" ? (row as AnagraficaRow) : {}
  )
}

async function fetchTabPage(
  activeTab: AnagraficheTab,
  pageIndex: number,
  pageSize: number
) {
  const offset = Math.max(0, pageIndex) * Math.max(1, pageSize)
  const limit = Math.max(1, pageSize)

  if (activeTab === "processi") {
    return fetchProcessiMatching({ limit, offset })
  }

  if (activeTab === "lavoratori") {
    return fetchLavoratori({ limit, offset })
  }

  return fetchFamiglie({ limit, offset })
}

export function useAnagraficheData({
  activeTab,
  pageIndex,
  pageSize,
}: UseAnagraficheDataParams): AnagraficheDataState {
  const [workers, setWorkers] = React.useState<AnagraficaRow[]>([])
  const [families, setFamilies] = React.useState<AnagraficaRow[]>([])
  const [processes, setProcesses] = React.useState<AnagraficaRow[]>([])
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [familiesTotal, setFamiliesTotal] = React.useState(0)
  const [processesTotal, setProcessesTotal] = React.useState(0)
  const [lookupColors, setLookupColors] = React.useState<LookupColorMap>({})
  const [loadingLookup, setLoadingLookup] = React.useState(true)
  const [loadingTable, setLoadingTable] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [lookupLoaded, setLookupLoaded] = React.useState(false)
  const tableRequestIdRef = React.useRef(0)

  const loadLookupValues = React.useCallback(
    async (force = false) => {
      if (lookupLoaded && !force) return

      setLoadingLookup(true)
      try {
        const lookupResult = await fetchLookupValues()
        setLookupColors(buildLookupColorMap(lookupResult.rows))
        setLookupLoaded(true)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore sconosciuto durante il caricamento lookup"
        setError(message)
        setLookupColors({})
      } finally {
        setLoadingLookup(false)
      }
    },
    [lookupLoaded]
  )

  const loadActiveTabRows = React.useCallback(async () => {
    const requestId = tableRequestIdRef.current + 1
    tableRequestIdRef.current = requestId
    setLoadingTable(true)
    setError(null)

    try {
      const result = await fetchTabPage(activeTab, pageIndex, pageSize)
      if (requestId !== tableRequestIdRef.current) return

      const rows = toRows(result.rows)
      const total = result.total

      if (activeTab === "processi") {
        setProcesses(rows)
        setProcessesTotal(total)
        return
      }

      if (activeTab === "lavoratori") {
        setWorkers(rows)
        setWorkersTotal(total)
        return
      }

      setFamilies(rows)
      setFamiliesTotal(total)
    } catch (caughtError) {
      if (requestId !== tableRequestIdRef.current) return

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Errore sconosciuto durante il caricamento dati"
      setError(message)

      if (activeTab === "processi") {
        setProcesses([])
        setProcessesTotal(0)
        return
      }

      if (activeTab === "lavoratori") {
        setWorkers([])
        setWorkersTotal(0)
        return
      }

      setFamilies([])
      setFamiliesTotal(0)
    } finally {
      if (requestId === tableRequestIdRef.current) {
        setLoadingTable(false)
      }
    }
  }, [activeTab, pageIndex, pageSize])

  const refresh = React.useCallback(async () => {
    setError(null)
    await Promise.all([loadLookupValues(true), loadActiveTabRows()])
  }, [loadActiveTabRows, loadLookupValues])

  React.useEffect(() => {
    void loadLookupValues()
  }, [loadLookupValues])

  React.useEffect(() => {
    void loadActiveTabRows()
  }, [loadActiveTabRows])

  return {
    workers,
    families,
    processes,
    workersTotal,
    familiesTotal,
    processesTotal,
    lookupColors,
    loading: loadingLookup || loadingTable,
    error,
    refresh,
  }
}
