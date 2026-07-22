import { normalizeAttachmentArray } from "@/lib/attachments"
import { formatItalianCurrencyFromMinorUnitsOrNull } from "@/lib/format-utils"
import { fetchLookupValues } from "@/lib/lookup-values"
import {
  getIndexedRecordByTicketId,
  indexRecordsById,
  indexRecordsByTicketId,
  normalizeComparableToken,
  readLookupColor,
  readLookupSortOrder,
  toStringValue,
  type RecordTicketIndex,
} from "@/lib/value-utils"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import type { AssunzioneRecord } from "@/modules/gestione-contrattuale/types"
import { type RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import {
  formatAssunzioneName,
  formatPersonName,
  getRapportoFamilyLabel,
  getRapportoTitle,
  getRapportoWorkerLabel,
  resolveRapportoStatus,
} from "@/modules/rapporti/lib"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  LookupValueRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  RapportoLavorativoRecord,
  TicketRecord,
  VariazioneContrattualeRecord,
} from "@/types"

import { fetchSupportTicketsBundle } from "../queries/fetch-support-tickets-bundle"
import type { SupportTicketBoardCardData, SupportTicketLinkedRecord } from "../types"
import {
  SUPPORT_TICKET_STATUSES,
  getSupportTicketMetadata,
  inferSupportTicketTag,
  normalizeSupportTicketType,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketStatusDefinition,
  type SupportTicketType,
} from "./support-ticket-config"

type SupportTicketStageMetadata = {
  definitions: SupportTicketStatusDefinition[]
  aliases: Map<string, string>
}

type PersonNameInput = { cognome?: string | null; nome?: string | null }

export type SupportTicketsRapportoIndex = ReturnType<typeof buildSupportTicketsRapportoIndex>

export type SupportTicketsLinkedRecordIndexes = {
  assunzioni: Map<string, AssunzioneRecord>
  cedolini: RecordTicketIndex<MeseLavoratoRecord>
  chiusure: RecordTicketIndex<ChiusuraContrattoRecord>
  contributi: RecordTicketIndex<ContributoInpsRecord>
  pagamenti: RecordTicketIndex<PagamentoRecord>
  presenze: RecordTicketIndex<PresenzaMensileRecord>
  variazioni: RecordTicketIndex<VariazioneContrattualeRecord>
}

export type SupportTicketsBoardData = {
  stages: SupportTicketStatusDefinition[]
  cards: SupportTicketBoardCardData[]
  activeRapportiCount: number
  rapportoOptions: Array<{ id: string; label: string }>
  rapportoIndex: SupportTicketsRapportoIndex
  chiusuraIndex: Map<string, ChiusuraContrattoRecord>
  linkedRecordIndexes: SupportTicketsLinkedRecordIndexes
  stageAliases: Map<string, string>
}

/** Date-only ticket labels; returns the raw value when parsing fails (legacy board behavior). */
function formatTicketDateLabel(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function formatOptionalTicketDateLabel(value: string | null | undefined) {
  if (!value) return null
  return formatTicketDateLabel(value)
}

function buildSupportTicketStageMetadata(
  rows: LookupValueRecord[],
  ticketRows: TicketRecord[],
): SupportTicketStageMetadata {
  const aliases = new Map<string, string>()
  const definitionsById = new Map<
    string,
    SupportTicketStatusDefinition & { sortOrder: number | null }
  >()

  const lookupRows = rows.filter(
    (row) => row.is_active && row.entity_table === "ticket" && row.entity_field === "stato",
  )

  for (const stage of SUPPORT_TICKET_STATUSES) {
    aliases.set(normalizeComparableToken(stage.id), stage.id)
    aliases.set(normalizeComparableToken(stage.label), stage.id)
    definitionsById.set(stage.id, { ...stage, sortOrder: null })
  }

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const stageId = valueKey ?? valueLabel
    if (!stageId) continue

    const existing = definitionsById.get(stageId)
    if (!existing) {
      throw new Error(`lookup_values contiene uno stato ticket non supportato: ${stageId}`)
    }

    const color = readLookupColor(row.metadata) ?? existing.color

    definitionsById.set(stageId, {
      ...existing,
      label: valueLabel ?? valueKey ?? existing.label,
      color,
      sortOrder: readLookupSortOrder(row.sort_order) ?? existing.sortOrder ?? null,
    })

    aliases.set(normalizeComparableToken(stageId), stageId)
    if (valueKey) aliases.set(normalizeComparableToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeComparableToken(valueLabel), stageId)
  }

  for (const row of ticketRows) {
    const status = toStringValue(row.stato)
    if (!status) continue

    if (!definitionsById.has(status)) {
      throw new Error(`Valore ticket.stato non supportato: ${status}`)
    }

    aliases.set(normalizeComparableToken(status), status)
  }

  const definitions = Array.from(definitionsById.values())
    .sort((left, right) => {
      const leftDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeComparableToken(item.id) === normalizeComparableToken(left.id),
      )
      const rightDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeComparableToken(item.id) === normalizeComparableToken(right.id),
      )
      const leftOrder =
        left.sortOrder ?? (leftDefaultIndex >= 0 ? leftDefaultIndex : Number.POSITIVE_INFINITY)
      const rightOrder =
        right.sortOrder ?? (rightDefaultIndex >= 0 ? rightDefaultIndex : Number.POSITIVE_INFINITY)

      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      color: definition.color,
      badgeClassName: definition.badgeClassName,
      icon: definition.icon,
    }))

  return { definitions, aliases }
}

