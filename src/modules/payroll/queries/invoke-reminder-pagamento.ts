import { runTrackedEdgeFunction } from "@/lib/write-tracking"

export type InvokeReminderPagamentoResponse = {
  success?: boolean
  message?: string
  record_id?: string
  error?: string
}

/**
 * Thin wrap of `wk-reminder-pagamento` (BAZ-98/99/100 U6, R8; BAZ-179) for a
 * SINGLE `mese_lavorativo_id`. Re-sends are allowed server-side; each success
 * increments count / last-send tracking.
 *
 * The Pagamenti bulk flow goes through `cedolini-bulk-job`
 * (`kind: "reminder"`, U3/`useCedoliniBulkReminder`) instead, so
 * progress/stop is durable across refresh. This direct single-record call
 * powers per-card "Invia" / "Reinvia" on da fare and fatti.
 */
export async function invokeReminderPagamento(
  meseLavorativoId: string,
): Promise<InvokeReminderPagamentoResponse> {
  return runTrackedEdgeFunction<InvokeReminderPagamentoResponse>("wk-reminder-pagamento", {
    record_id: meseLavorativoId,
  })
}
