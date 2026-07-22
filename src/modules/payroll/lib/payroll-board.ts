import {
  formatItalianCurrencyOrNull,
  formatItalianDateOrNull,
} from "@/lib/format-utils"
import { buildStageMetadataFromDefaults, type StageDefinition } from "@/lib/lookup-stage-metadata"
import { fetchLookupValues } from "@/lib/lookup-values"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import { getRapportoTitle } from "@/modules/rapporti/lib"
import { normalizeComparableToken } from "@/lib/value-utils"
import type { MeseLavoratoRecord, PresenzaMensileRecord } from "@/types"

import { fetchCedoliniBoard } from "../queries/fetch-cedolini-board"
import type {
  CedoliniBoardRpcRow,
  CedolinoDetailRpcResponse,
} from "../types/payroll-rpc"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"

export const PAYROLL_REALTIME_TABLES = [
  "mesi_lavorati",
  "pagamenti",
  "presenze_mensili",
  "rapporti_lavorativi",
  "famiglie",
  "transazioni_finanziarie",
  "mesi_calendario",
] as const

export const PAYROLL_DEFAULT_STAGE_DEFINITIONS: StageDefinition[] = [
  { id: "TODO", label: "TODO", color: "sky" },
  { id: "Inviate richiesta presenze", label: "Inviate richiesta presenze", color: "sky" },
  { id: "Follow up richiesta presenze", label: "Follow up richiesta presenze", color: "cyan" },
  { id: "Followup fatti", label: "Followup fatti", color: "blue" },
  { id: "Problema in comunicazione presenze", label: "Problema in comunicazione presenze", color: "orange" },
  { id: "Ricezione presenze", label: "Ricezione presenze", color: "amber" },
  { id: "Cedolino da controllare", label: "Cedolino da controllare", color: "yellow" },
  { id: "Cedolino Pronto", label: "Cedolino Pronto", color: "lime" },
  { id: "Inviato cedolino", label: "Inviato cedolino", color: "green" },
  { id: "Richiesta chiarimenti", label: "Richiesta chiarimenti", color: "orange" },
  { id: "Pagato", label: "Pagato", color: "green" },
  { id: "DONE", label: "DONE", color: "emerald" },
]

// `done` is intentionally NOT aliased to "Pagato": "DONE" is a DISTINCT,
// terminal stage written by the `wk-conferma-pagamento-cedolino` edge function
// AFTER the payment-confirmation email/WhatsApp have been sent. Collapsing it
// onto "Pagato" (as before) hid whether the confirmation actually went out.
export const PAYROLL_LEGACY_STAGE_ALIASES: Record<string, string> = {
  "cedolino pronto saf acli": "Cedolino Pronto",
}

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

export function mapCedoliniBoardRowToCard(
  row: CedoliniBoardRpcRow,
  options: {
    stage: string
    assunzioneNames: RapportoAssunzioneNames | null
    previousCard?: PayrollBoardCardData
  },
): PayrollBoardCardData {
  const { stage, assunzioneNames, previousCard } = options
  const record = row.record
  const rapporto = row.rapporto ?? null
  const famiglia = row.famiglia ?? null
  const lavoratore = row.lavoratore ?? null

  const nomeCompleto = rapporto
    ? getRapportoTitle(rapporto, {
        famiglia,
        lavoratore,
        assunzioneDatore: assunzioneNames?.datore,
        assunzioneLavoratore: assunzioneNames?.lavoratore,
      })
    : "Rapporto non disponibile"

  const freshCard: PayrollBoardCardData = {
    id: record.id,
    stage,
    record,
    famiglia,
    pagamento: row.pagamento ?? null,
    transazione: row.transazione ?? null,
    presenze: null,
    presenzeRegolari: null,
    rapporto,
    mese: row.mese ?? null,
    richiestaAttivazione: row.richiestaAttivazione ?? null,
    presenzeIrregolari: Boolean(row.presenzeIrregolari),
    nomeCompleto,
    importoLabel: formatItalianCurrencyOrNull(record.importo_busta_estratto, {
      minimumFractionDigits: 0,
    }),
    dataInvioLabel: formatItalianDateOrNull(record.data_invio_famiglia),
  }

  return preserveDetailFields(freshCard, previousCard)
}