export function buildSupportTicketsRapportoIndex(
  rows: RapportoLavorativoRecord[],
  famiglieById?: Map<string, PersonNameInput>,
  lavoratoriById?: Map<string, PersonNameInput>,
  assunzioneNamesById?: Map<string, RapportoAssunzioneNames>,
) {
  const byId = new Map<string, RapportoLavorativoRecord>()
  const byExternalId = new Map<string, RapportoLavorativoRecord>()
  const byChiusuraId = new Map<string, RapportoLavorativoRecord>()
  const byAssunzioneId = new Map<string, RapportoLavorativoRecord>()
  const personNamesById = new Map<
    string,
    { famiglia: PersonNameInput | null; lavoratore: PersonNameInput | null }
  >()

  for (const rapporto of rows) {
    byId.set(rapporto.id, rapporto)

    if (rapporto.fine_rapporto_lavorativo_id) {
      byChiusuraId.set(rapporto.fine_rapporto_lavorativo_id, rapporto)
    }

    for (const assunzioneId of [
      rapporto.assunzione_datore_id,
      rapporto.assunzione_lavoratore_id,
    ]) {
      if (assunzioneId) byAssunzioneId.set(assunzioneId, rapporto)
    }

    for (const key of [rapporto.id, rapporto.id_rapporto, rapporto.ticket_id]) {
      if (!key) continue
      byExternalId.set(key, rapporto)
    }

    personNamesById.set(rapporto.id, {
      famiglia: rapporto.famiglia_id ? (famiglieById?.get(rapporto.famiglia_id) ?? null) : null,
      lavoratore: rapporto.lavoratore_id
        ? (lavoratoriById?.get(rapporto.lavoratore_id) ?? null)
        : null,
    })
  }

  return {
    byId,
    byExternalId,
    byChiusuraId,
    byAssunzioneId,
    personNamesById,
    famigliaNameById: famiglieById ?? new Map<string, PersonNameInput>(),
    assunzioneNamesById: assunzioneNamesById ?? new Map<string, RapportoAssunzioneNames>(),
  }
}

export function buildEmptySupportTicketsLinkedRecordIndexes(): SupportTicketsLinkedRecordIndexes {
  return {
    assunzioni: indexRecordsById([]),
    cedolini: indexRecordsByTicketId([]),
    chiusure: indexRecordsByTicketId([]),
    contributi: indexRecordsByTicketId([]),
    pagamenti: indexRecordsByTicketId([]),
    presenze: indexRecordsByTicketId([]),
    variazioni: indexRecordsByTicketId([]),
  }
}

function getRapportoForTicket(
  record: TicketRecord,
  rapportoIndex: SupportTicketsRapportoIndex,
  chiusuraIndex: Map<string, ChiusuraContrattoRecord>,
  linkedRecordIndexes?: SupportTicketsLinkedRecordIndexes,
) {
  for (const key of [record.rapporto_id, record.id, record.airtable_id, record.airtable_record_id]) {
    if (!key) continue

    const rapporto = rapportoIndex.byId.get(key) ?? rapportoIndex.byExternalId.get(key)
    if (rapporto) return rapporto
  }

  if (record.chiusura_id) {
    const chiusura = chiusuraIndex.get(record.chiusura_id)
    const rapporto =
      rapportoIndex.byChiusuraId.get(record.chiusura_id) ??
      (chiusura?.ticket_id ? rapportoIndex.byExternalId.get(chiusura.ticket_id) : null)

    if (rapporto) return rapporto
  }

  if (linkedRecordIndexes) {
    const linkedRapportoId =
      (record.cedolino_id
        ? getIndexedRecordByTicketId(
            record.cedolino_id,
            record.id,
            linkedRecordIndexes.cedolini,
          )?.rapporto_lavorativo_id
        : null) ??
      (record.variazione_id
        ? getIndexedRecordByTicketId(
            record.variazione_id,
            record.id,
            linkedRecordIndexes.variazioni,
          )?.rapporto_lavorativo_id
        : null) ??
      (record.contributi_id
        ? getIndexedRecordByTicketId(
            record.contributi_id,
            record.id,
            linkedRecordIndexes.contributi,
          )?.rapporto_lavorativo_id
        : null)

    if (linkedRapportoId) {
      const rapporto = rapportoIndex.byId.get(linkedRapportoId)
      if (rapporto) return rapporto
    }

    if (record.assunzione_id) {
      const rapporto = rapportoIndex.byAssunzioneId.get(record.assunzione_id)
      if (rapporto) return rapporto
    }
  }

  return null
}

