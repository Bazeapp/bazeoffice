import { hasAttachmentValue } from "@/components/shared-next/attachment-utils"
import { formatItalianCurrency } from "@/lib/format-utils"
import { buildFamilyPresenzeUrl } from "@/lib/private-area-url"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import {
  getRapportoFamilyLabel,
  getRapportoStatusColor,
  getRapportoTitle,
  getRapportoWorkerLabel,
  resolveRapportoStatus,
} from "@/modules/rapporti/lib"
import type {
  ContributoInpsBoardCardData,
  PayrollBoardCardData,
  PayrollBoardColumnData,
} from "@/modules/payroll/types"
import type { ContributiColumnData } from "@/modules/payroll/components"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  FamigliaRecord,
  LavoratoreRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
  TransazioneFinanziariaRecord,
} from "@/types"

import {
  CONTRIBUTI_STAGE_OPTIONS,
  PAYROLL_STAGE_OPTIONS,
} from "./rapporto-detail-panel.constants"
import {
  firstAvailableText,
  formatRapportoDetailDate,
  getContributoTitle,
  getMonthLabel,
  getPresenceSummary,
  normalizeToken,
  resolveContributoStage,
} from "./rapporto-detail-panel.utils"

export type RapportoDetailHeaderView = {
  relationshipTitle: string
  familyEmail: string | null
  startDateLabel: string
  rapportoStatus: string
  statoRapportoColor: string
}

export type CedolinoListRow = {
  id: string
  title: string
  subtitle: string
  rightBadge?: string
  ratingValue: number
  feedbackText: string | null
  importoLabel: string
}

export type RapportoDetailGestioneView = {
  familyName: string
  workerName: string
  familyEmail: string | null
  familyPhone: string | null
  workerEmail: string | null
  workerPhone: string | null
  workerIban: string | null
  workerStripeId: string | null
  delegaInpsValue: unknown
  hasAccordoDiLavoro: boolean
  hasRicevutaInps: boolean
  hasDelegaInps: boolean
}

export function resolveLinkedProcesso(
  processi: ProcessoMatchingRecord[],
  richiesteAttivazione: RichiestaAttivazioneRecord[],
) {
  const currentProcesso =
    processi.find((processo) =>
      richiesteAttivazione.some((richiesta) => richiesta.processo_res_id === processo.id),
    ) ??
    processi[0] ??
    null

  const richiestaAttivazione =
    (currentProcesso
      ? richiesteAttivazione.find(
          (richiesta) => richiesta.processo_res_id === currentProcesso.id,
        )
      : null) ??
    richiesteAttivazione[0] ??
    null

  return { currentProcesso, richiestaAttivazione }
}

export function buildRapportoDetailHeaderView({
  rapportoView,
  famiglia,
  lavoratore,
  assunzioneNames,
  chiusure,
  lookupColorsByDomain,
}: {
  rapportoView: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzioneNames?: RapportoAssunzioneNames | null
  chiusure: ChiusuraContrattoRecord[]
  lookupColorsByDomain: Map<string, string>
}): RapportoDetailHeaderView {
  const startDateLabel = formatRapportoDetailDate(rapportoView.data_inizio_rapporto)
  const rapportoStatus = resolveRapportoStatus(
    rapportoView,
    chiusure[0]?.data_fine_rapporto ?? rapportoView.data_fine_rapporto,
  )
  const statoRapportoColor =
    lookupColorsByDomain.get(
      `rapporti_lavorativi.stato_rapporto:${normalizeToken(rapportoStatus)}`,
    ) ?? getRapportoStatusColor(rapportoStatus)

  return {
    relationshipTitle: getRapportoTitle(rapportoView, {
      famiglia,
      lavoratore,
      assunzioneDatore: assunzioneNames?.datore,
      assunzioneLavoratore: assunzioneNames?.lavoratore,
    }),
    familyEmail: famiglia?.email ?? null,
    startDateLabel,
    rapportoStatus,
    statoRapportoColor,
  }
}

