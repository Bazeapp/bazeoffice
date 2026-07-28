import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { parseEdgeFunctionErrorBody } from "../lib/cedolini-edge-function-error"
import { getPagamentiCandidateCards, splitPagamentiCardsByReminderStatus } from "../lib/cedolini-pagamenti-filters"
import { fetchCedoliniPagamentiReminderFlags } from "../queries/fetch-cedolini-pagamenti"
import { invokeReminderPagamento } from "../queries/invoke-reminder-pagamento"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"

export function cedoliniPagamentiReminderFlagsQueryKey(candidateIds: string[]) {
  return ["cedolini-pagamenti-reminder-flags", candidateIds] as const
}

export type UseCedoliniPagamentiState = {
  /** "Inviato cedolino" + transazione, NOT yet reminded — before any date filter (R7). */
  daFare: PayrollBoardCardData[]
  /** "Inviato cedolino" + transazione, `check_reminder_pagamento_inviato: true` (R7). */
  fatti: PayrollBoardCardData[]
  isLoading: boolean
  error: string | null
  /** Refreshes the reminder flags after a bulk job or a single send lands. */
  refetch: () => Promise<void>
  sendSingleReminder: (meseLavorativoId: string) => Promise<void>
  sendingSingleId: string | null
  singleError: string | null
}

/**
 * Pagamenti data (BAZ-98/99/100 U6, R7): derives "Inviato cedolino" rows
 * with a linked `transazione` from the SAME board columns Controlli already
 * receives (`usePayrollBoard` via the parent view) — no extra board fetch —
 * then enriches just those candidate ids with
 * `check_reminder_pagamento_inviato` (not returned by the `cedolini_board`
 * RPC) via a dedicated lightweight fetch, and splits into Reminder da fare
 * / fatti.
 */
export function useCedoliniPagamenti(columns: PayrollBoardColumnData[]): UseCedoliniPagamentiState {
  const queryClient = useQueryClient()

  const candidateCards = React.useMemo(() => getPagamentiCandidateCards(columns), [columns])
  const candidateIds = React.useMemo(
    () => [...candidateCards.map((card) => card.id)].sort(),
    [candidateCards],
  )
  const queryKey = React.useMemo(
    () => cedoliniPagamentiReminderFlagsQueryKey(candidateIds),
    [candidateIds],
  )

  const {
    data: reminderFlagRows,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCedoliniPagamentiReminderFlags(candidateIds),
    enabled: candidateIds.length > 0,
  })

  const reminderFlags = React.useMemo(() => {
    const map = new Map<string, boolean>()
    for (const row of reminderFlagRows ?? []) {
      map.set(row.id, row.check_reminder_pagamento_inviato === true)
    }
    return map
  }, [reminderFlagRows])

  const { daFare, fatti } = React.useMemo(
    () => splitPagamentiCardsByReminderStatus(candidateCards, reminderFlags),
    [candidateCards, reminderFlags],
  )

  const refetch = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const [sendingSingleId, setSendingSingleId] = React.useState<string | null>(null)
  const [singleError, setSingleError] = React.useState<string | null>(null)

  const sendSingleReminder = React.useCallback(
    async (meseLavorativoId: string) => {
      if (sendingSingleId) return
      setSendingSingleId(meseLavorativoId)
      setSingleError(null)
      try {
        // `invokeEdgeFunction` throws on a non-2xx response (see
        // `wk-reminder-pagamento`'s error shape), so reaching here means
        // `{ success: true }` was returned.
        await invokeReminderPagamento(meseLavorativoId)
        await refetch()
      } catch (err) {
        const structuredMessage = parseEdgeFunctionErrorBody(err)?.error
        setSingleError(
          typeof structuredMessage === "string"
            ? structuredMessage
            : err instanceof Error
              ? err.message
              : "Errore invio reminder.",
        )
      } finally {
        setSendingSingleId(null)
      }
    },
    [sendingSingleId, refetch],
  )

  return {
    daFare,
    fatti,
    isLoading: candidateIds.length > 0 && isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    refetch,
    sendSingleReminder,
    sendingSingleId,
    singleError,
  }
}