function buildLinkedRecords(record: TicketRecord, indexes: SupportTicketsLinkedRecordIndexes) {
  const linkedRecords: SupportTicketLinkedRecord[] = []

  if (record.chiusura_id || indexes.chiusure.byTicketId.has(record.id)) {
    const chiusura = getIndexedRecordByTicketId(record.chiusura_id, record.id, indexes.chiusure)
    const titleBase = "Chiusura rapporto"

    linkedRecords.push({
      type: "chiusura",
      id: record.chiusura_id ?? chiusura?.id ?? record.id,
      label: "Chiusura",
      title: chiusura?.data_fine_rapporto
        ? `${titleBase} | ${formatTicketDateLabel(chiusura.data_fine_rapporto)}`
        : titleBase,
      subtitle:
        chiusura?.motivazione_cessazione_rapporto ??
        chiusura?.tipo_licenziamento ??
        chiusura?.tipo_decesso ??
        null,
      status: chiusura?.stato ?? null,
      dateLabel: formatOptionalTicketDateLabel(chiusura?.data_fine_rapporto ?? chiusura?.creato_il),
      accent: "rose",
      record: chiusura,
    })
  }

  if (record.assunzione_id) {
    const assunzione = indexes.assunzioni.get(record.assunzione_id) ?? null

    linkedRecords.push({
      type: "assunzione",
      id: record.assunzione_id,
      label: "Assunzione",
      title: formatAssunzioneName(assunzione) ?? "Assunzione collegata",
      subtitle: assunzione?.info_anagrafiche_email ?? null,
      status: assunzione?.type_of_compilazione_form ?? null,
      dateLabel: null,
      accent: "sky",
      record: assunzione,
    })
  }

  if (record.variazione_id || indexes.variazioni.byTicketId.has(record.id)) {
    const variazione = getIndexedRecordByTicketId(
      record.variazione_id,
      record.id,
      indexes.variazioni,
    )

    linkedRecords.push({
      type: "variazione",
      id: record.variazione_id ?? variazione?.id ?? record.id,
      label: "Variazione",
      title: variazione?.variazione_da_applicare ?? "Variazione collegata",
      subtitle: variazione?.rapporto_lavorativo_id
        ? `Rapporto ${variazione.rapporto_lavorativo_id}`
        : null,
      status: variazione?.stato ?? null,
      dateLabel: formatOptionalTicketDateLabel(variazione?.data_variazione),
      accent: "violet",
      record: variazione,
    })
  }

  if (record.contributi_id || indexes.contributi.byTicketId.has(record.id)) {
    const contributo = getIndexedRecordByTicketId(
      record.contributi_id,
      record.id,
      indexes.contributi,
    )

    linkedRecords.push({
      type: "contributi",
      id: record.contributi_id ?? contributo?.id ?? record.id,
      label: "Contributi",
      title: contributo?.trimestre_id
        ? `Contributi INPS ${contributo.trimestre_id}`
        : "Contributi INPS collegati",
      subtitle: contributo?.importo_contributi_inps ? `${contributo.importo_contributi_inps} euro` : null,
      status: contributo?.stato_contributi_inps ?? null,
      dateLabel: formatOptionalTicketDateLabel(
        contributo?.data_invio_famiglia ?? contributo?.data_ora_creazione,
      ),
      accent: "violet",
      record: contributo,
    })
  }

  if (record.cedolino_id || indexes.cedolini.byTicketId.has(record.id)) {
    const cedolino = getIndexedRecordByTicketId(record.cedolino_id, record.id, indexes.cedolini)

    linkedRecords.push({
      type: "cedolino",
      id: record.cedolino_id ?? cedolino?.id ?? record.id,
      label: "Cedolino",
      title: cedolino?.mese_id ? `Cedolino ${cedolino.mese_id}` : "Cedolino collegato",
      subtitle: cedolino?.caso_particolare ?? null,
      status: cedolino?.stato_mese_lavorativo ?? null,
      dateLabel: formatOptionalTicketDateLabel(
        cedolino?.data_invio_famiglia ?? cedolino?.data_ora_creazione,
      ),
      accent: "amber",
      record: cedolino,
    })
  }

  if (record.pagamenti_id || indexes.pagamenti.byTicketId.has(record.id)) {
    const pagamento = getIndexedRecordByTicketId(record.pagamenti_id, record.id, indexes.pagamenti)

    linkedRecords.push({
      type: "pagamento",
      id: record.pagamenti_id ?? pagamento?.id ?? record.id,
      label: "Pagamento",
      title:
        formatItalianCurrencyFromMinorUnitsOrNull(pagamento?.amount, pagamento?.currency) ??
        "Pagamento collegato",
      subtitle: pagamento?.numero_fattura ?? pagamento?.customer_email ?? pagamento?.type_of_payment ?? null,
      status: pagamento?.status ?? null,
      dateLabel: formatOptionalTicketDateLabel(pagamento?.data_ora_di_pagamento),
      accent: "emerald",
      record: pagamento,
    })
  }

  if (record.presenze_id || indexes.presenze.byTicketId.has(record.id)) {
    const presenza = getIndexedRecordByTicketId(record.presenze_id, record.id, indexes.presenze)

    linkedRecords.push({
      type: "presenze",
      id: record.presenze_id ?? presenza?.id ?? record.id,
      label: "Presenze",
      title: presenza?.presenze_mensili
        ? `Presenze mensili: ${presenza.presenze_mensili} ore`
        : "Presenze collegate",
      subtitle: presenza?.note_interne ?? null,
      status: null,
      dateLabel: formatOptionalTicketDateLabel(presenza?.data_ora_creazione),
      accent: "zinc",
      record: presenza,
    })
  }

  return linkedRecords
}

