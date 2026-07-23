import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchCedoliniCheckRun } from "../queries/fetch-cedolini-check-run"
import { startCedoliniCheckRun } from "../queries/start-cedolini-check-run"
import type { CedolinoCheckResultRecord, CedolinoCheckRunRecord } from "../types/cedolino-check"

/**
 * Polling cadence while a run is `in_corso` (KTD11: the app `QueryClient` has
 * NO default `refetchInterval` — this hook must set one explicitly, and only
 * while there is something to actually poll for).
 */
const CHECK_RUN_POLL_INTERVAL_MS = 2500

export type UseCedoliniCheckRunState = {
  run: CedolinoCheckRunRecord | null
  results: CedolinoCheckResultRecord[]
  isLoading: boolean
  error: string | null
  isStarting: boolean
  startError: string | null
  startMessage: string | null
  startAnalysis: () => Promise<void>
}

export function useCedoliniCheckRun(selectedMonth: string): UseCedoliniCheckRunState {
  const queryClient = useQueryClient()
  const queryKey = React.useMemo(
    () => ["cedolino-check-run", selectedMonth] as const,
    [selectedMonth],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCedoliniCheckRun(selectedMonth),
    refetchInterval: (query) =>
      query.state.data?.run?.status === "in_corso" ? CHECK_RUN_POLL_INTERVAL_MS : false,
  })

  const [isStarting, setIsStarting] = React.useState(false)
  const [startError, setStartError] = React.useState<string | null>(null)
  const [startMessage, setStartMessage] = React.useState<string | null>(null)

  const startAnalysis = React.useCallback(async () => {
    setIsStarting(true)
    setStartError(null)
    setStartMessage(null)
    try {
      const response = await startCedoliniCheckRun(selectedMonth)
      setStartMessage(response.message ?? null)
      await queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Errore avvio analisi.")
    } finally {
      setIsStarting(false)
    }
  }, [selectedMonth, queryClient, queryKey])

  return {
    run: data?.run ?? null,
    results: data?.results ?? [],
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    isStarting,
    startError,
    startMessage,
    startAnalysis,
  }
}