export function buildRapportoDetailGestioneView({
  rapportoView,
  famiglia,
  lavoratore,
  assunzioneNames,
}: {
  rapportoView: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  assunzioneNames?: RapportoAssunzioneNames | null
}): RapportoDetailGestioneView {
  const rapportoMetadata =
    rapportoView.metadati_migrazione && typeof rapportoView.metadati_migrazione === "object"
      ? rapportoView.metadati_migrazione
      : {}
  const delegaInpsValue =
    typeof rapportoMetadata === "object" && rapportoMetadata
      ? (rapportoMetadata as Record<string, unknown>).delega_inps_allegati ?? null
      : null

  return {
    familyName: getRapportoFamilyLabel(rapportoView, famiglia, assunzioneNames?.datore),
    workerName: getRapportoWorkerLabel(rapportoView, lavoratore, assunzioneNames?.lavoratore),
    familyEmail: firstAvailableText(
      famiglia?.email,
      famiglia?.customer_email,
      famiglia?.secondary_email,
    ),
    familyPhone: firstAvailableText(famiglia?.telefono, famiglia?.whatsapp),
    workerEmail: firstAvailableText(lavoratore?.email),
    workerPhone: firstAvailableText(lavoratore?.telefono),
    workerIban: firstAvailableText(lavoratore?.iban),
    workerStripeId: firstAvailableText(lavoratore?.id_stripe_account),
    delegaInpsValue,
    hasAccordoDiLavoro: hasAttachmentValue(rapportoView.accordo_di_lavoro_allegati),
    hasRicevutaInps: hasAttachmentValue(rapportoView.ricevuta_inps_allegati),
    hasDelegaInps: hasAttachmentValue(delegaInpsValue),
  }
}

function buildTransazioniByMeseId(transazioni: TransazioneFinanziariaRecord[]) {
  const transazioniByMeseId = new Map<string, TransazioneFinanziariaRecord>()
  for (const item of transazioni) {
    if (!item.mese_lavorativo_id) continue
    if (!transazioniByMeseId.has(item.mese_lavorativo_id)) {
      transazioniByMeseId.set(item.mese_lavorativo_id, item)
    }
  }
  return transazioniByMeseId
}

function buildPagamentoByTransazioneId(pagamenti: PagamentoRecord[]) {
  const pagamentoByTransazioneId = new Map<string, PagamentoRecord>()
  for (const item of pagamenti) {
    if (!item.transazione_id) continue
    if (!pagamentoByTransazioneId.has(item.transazione_id)) {
      pagamentoByTransazioneId.set(item.transazione_id, item)
    }
  }
  return pagamentoByTransazioneId
}