export function mapSupportTicketRecordToCard(
  record: TicketRecord,
  ticketType: SupportTicketType,
  rapportoIndex: SupportTicketsRapportoIndex,
  chiusuraIndex: Map<string, ChiusuraContrattoRecord>,
  linkedRecordIndexes: SupportTicketsLinkedRecordIndexes,
  aliases: Map<string, string>,
): SupportTicketBoardCardData | null {
  const normalizedType = normalizeSupportTicketType(record.tipo)
  if (normalizedType !== ticketType) return null

  const rapporto = getRapportoForTicket(record, rapportoIndex, chiusuraIndex, linkedRecordIndexes)
  const linkedRecords = buildLinkedRecords(record, linkedRecordIndexes)
  const metadata = getSupportTicketMetadata(record)
  const tag = toStringValue(metadata.tag) ?? inferSupportTicketTag(record)
  const note = toStringValue(metadata.note)
  const assegnatario = toStringValue(metadata.assegnatario)
  resolveSupportTicketTag(tag)

  const urgenza = toStringValue(record.urgenza)
  if (!urgenza) {
    throw new Error(`Ticket ${record.id} senza urgenza valorizzata`)
  }
  resolveSupportTicketUrgency(urgenza)

  const rawStage = toStringValue(record.stato)
  if (!rawStage) {
    throw new Error(`Ticket ${record.id} senza stato valorizzato`)
  }
  const stage = aliases.get(normalizeComparableToken(rawStage))
  if (!stage) {
    throw new Error(`Stato ticket non mappato per ticket ${record.id}: ${rawStage}`)
  }
  const personNames = rapporto ? (rapportoIndex.personNamesById.get(rapporto.id) ?? null) : null
  const pagamentoFamiglia =
    !rapporto && (record.pagamenti_id || linkedRecordIndexes.pagamenti.byTicketId.has(record.id))
      ? (() => {
          const pagamento = getIndexedRecordByTicketId(
            record.pagamenti_id,
            record.id,
            linkedRecordIndexes.pagamenti,
          )
          const famigliaId = pagamento?.famiglia_id
          return famigliaId ? (rapportoIndex.famigliaNameById.get(famigliaId) ?? null) : null
        })()
      : null
  const assunzioneNames = rapporto
    ? (rapportoIndex.assunzioneNamesById.get(rapporto.id) ?? null)
    : null
  const nomeFamiglia = rapporto
    ? getRapportoFamilyLabel(rapporto, personNames?.famiglia, assunzioneNames?.datore)
    : (formatPersonName(pagamentoFamiglia) ?? "Famiglia non disponibile")
  const nomeLavoratore = rapporto
    ? getRapportoWorkerLabel(rapporto, personNames?.lavoratore, assunzioneNames?.lavoratore)
    : "Lavoratore non disponibile"

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    linkedRecords,
    tipo: ticketType,
    causale: toStringValue(record.causale) ?? "Ticket senza causale",
    nomeFamiglia,
    nomeLavoratore,
    nomeCompleto: rapporto
      ? getRapportoTitle(rapporto, {
          famiglia: personNames?.famiglia,
          lavoratore: personNames?.lavoratore,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        })
      : `${nomeFamiglia} – ${nomeLavoratore}`,
    dataAperturaLabel: formatTicketDateLabel(record.data_apertura ?? record.creato_il),
    tag,
    urgenza,
    assegnatario: assegnatario ?? "",
    note,
    attachmentCount: normalizeAttachmentArray(record.allegati).length,
  }
}