/**
 * Build a board card from `cedolino_detail` so deep links can open a sheet even
 * when the record is outside the currently selected month board.
 */
export function mapCedolinoDetailToCard(
  detail: CedolinoDetailRpcResponse,
  options?: {
    rapporto?: PayrollBoardCardData["rapporto"]
  },
): PayrollBoardCardData {
  const record = detail.record
  const rapporto = options?.rapporto ?? detail.rapporto ?? null
  const famiglia = detail.famiglia ?? null
  const stage = record.stato_mese_lavorativo?.trim() || "TODO"

  return {
    id: record.id,
    stage,
    record,
    famiglia,
    pagamento: null,
    transazione: null,
    presenze: detail.presenze ?? null,
    presenzeRegolari: detail.presenzeRegolari ?? null,
    rapporto,
    mese: detail.mese ?? null,
    richiestaAttivazione: detail.richiestaAttivazione ?? null,
    presenzeIrregolari: false,
    nomeCompleto: rapporto
      ? getRapportoTitle(rapporto, { famiglia })
      : "Rapporto non disponibile",
    importoLabel: formatItalianCurrencyOrNull(record.importo_busta_estratto, {
      minimumFractionDigits: 0,
    }),
    dataInvioLabel: formatItalianDateOrNull(record.data_invio_famiglia),
  }
}

export function applyPayrollCardPatch(
  card: PayrollBoardCardData,
  patch: Partial<MeseLavoratoRecord>,
): PayrollBoardCardData {
  return {
    ...card,
    stage:
      typeof patch.stato_mese_lavorativo === "string"
        ? patch.stato_mese_lavorativo
        : card.stage,
    record: { ...card.record, ...patch },
    importoLabel:
      typeof patch.importo_busta_estratto === "number"
        ? formatItalianCurrencyOrNull(patch.importo_busta_estratto, {
            minimumFractionDigits: 0,
          })
        : card.importoLabel,
    dataInvioLabel:
      typeof patch.data_invio_famiglia === "string"
        ? formatItalianDateOrNull(patch.data_invio_famiglia)
        : card.dataInvioLabel,
  }
}

export function applyPayrollPresencePatch(
  card: PayrollBoardCardData,
  presenceId: string,
  patch: Partial<PresenzaMensileRecord>,
): PayrollBoardCardData {
  if (card.presenze?.id !== presenceId) return card
  return { ...card, presenze: { ...card.presenze, ...patch } }
}

export async function fetchPayrollBoardData(
  selectedMonth: string,
  getPreviousCard?: (cardId: string) => PayrollBoardCardData | undefined,
): Promise<PayrollBoardColumnData[]> {
  const [lookupResult, boardResult] = await Promise.all([
    fetchLookupValues(),
    fetchCedoliniBoard(selectedMonth),
  ])

  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    boardResult.rows
      .map((row) => row.rapporto?.id)
      .filter((id): id is string => Boolean(id)),
  )

  const stageMetadata = buildStageMetadataFromDefaults({
    defaultStages: PAYROLL_DEFAULT_STAGE_DEFINITIONS,
    lookupRows: lookupResult.rows,
    entityTable: "mesi_lavorati",
    entityField: "stato_mese_lavorativo",
    legacyAliases: PAYROLL_LEGACY_STAGE_ALIASES,
  })
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, PayrollBoardCardData[]>(
    stages.map((stage) => [stage.id, []]),
  )

  for (const row of boardResult.rows) {
    const record = row.record
    if (!record) continue

    const stage = aliases.get(normalizeComparableToken(record.stato_mese_lavorativo))
    if (!stage) continue

    const rapporto = row.rapporto ?? null
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null

    const card = mapCedoliniBoardRowToCard(row, {
      stage,
      assunzioneNames,
      previousCard: getPreviousCard?.(record.id),
    })

    cardsByStage.get(stage)?.push(card)
  }

  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))
}