export function buildCedolinoBoardData({
  mesi,
  mesiCalendario,
  pagamenti,
  transazioni,
  presenze,
  rapportoView,
  famiglia,
  richiestaAttivazione,
}: {
  mesi: MeseLavoratoRecord[]
  mesiCalendario: MeseCalendarioRecord[]
  pagamenti: PagamentoRecord[]
  transazioni: TransazioneFinanziariaRecord[]
  presenze: PresenzaMensileRecord[]
  rapportoView: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
}) {
  const meseCalendarioById = new Map(mesiCalendario.map((item) => [item.id, item]))
  const presenzeById = new Map(presenze.map((item) => [item.id, item]))
  const transazioniByMeseId = buildTransazioniByMeseId(transazioni)
  const pagamentoByTransazioneId = buildPagamentoByTransazioneId(pagamenti)

  const getPagamentoForMese = (meseLavoratoId: string) => {
    const transazione = transazioniByMeseId.get(meseLavoratoId)
    return transazione ? pagamentoByTransazioneId.get(transazione.id) ?? null : null
  }

  const sortedMesi = [...mesi].sort((left, right) => {
    const leftDate =
      (left.mese_id ? meseCalendarioById.get(left.mese_id)?.data_inizio : null) ??
      left.creato_il ??
      ""
    const rightDate =
      (right.mese_id ? meseCalendarioById.get(right.mese_id)?.data_inizio : null) ??
      right.creato_il ??
      ""
    return rightDate.localeCompare(leftDate)
  })

  const cedolinoCards = sortedMesi.map((mese) => {
    const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
    const pagamento = getPagamentoForMese(mese.id)
    const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null
    const presenzeRegolari = mese.presenze_regolare_id
      ? presenzeById.get(mese.presenze_regolare_id) ?? null
      : null
    const nomeCompleto =
      [rapportoView.cognome_nome_datore_proper, rapportoView.nome_lavoratore_per_url]
        .filter(Boolean)
        .join(" – ")
        .trim() || "Rapporto non disponibile"

    return {
      id: mese.id,
      stage: mese.stato_mese_lavorativo ?? "TODO",
      record: mese,
      famiglia,
      pagamento,
      transazione: transazioniByMeseId.get(mese.id) ?? null,
      presenze: presenzeMese,
      presenzeRegolari,
      rapporto: rapportoView,
      mese: meseCalendario,
      richiestaAttivazione: richiestaAttivazione
        ? { id: richiestaAttivazione.id, fee_concordata: richiestaAttivazione.fee_concordata ?? null }
        : null,
      presenzeIrregolari: (() => {
        if (!presenzeMese) return false
        for (let day = 1; day <= 31; day += 1) {
          const value = (presenzeMese as Record<string, unknown>)[`evento_day_${day}`]
          if (value !== null && value !== undefined && String(value).trim() !== "") return true
        }
        return false
      })(),
      nomeCompleto,
      importoLabel:
        typeof mese.importo_busta_estratto === "number"
          ? formatItalianCurrency(mese.importo_busta_estratto)
          : null,
      dataInvioLabel: mese.data_invio_famiglia
        ? formatRapportoDetailDate(mese.data_invio_famiglia)
        : null,
    } satisfies PayrollBoardCardData
  })

  const cedolinoColumns: PayrollBoardColumnData[] = PAYROLL_STAGE_OPTIONS.map((stage) => ({
    id: stage,
    label: stage,
    color: "sky",
    cards: cedolinoCards.filter((card) => card.stage === stage),
  }))

  const cedolinoRows: CedolinoListRow[] = sortedMesi.map((mese) => {
    const meseCalendario = mese.mese_id ? meseCalendarioById.get(mese.mese_id) ?? null : null
    const pagamento = getPagamentoForMese(mese.id)
    const presenzeMese = mese.presenze_id ? presenzeById.get(mese.presenze_id) ?? null : null
    const ratingValue =
      typeof mese.rating_feedback_famiglia === "number" && mese.rating_feedback_famiglia > 0
        ? Math.max(0, Math.min(5, Math.round(mese.rating_feedback_famiglia)))
        : 0

    return {
      id: mese.id,
      title: getMonthLabel(mese, meseCalendario),
      subtitle: [
        mese.stato_mese_lavorativo ?? "Stato non disponibile",
        getPresenceSummary(presenzeMese),
        pagamento?.status ? `Pagamento ${pagamento.status}` : null,
      ]
        .filter(Boolean)
        .join(" • "),
      rightBadge: mese.stato_mese_lavorativo ?? undefined,
      ratingValue,
      feedbackText: mese.testo_feedback_famiglia ?? null,
      importoLabel:
        typeof mese.importo_busta_estratto === "number"
          ? formatItalianCurrency(mese.importo_busta_estratto)
          : "-",
    }
  })

  return { cedolinoCards, cedolinoColumns, cedolinoRows }
}

export function buildContributoBoardData({
  contributi,
  rapportoView,
  familyName,
  workerName,
  relationshipTitle,
}: {
  contributi: ContributoInpsRecord[]
  rapportoView: RapportoLavorativoRecord
  familyName: string
  workerName: string
  relationshipTitle: string
}) {
  const contributoCards: ContributoInpsBoardCardData[] = contributi.map((contributo) => {
    const stage = resolveContributoStage(contributo.stato_contributi_inps)

    return {
      id: contributo.id,
      stage,
      record: contributo,
      rapporto: rapportoView,
      trimestre: null,
      nomeFamiglia: familyName,
      nomeLavoratore: workerName,
      nomeCompleto: relationshipTitle,
      trimestreLabel: getContributoTitle(contributo),
      importoLabel:
        typeof contributo.importo_contributi_inps === "number"
          ? formatItalianCurrency(contributo.importo_contributi_inps)
          : null,
      pagopaLabel:
        typeof contributo.valore_pagopa === "number"
          ? formatItalianCurrency(contributo.valore_pagopa)
          : null,
    } satisfies ContributoInpsBoardCardData
  })

  const contributoColumns: ContributiColumnData[] = CONTRIBUTI_STAGE_OPTIONS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: contributoCards.filter((card) => card.stage === stage.id),
  }))

  return { contributoCards, contributoColumns }
}

export function buildPresenzeUrl(famiglia: FamigliaRecord | null) {
  return buildFamilyPresenzeUrl(famiglia?.email, famiglia?.id)
}