export async function fetchSupportTicketsBoardData(
  ticketType: SupportTicketType,
): Promise<SupportTicketsBoardData> {
  const [bundle, lookupResult] = await Promise.all([
    fetchSupportTicketsBundle(ticketType),
    fetchLookupValues(),
  ])

  const filteredTicketRows = (bundle.tickets ?? []) as TicketRecord[]
  const rapportiRows = (bundle.rapporti ?? []) as RapportoLavorativoRecord[]
  const chiusureRows = (bundle.chiusure ?? []) as ChiusuraContrattoRecord[]
  const pagamentiRows = (bundle.pagamenti ?? []) as PagamentoRecord[]

  const famiglieById = new Map<string, PersonNameInput>(
    (bundle.famiglie ?? []).map((row) => [
      String(row.id),
      { cognome: row.cognome ?? null, nome: row.nome ?? null },
    ]),
  )
  const lavoratoriById = new Map<string, PersonNameInput>(
    (bundle.lavoratori ?? []).map((row) => [
      String(row.id),
      { cognome: row.cognome ?? null, nome: row.nome ?? null },
    ]),
  )
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    rapportiRows.map((rapporto) => rapporto.id),
  )
  const assunzioneNamesById = new Map<string, RapportoAssunzioneNames>(
    Object.entries(assunzioneNamesByRapporto),
  )
  const rapportoIndex = buildSupportTicketsRapportoIndex(
    rapportiRows,
    famiglieById,
    lavoratoriById,
    assunzioneNamesById,
  )
  const chiusuraIndex = indexRecordsById(chiusureRows)
  const linkedRecordIndexes: SupportTicketsLinkedRecordIndexes = {
    assunzioni: indexRecordsById((bundle.assunzioni ?? []) as unknown as AssunzioneRecord[]),
    cedolini: indexRecordsByTicketId((bundle.cedolini ?? []) as MeseLavoratoRecord[]),
    chiusure: indexRecordsByTicketId(chiusureRows),
    contributi: indexRecordsByTicketId((bundle.contributi ?? []) as ContributoInpsRecord[]),
    pagamenti: indexRecordsByTicketId(pagamentiRows),
    presenze: indexRecordsByTicketId((bundle.presenze ?? []) as PresenzaMensileRecord[]),
    variazioni: indexRecordsByTicketId((bundle.variazioni ?? []) as VariazioneContrattualeRecord[]),
  }
  const stageMetadata = buildSupportTicketStageMetadata(lookupResult.rows, filteredTicketRows)

  const cards = filteredTicketRows.flatMap((record) => {
    const card = mapSupportTicketRecordToCard(
      record,
      ticketType,
      rapportoIndex,
      chiusuraIndex,
      linkedRecordIndexes,
      stageMetadata.aliases,
    )
    return card ? [card] : []
  })

  const activeRapportiCount = rapportiRows.filter((rapporto) => {
    const token = normalizeComparableToken(resolveRapportoStatus(rapporto))
    return token === "attivo"
  }).length

  const rapportoOptions = rapportiRows
    .filter((rapporto) => {
      const token = normalizeComparableToken(resolveRapportoStatus(rapporto))
      return token === "attivo"
    })
    .map((rapporto) => {
      const personNames = rapportoIndex.personNamesById.get(rapporto.id) ?? null
      const assunzioneNames = rapportoIndex.assunzioneNamesById.get(rapporto.id) ?? null
      return {
        id: rapporto.id,
        label: getRapportoTitle(rapporto, {
          famiglia: personNames?.famiglia,
          lavoratore: personNames?.lavoratore,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        }),
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return {
    cards,
    stages: stageMetadata.definitions,
    activeRapportiCount,
    rapportoOptions,
    rapportoIndex,
    chiusuraIndex,
    linkedRecordIndexes,
    stageAliases: stageMetadata.aliases,
  }
}
