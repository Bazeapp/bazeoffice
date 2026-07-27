import { runTrackedEdgeFunction } from "@/lib/write-tracking"

export type InvokeReminderPagamentoResponse = {
  success?: boolean
  message?: string
  record_id?: string
  error?: string
}

/**
 * Thin wrap of `wk-reminder-pagamento` (BAZ-98/99/100 U6, R8 — the function
 * itself is NOT modified) for a SINGLE `mese_lavorativo_id`.
 *
 * The Pagamenti bulk flow goes through `cedolini-bulk-job`
 * (`kind: "reminder"`, U3/`useCedoliniBulkReminder`) instead, so
 * progress/stop is durable across refresh. This direct single-record call
 * powers the per-card "Invia" action in the Reminder da fare column — an
 * operator can nudge one family without running (or waiting for) a whole
 * bulk job.
 */
export async function invokeReminderPagamento(
  meseLavorativoId: string,
): Promise<InvokeReminderPagamentoResponse> {
  return runTrackedEdgeFunction<InvokeReminderPagamentoResponse>("wk-reminder-pagamento", {
    record_id: meseLavorativoId,
  })
}
