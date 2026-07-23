import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchCedoliniBulkJob, startCedoliniBulkJob } from "../queries/cedolini-bulk-job"
import { recoverCedolinoUrl } from "../queries/cedolini-recover-url"
import { cedoliniCheckRunQueryKey } from "./use-cedolini-check-run"
import type { CedolinoBulkJobRecord } from "../types/cedolino-bulk-job"

/** Polling cadence while a bulk recovery job is `in_corso` (KTD11). */
const RECOVER_BULK_JOB_POLL_INTERVAL_MS = 2000

export type UseCedoliniRecoverUrlState = {
  recoverSingle: (meseLavorativoId: string) => Promise<void>
  recoveringSingleId: string | null
  singleError: string | null

  recoverBulk: (meseLavorativoIds: string[], yearMonth?: string) => Promise<void>
  bulkJob: CedolinoBulkJobRecord | null
  isBulkRecovering: boolean
  bulkError: string | null
}

/**
 * Recovery `cedolino_url` (BAZ-98/99/100 U5, R6/AE7). Per-card recovery
 * calls the single `cedolini-recover-url` endpoint directly; bulk recovery
 * (the "Cedolino o PDF" group header action) runs it as a
 * `cedolino_bulk_jobs` (`kind: "recover_url"`) job so progress/count is
 * durable across refresh, same as bulk send.
 *
 * Both paths invalidate the Controlli check-run query on success so a
 * recovered/rechecked card can move from Warning to Pronti without a full
 * page reload (the edge function already performs the recheck server-side
 * and writes the new `cedolino_check_results` row — the FE only needs to
 * refetch).
 */
export function useCedoliniRecoverUrl(selectedMonth: string): UseCedoliniRecoverUrlState {
  const queryClient = useQueryClient()

  const [recoveringSingleId, setRecoveringSingleId] = React.useState<string | null>(null)
  const [singleError, setSingleError] = React.useState<string | null>(null)

  const [bulkJobId, setBulkJobId] = React.useState<string | null>(null)
  const [isStartingBulk, setIsStartingBulk] = React.useState(false)
  const [bulkError, setBulkError] = React.useState<string | null>(null)

  const bulkJobQueryKey = React.useMemo(
    () => ["cedolino-bulk-job", bulkJobId] as const,
    [bulkJobId],
  )

  const { data: bulkJob } = useQuery({
    queryKey: bulkJobQueryKey,
    queryFn: () => fetchCedoliniBulkJob(bulkJobId as string),
    enabled: Boolean(bulkJobId),
    refetchInterval: (query) =>
      query.state.data?.status === "in_corso" ? RECOVER_BULK_JOB_POLL_INTERVAL_MS : false,
  })

  const invalidateCheckRun = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: cedoliniCheckRunQueryKey(selectedMonth) }),
    [queryClient, selectedMonth],
  )

  const recoverSingle = React.useCallback(
    async (meseLavorativoId: string) => {
      if (recoveringSingleId) return
      setRecoveringSingleId(meseLavorativoId)
      setSingleError(null)
      try {
        const result = await recoverCedolinoUrl(meseLavorativoId)
        if (!result.recovered) {
          setSingleError(result.message ?? "Recupero URL non riuscito.")
          return
        }
        await invalidateCheckRun()
      } catch (err) {
        setSingleError(err instanceof Error ? err.message : "Errore recupero URL.")
      } finally {
        setRecoveringSingleId(null)
      }
    },
    [recoveringSingleId, invalidateCheckRun],
  )

  const recoverBulk = React.useCallback(
    async (meseLavorativoIds: string[], yearMonth?: string) => {
      if (meseLavorativoIds.length === 0 || isStartingBulk) return
      setIsStartingBulk(true)
      setBulkError(null)
      try {
        const response = await startCedoliniBulkJob({
          kind: "recover_url",
          meseLavorativoIds,
          yearMonth,
          dryRunFirst: false,
        })
        setBulkJobId(response.job_id)
        await queryClient.invalidateQueries({ queryKey: ["cedolino-bulk-job", response.job_id] })
      } catch (err) {
        setBulkError(err instanceof Error ? err.message : "Errore avvio recupero URL.")
      } finally {
        setIsStartingBulk(false)
      }
    },
    [isStartingBulk, queryClient],
  )

  const bulkJobStatus = bulkJob?.status ?? null
  const previousBulkJobStatusRef = React.useRef<typeof bulkJobStatus>(null)
  React.useEffect(() => {
    const wasRunning = previousBulkJobStatusRef.current === "in_corso"
    const isNowTerminal = bulkJobStatus === "completata" || bulkJobStatus === "interrotta"
    if (wasRunning && isNowTerminal) {
      void invalidateCheckRun()
    }
    previousBulkJobStatusRef.current = bulkJobStatus
  }, [bulkJobStatus, invalidateCheckRun])

  return {
    recoverSingle,
    recoveringSingleId,
    singleError,
    recoverBulk,
    bulkJob: bulkJob ?? null,
    isBulkRecovering: isStartingBulk || bulkJobStatus === "in_corso",
    bulkError,
  }
}
