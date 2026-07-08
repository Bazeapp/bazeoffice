import type { PayrollBoardCardData } from "../types"

/**
 * Stages that cannot be set manually (drop/select). "DONE" used to live here
 * because it's normally written by the `wk-conferma-pagamento-cedolino` edge
 * function after the payment-confirmation message is sent; per richiesta
 * operativa lo spostamento manuale in DONE è ora consentito, quindi il set è
 * vuoto. NB: spostare a mano in DONE NON invia la conferma di pagamento.
 * Per ri-bloccarlo, reinserire "DONE" qui.
 */
export const TERMINAL_STAGE_IDS = new Set<string>([])

export const PRESERVED_DETAIL_FIELDS: ReadonlyArray<keyof PayrollBoardCardData> = [
  "presenze",
  "presenzeRegolari",
]

export function preserveDetailFields(
  card: PayrollBoardCardData,
  previousCard: PayrollBoardCardData | undefined,
): PayrollBoardCardData {
  if (!previousCard) return card
  const merged: PayrollBoardCardData = { ...card }
  for (const field of PRESERVED_DETAIL_FIELDS) {
    if (merged[field] == null && previousCard[field] != null) {
      ;(merged as Record<string, unknown>)[field] = previousCard[field]
    }
  }
  return merged
}
