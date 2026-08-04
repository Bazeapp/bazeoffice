import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { formatCedoliniBulkRecoverError } from "../lib/cedolini-bulk-recover-error"
import {
  fetchCedoliniBulkJob,
  fetchCedoliniBulkJobItems,
  startCedoliniBulkJob,
} from "../queries/cedolini-bulk-job"
import { recoverCedolinoUrl } from "../queries/cedolini-recover-url"
import { cedoliniCheckRunQueryKey } from "./use-cedolini-check-run"
import type { CedolinoBulkJobRecord } from "../types/cedolino-bulk-job"

/** Polling cadence while a bulk recovery job is `in_corso` (KTD11). */
const RECOVER_BULK_JOB_POLL_INTERVAL_MS = 2000

/**
 * Keep the card's green success state visible briefly before the check-run
 * refetch can move it out of the Warning column.
 */
const RECOVER_SUCCESS_INVALIDATE_DELAY_MS = 2000

export type UseCedoliniRecoverUrlState = {
  recoverSingle: (meseLavorativoId: string) => Promise<void>
  recoveringSingleId: string | null
  singleError: string | null
  /** `mesi_lavorati.id` values that recovered successfully in this session. */
  recoveredIds: ReadonlySet<string>

  recoverBulk: (meseLavorativoIds: string[], yearMonth?: string) => Promise<void>
  bulkJob: CedolinoBulkJobRecord | null
  isBulkRecovering: boolean
  bulkError: string | null
}

function isBulkJobTerminal(status: CedolinoBulkJobRecord["status"] | null | undefined): boolean {
  return status === "completata" || status === "interrotta" || status === "failed"
}

/**
 * Recovery `cedolino_url` (BAZ-98/99/100 U5, R6/AE7). Per-card recovery
 * calls the single `cedolini-recover-url` endpoint directly (Drive share
 * link when configured, otherwise a 30-day Storage signed URL); bulk
 * recovery (the "Cedolino o PDF" group header action) runs it as a
 * `cedolino_bulk_jobs` (`kind: "recover_url"`) job so progress/count is
 * durable across refresh, same as bulk send.
 *
 * Both paths invalidate the Controlli check-run query on success so a
 * recovered/rechecked card can move from Warning to Pronti without a full
 * page reload (the edge function already performs the recheck server-side
 * and writes the new `cedolino_check_results` row — the FE only needs to
 * refetch).
 *
 * Bulk item failures (e.g. `drive_not_configured`, `storage_sign_failed`)
 * leave the job `completata` with `error_count > 0` — start itself
 * succeeds — so this hook must surface them into `bulkError` after the job
 * settles (AE7). `storage_sign_failed` messages flow through
 * `details.message` via `formatCedoliniBulkRecoverError`.
 */
export function useCedoliniRecoverUrl(selectedMonth: string): UseCedoliniRecoverUrlState {
  const queryClient = useQueryClient()

  const [recoveringSingleId, setRecoveringSingleId] = React.useState<string | null>(null)
  const [singleError, setSingleError] = React.useState<string | null>(null)
  const [recoveredIds, setRecoveredIds] = React.useState<ReadonlySet<string>>(() => new Set())

  const [bulkJobId, setBulkJobId] = React.useState<string | null>(null)
  const [isStartingBulk, setIsStartingBulk] = React.useState(false)
  const [bulkError, setBulkError] = React.useState<string | null>(null)
  const handledTerminalJobIdRef = React.useRef<string | null>(null)
  const invalidateDelayTimersRef = React.useRef<number[]>([])

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

  const scheduleCheckRunInvalidate = React.useCallback(() => {
    const timerId = window.setTimeout(() => {
      invalidateDelayTimersRef.current = invalidateDelayTimersRef.current.filter((id) => id !== timerId)
      void invalidateCheckRun()
    }, RECOVER_SUCCESS_INVALIDATE_DELAY_MS)
    invalidateDelayTimersRef.current.push(timerId)
  }, [invalidateCheckRun])

  const markRecovered = React.useCallback((meseLavorativoIds: string[]) => {
    if (meseLavorativoIds.length === 0) return
    setRecoveredIds((prev) => {
      const next = new Set(prev)
      for (const id of meseLavorativoIds) next.add(id)
      return next
    })
  }, [])

  React.useEffect(() => {
    setRecoveredIds(new Set())
    setSingleError(null)
    setBulkError(null)
    for (const timerId of invalidateDelayTimersRef.current) {
      window.clearTimeout(timerId)
    }
    invalidateDelayTimersRef.current = []
  }, [selectedMonth])

  React.useEffect(() => {
    return () => {
      for (const timerId of invalidateDelayTimersRef.current) {
        window.clearTimeout(timerId)
      }
      invalidateDelayTimersRef.current = []
    }
  }, [])

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
        markRecovered([meseLavorativoId])
        scheduleCheckRunInvalidate()
      } catch (err) {
        setSingleError(err instanceof Error ? err.message : "Errore recupero URL.")
      } finally {
        setRecoveringSingleId(null)
      }
    },
    [recoveringSingleId, markRecovered, scheduleCheckRunInvalidate],
  )

  const recoverBulk = React.useCallback(
    async (meseLavorativoIds: string[], yearMonth?: string) => {
      if (meseLavorativoIds.length === 0 || isStartingBulk) return
      setIsStartingBulk(true)
      setBulkError(null)
      handledTerminalJobIdRef.current = null
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
  React.useEffect(() => {
    if (!bulkJob || !isBulkJobTerminal(bulkJob.status)) return
    if (handledTerminalJobIdRef.current === bulkJob.id) return

    const jobId = bulkJob.id
    const errorCount = bulkJob.error_count
    const totalCount = bulkJob.total_count
    const status = bulkJob.status

    let cancelled = false
    void (async () => {
      try {
        const items = await fetchCedoliniBulkJobItems(jobId)
        if (cancelled) return

        const succeededIds = items
          .filter((item) => item.status === "success")
          .map((item) => item.mese_lavorativo_id)
        markRecovered(succeededIds)

        if (errorCount <= 0 && status !== "failed") {
          handledTerminalJobIdRef.current = jobId
          scheduleCheckRunInvalidate()
          return
        }

        setBulkError(
          formatCedoliniBulkRecoverError({ error_count: errorCount, total_count: totalCount }, items),
        )
        handledTerminalJobIdRef.current = jobId
        scheduleCheckRunInvalidate()
      } catch {
        if (cancelled) return
        if (errorCount <= 0 && status !== "failed") {
          handledTerminalJobIdRef.current = jobId
          scheduleCheckRunInvalidate()
          return
        }
        setBulkError(formatCedoliniBulkRecoverError({ error_count: errorCount, total_count: totalCount }, []))
        handledTerminalJobIdRef.current = jobId
        scheduleCheckRunInvalidate()
      }
    })()

    return () => {
      cancelled = true
    }
  }, [bulkJob, markRecovered, scheduleCheckRunInvalidate])

  return {
    recoverSingle,
    recoveringSingleId,
    singleError,
    recoveredIds,
    recoverBulk,
    bulkJob: bulkJob ?? null,
    isBulkRecovering: isStartingBulk || bulkJobStatus === "in_corso",
    bulkError,
  }
}
