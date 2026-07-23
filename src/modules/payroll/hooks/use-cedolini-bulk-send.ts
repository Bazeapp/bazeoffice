import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  fetchCedoliniBulkJob,
  processCedoliniBulkJob,
  startCedoliniBulkJob,
  stopCedoliniBulkJob,
} from "../queries/cedolini-bulk-job"
import {
  deriveBulkSendPhase,
  getBulkJobProgressPercent,
  getBulkSendRemainingCount,
  type CedolinoBulkSendPhase,
} from "../lib/cedolini-bulk-send"
import type {
  CedolinoBulkJobDryRunOutcome,
  CedolinoBulkJobRecord,
} from "../types/cedolino-bulk-job"

/**
 * Polling cadence while the job is `in_corso` (KTD11 — no default
 * `refetchInterval` on the app `QueryClient`).
 */
const BULK_JOB_POLL_INTERVAL_MS = 2000

export type UseCedoliniBulkSendState = {
  phase: CedolinoBulkSendPhase
  job: CedolinoBulkJobRecord | null
  dryRunOutcome: CedolinoBulkJobDryRunOutcome | null
  remainingCount: number
  progressPercent: number
  isStartingDryRun: boolean
  isConfirming: boolean
  isStopping: boolean
  error: string | null
  startDryRun: (meseLavorativoIds: string[], yearMonth?: string) => Promise<void>
  confirmSend: () => Promise<void>
  stop: () => Promise<void>
  reset: () => void
}

/**
 * Drives the Controlli bulk-send flow (BAZ-98/99/100 U5, R4/AE2-AE4):
 * dry-run one record → operator confirms → sequential (server self-chained)
 * → stoppable. All state is derived; `phase` is a pure function of
 * `{ isStartingDryRun, jobId, dryRunOutcome, job.status }` (no `useEffect`
 * syncing state → state — see `lib/cedolini-bulk-send.ts`).
 */
export function useCedoliniBulkSend(): UseCedoliniBulkSendState {
  const queryClient = useQueryClient()

  const [jobId, setJobId] = React.useState<string | null>(null)
  const [dryRunTotalCount, setDryRunTotalCount] = React.useState(0)
  const [dryRunOutcome, setDryRunOutcome] = React.useState<CedolinoBulkJobDryRunOutcome | null>(
    null,
  )
  const [isStartingDryRun, setIsStartingDryRun] = React.useState(false)
  const [isConfirming, setIsConfirming] = React.useState(false)
  const [isStopping, setIsStopping] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const jobQueryKey = React.useMemo(() => ["cedolino-bulk-job", jobId] as const, [jobId])

  const { data: job } = useQuery({
    queryKey: jobQueryKey,
    queryFn: () => fetchCedoliniBulkJob(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data?.status === "in_corso" ? BULK_JOB_POLL_INTERVAL_MS : false,
  })

  const startDryRun = React.useCallback(
    async (meseLavorativoIds: string[], yearMonth?: string) => {
      if (meseLavorativoIds.length === 0 || isStartingDryRun) return
      setIsStartingDryRun(true)
      setError(null)
      try {
        const response = await startCedoliniBulkJob({
          kind: "send",
          meseLavorativoIds,
          yearMonth,
          dryRunFirst: true,
        })
        setJobId(response.job_id)
        setDryRunTotalCount(response.total_count)
        setDryRunOutcome(response.dry_run ?? null)
        await queryClient.invalidateQueries({ queryKey: ["cedolino-bulk-job", response.job_id] })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore avvio invio di prova.")
      } finally {
        setIsStartingDryRun(false)
      }
    },
    [isStartingDryRun, queryClient],
  )

  const confirmSend = React.useCallback(async () => {
    if (!jobId || isConfirming) return
    setIsConfirming(true)
    setError(null)
    try {
      await processCedoliniBulkJob(jobId)
      await queryClient.invalidateQueries({ queryKey: jobQueryKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore avvio invio.")
    } finally {
      setIsConfirming(false)
    }
  }, [jobId, isConfirming, queryClient, jobQueryKey])

  const stop = React.useCallback(async () => {
    if (!jobId || isStopping) return
    setIsStopping(true)
    setError(null)
    try {
      await stopCedoliniBulkJob(jobId)
      await queryClient.invalidateQueries({ queryKey: jobQueryKey })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore arresto invio.")
    } finally {
      setIsStopping(false)
    }
  }, [jobId, isStopping, queryClient, jobQueryKey])

  const reset = React.useCallback(() => {
    setJobId(null)
    setDryRunTotalCount(0)
    setDryRunOutcome(null)
    setError(null)
  }, [])

  const phase = deriveBulkSendPhase({
    isStartingDryRun,
    jobId,
    dryRunOutcome,
    jobStatus: job?.status ?? null,
  })

  return {
    phase,
    job: job ?? null,
    dryRunOutcome,
    remainingCount: getBulkSendRemainingCount({ totalCount: dryRunTotalCount, job: job ?? null }),
    progressPercent: getBulkJobProgressPercent(job ?? null),
    isStartingDryRun,
    isConfirming,
    isStopping,
    error,
    startDryRun,
    confirmSend,
    stop,
    reset,
  }
}
