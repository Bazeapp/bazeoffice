import { flattenAttachmentLinks } from "@/components/shared-next/attachment-utils"

import type { PayrollBoardCardData } from "../types"
import {
  buildPresenceDayRows,
  getDaysInMonth,
  getPayrollDayRange,
  sumPresenceHours,
  toInlineDocumentUrl,
  type PresenceDayRow,
} from "./payroll-display-utils"
import { MAKE_TRANSACTION_WEBHOOK_URL } from "./payroll-overview.constants"

export type CedolinoDetailDerived = {
  famiglia: PayrollBoardCardData["famiglia"]
  pagamento: PayrollBoardCardData["pagamento"]
  transazione: PayrollBoardCardData["transazione"]
  rapporto: PayrollBoardCardData["rapporto"]
  presenceRows: PresenceDayRow[]
  lastWorkingDay: number | null
  isRegularPresence: boolean
  paymentStatus: string
  paymentAmount: number | null
  feeConcordata: number | null
  makeTransactionUrl: string | null
  contractHours: number | null
  workedHours: number | null
  hoursToPay: number | null
  applicationFee: number | null
  importoScontoMax: number
  cedolinoPreviewUrl: string | null
}

function getLastWorkingDay(
  rapporto: PayrollBoardCardData["rapporto"],
  meseInizio: string | null | undefined,
): number | null {
  const dataFine = rapporto?.data_fine_rapporto
  if (!dataFine || !meseInizio) return null
  if (dataFine.slice(0, 7) !== meseInizio.slice(0, 7)) return null
  const day = Number(dataFine.slice(8, 10))
  return Number.isFinite(day) ? day : null
}

function getIsRegularPresence(card: PayrollBoardCardData): boolean {
  const presenze = card.presenze
  if (!presenze) return !card.presenzeIrregolari
  for (let day = 1; day <= 31; day += 1) {
    const value = presenze[`evento_day_${day}`]
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return false
    }
  }
  return true
}

export function buildCedolinoDetailDerived(
  card: PayrollBoardCardData | null,
): CedolinoDetailDerived {
  const famiglia = card?.famiglia ?? null
  const pagamento = card?.pagamento ?? null
  const transazione = card?.transazione ?? null
  const rapporto = card?.rapporto ?? null
  const presenceRows = buildPresenceDayRows(
    card?.presenze ?? null,
    getDaysInMonth(card?.mese?.data_fine),
  )
  const payrollDayRange = getPayrollDayRange(card?.mese ?? null, rapporto ?? null)
  const contractHours = sumPresenceHours(card?.presenzeRegolari ?? null, payrollDayRange)
  const workedHours = sumPresenceHours(card?.presenze ?? null, payrollDayRange)
  const hoursToPay =
    contractHours === null && workedHours === null
      ? null
      : Math.max(contractHours ?? 0, workedHours ?? 0)
  const feeConcordata = card?.richiestaAttivazione?.fee_concordata ?? null
  const applicationFee =
    feeConcordata === null || hoursToPay === null ? null : feeConcordata * hoursToPay
  const paymentAmount = pagamento?.amount ?? card?.record.importo_busta_estratto ?? null
  const attachmentUrl = flattenAttachmentLinks(card?.record.cedolino, "Cedolino")[0]?.url
  const sourceUrl = attachmentUrl ?? card?.record.cedolino_url?.trim()

  return {
    famiglia,
    pagamento,
    transazione,
    rapporto,
    presenceRows,
    lastWorkingDay: getLastWorkingDay(rapporto, card?.mese?.data_inizio),
    isRegularPresence: card ? getIsRegularPresence(card) : true,
    paymentStatus: pagamento?.status ?? "Pagamento non ancora registrato",
    paymentAmount,
    feeConcordata,
    makeTransactionUrl: transazione?.id
      ? `${MAKE_TRANSACTION_WEBHOOK_URL}?recordId=${encodeURIComponent(transazione.id)}`
      : null,
    contractHours,
    workedHours,
    hoursToPay,
    applicationFee,
    importoScontoMax: (paymentAmount ?? 0) + (applicationFee ?? 0) - 2,
    cedolinoPreviewUrl: sourceUrl ? toInlineDocumentUrl(sourceUrl) : null,
  }
}
