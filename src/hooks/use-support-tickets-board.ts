import * as React from "react"

import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  useMoveMutation,
  usePatchMutation,
} from "@/hooks/use-board-mutations"
import {
  createRecord,
  fetchLookupValues,
  fetchSupportTicketsBundle,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

// The board's primary entity is the ticket; linked records are contextual, so
// we subscribe only to `ticket` to avoid refetching on unrelated table churn.
const SUPPORT_TICKETS_REALTIME_TABLES = ["ticket"]
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
import type { AssunzioneRecord } from "@/hooks/use-assunzioni-board"
import {
  SUPPORT_TICKET_STATUSES,
  getSupportTicketMetadata,
  inferSupportTicketTag,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketMetadata,
  type SupportTicketStatusDefinition,
  type SupportTicketTag,
  type SupportTicketType,
  type SupportTicketUrgency,
} from "@/components/support/support-ticket-config"
import { formatPersonName, getRapportoFamilyLabel, getRapportoTitle, getRapportoWorkerLabel } from "@/features/rapporti/rapporti-labels"
import { resolveRapportoStatus } from "@/features/rapporti/rapporti-status"

type SupportTicketStageMetadata = {
  definitions: SupportTicketStatusDefinition[]
  aliases: Map<string, string>
}

export type SupportTicketLinkedRecordType =
  | "assunzione"
  | "cedolino"
  | "chiusura"
  | "contributi"
  | "pagamento"
  | "presenze"
  | "variazione"

type SupportTicketLinkedRecordAccent = "rose" | "amber" | "emerald" | "sky" | "violet" | "zinc"

export type SupportTicketLinkedRecord = {
  type: SupportTicketLinkedRecordType
  id: string
  label: string
  title: string
  subtitle: string | null
  status: string | null
  dateLabel: string | null
  accent: SupportTicketLinkedRecordAccent
  record:
    | AssunzioneRecord
    | ChiusuraContrattoRecord
    | ContributoInpsRecord
    | MeseLavoratoRecord
    | PagamentoRecord
    | PresenzaMensileRecord
    | VariazioneContrattualeRecord
    | null
}

export type SupportTicketBoardCardData = {
  id: string
  stage: string
  record: TicketRecord
  rapporto: RapportoLavorativoRecord | null
  linkedRecords: SupportTicketLinkedRecord[]
  tipo: SupportTicketType
  causale: string
  nomeFamiglia: string
  nomeLavoratore: string
  nomeCompleto: string
  dataAperturaLabel: string
  tag: string
  urgenza: string
  assegnatario: string
  note: string | null
  attachmentCount: number
}

type CreateSupportTicketInput = {
  tipo: SupportTicketType
  rapportoId: string
  tag: SupportTicketTag
  urgenza: SupportTicketUrgency
  causale: string
  note: string
}

type UseSupportTicketsBoardState = {
  loading: boolean
  error: string | null
  stages: SupportTicketStatusDefinition[]
  cards: SupportTicketBoardCardData[]
  activeRapportiCount: number
  rapportoOptions: Array<{ id: string; label: string }>
  createTicket: (input: CreateSupportTicketInput) => Promise<void>
  moveTicket: (ticketId: string, targetStageId: string) => Promise<void>
  patchTicket: (ticketId: string, patch: Partial<TicketRecord>) => Promise<void>
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function readLookupSortOrder(value: LookupValueRecord["sort_order"]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function countAttachments(value: TicketRecord["allegati"]) {
  if (!value) return 0
  if (Array.isArray(value)) return value.length
  return 1
}

function formatDateLabel(value: string | null | undefined) {
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

function formatOptionalDateLabel(value: string | null | undefined) {
  if (!value) return null
  return formatDateLabel(value)
}

function formatCurrencyLabel(value: number | null | undefined, currency: string | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency?.toUpperCase() || "EUR",
  }).format(value / 100)
}

function joinTitleParts(parts: Array<string | null | undefined>) {
  return parts.map(toStringValue).filter(Boolean).join(" ").trim()
}

function normalizeTicketType(value: string | null | undefined): SupportTicketType | null {
  const token = normalizeToken(value)
  if (token === "customer") return "Customer"
  if (token === "customer support") return "Customer"
  if (token === "payroll") return "Payroll"
  if (token === "consulenza lavoro") return "Payroll"
  return null
}

function buildStageMetadata(rows: LookupValueRecord[], ticketRows: TicketRecord[]): SupportTicketStageMetadata {
  const aliases = new Map<string, string>()
  const definitionsById = new Map<string, SupportTicketStatusDefinition & { sortOrder: number | null }>()

  const lookupRows = rows.filter(
    (row) => row.is_active && row.entity_table === "ticket" && row.entity_field === "stato"
  )

  for (const stage of SUPPORT_TICKET_STATUSES) {
    aliases.set(normalizeToken(stage.id), stage.id)
    aliases.set(normalizeToken(stage.label), stage.id)
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

    aliases.set(normalizeToken(stageId), stageId)
    if (valueKey) aliases.set(normalizeToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), stageId)
  }

  for (const row of ticketRows) {
    const status = toStringValue(row.stato)
    if (!status) continue

    if (!definitionsById.has(status)) {
      throw new Error(`Valore ticket.stato non supportato: ${status}`)
    }

    aliases.set(normalizeToken(status), status)
  }

  const definitions = Array.from(definitionsById.values())
    .sort((left, right) => {
      const leftDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeToken(item.id) === normalizeToken(left.id)
      )
      const rightDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeToken(item.id) === normalizeToken(right.id)
      )
      const leftOrder = left.sortOrder ?? (leftDefaultIndex >= 0 ? leftDefaultIndex : Number.POSITIVE_INFINITY)
      const rightOrder = right.sortOrder ?? (rightDefaultIndex >= 0 ? rightDefaultIndex : Number.POSITIVE_INFINITY)

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

type PersonNameInput = { cognome?: string | null; nome?: string | null }

function buildRapportoIndex(
  rows: RapportoLavorativoRecord[],
  famiglieById?: Map<string, PersonNameInput>,
  lavoratoriById?: Map<string, PersonNameInput>
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

    for (const key of [
      rapporto.id,
      rapporto.id_rapporto,
      rapporto.ticket_id,
    ]) {
      if (!key) continue
      byExternalId.set(key, rapporto)
    }

    personNamesById.set(rapporto.id, {
      famiglia: rapporto.famiglia_id ? famiglieById?.get(rapporto.famiglia_id) ?? null : null,
      lavoratore: rapporto.lavoratore_id ? lavoratoriById?.get(rapporto.lavoratore_id) ?? null : null,
    })
  }

  return {
    byId,
    byExternalId,
    byChiusuraId,
    byAssunzioneId,
    personNamesById,
    famigliaNameById: famiglieById ?? new Map<string, PersonNameInput>(),
  }
}

function buildChiusuraIndex(rows: ChiusuraContrattoRecord[]) {
  return new Map(rows.map((row) => [row.id, row]))
}

function buildRecordIndex<TRecord extends { id: string }>(rows: TRecord[]) {
  return new Map(rows.map((row) => [row.id, row] as const))
}

function buildTicketRecordIndex<TRecord extends { id: string; ticket_id?: string | null }>(rows: TRecord[]) {
  const byId = buildRecordIndex(rows)
  const byTicketId = new Map<string, TRecord>()

  for (const row of rows) {
    if (row.ticket_id) byTicketId.set(row.ticket_id, row)
  }

  return { byId, byTicketId }
}

function getIndexedRecord<TRecord extends { id: string; ticket_id?: string | null }>(
  recordId: string | null | undefined,
  ticketId: string,
  index: ReturnType<typeof buildTicketRecordIndex<TRecord>>
) {
  if (recordId) {
    const record = index.byId.get(recordId)
    if (record) return record
  }

  return index.byTicketId.get(ticketId) ?? null
}

function getRapportoForTicket(
  record: TicketRecord,
  rapportoIndex: ReturnType<typeof buildRapportoIndex>,
  chiusuraIndex: ReturnType<typeof buildChiusuraIndex>,
  linkedRecordIndexes?: LinkedRecordIndexes
) {
  for (const key of [
    record.rapporto_id,
    record.id,
    record.airtable_id,
    record.airtable_record_id,
  ]) {
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

  // Risalita al rapporto tramite i record collegati che lo referenziano direttamente.
  if (linkedRecordIndexes) {
    const linkedRapportoId =
      (record.cedolino_id
        ? getIndexedRecord(record.cedolino_id, record.id, linkedRecordIndexes.cedolini)
            ?.rapporto_lavorativo_id
        : null) ??
      (record.variazione_id
        ? getIndexedRecord(record.variazione_id, record.id, linkedRecordIndexes.variazioni)
            ?.rapporto_lavorativo_id
        : null) ??
      (record.contributi_id
        ? getIndexedRecord(record.contributi_id, record.id, linkedRecordIndexes.contributi)
            ?.rapporto_lavorativo_id
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

type LinkedRecordIndexes = {
  assunzioni: Map<string, AssunzioneRecord>
  cedolini: ReturnType<typeof buildTicketRecordIndex<MeseLavoratoRecord>>
  chiusure: ReturnType<typeof buildTicketRecordIndex<ChiusuraContrattoRecord>>
  contributi: ReturnType<typeof buildTicketRecordIndex<ContributoInpsRecord>>
  pagamenti: ReturnType<typeof buildTicketRecordIndex<PagamentoRecord>>
  presenze: ReturnType<typeof buildTicketRecordIndex<PresenzaMensileRecord>>
  variazioni: ReturnType<typeof buildTicketRecordIndex<VariazioneContrattualeRecord>>
}

function buildEmptyLinkedRecordIndexes(): LinkedRecordIndexes {
  return {
    assunzioni: buildRecordIndex([]),
    cedolini: buildTicketRecordIndex([]),
    chiusure: buildTicketRecordIndex([]),
    contributi: buildTicketRecordIndex([]),
    pagamenti: buildTicketRecordIndex([]),
    presenze: buildTicketRecordIndex([]),
    variazioni: buildTicketRecordIndex([]),
  }
}

function buildLinkedRecords(
  record: TicketRecord,
  indexes: LinkedRecordIndexes
) {
  const linkedRecords: SupportTicketLinkedRecord[] = []

  if (record.chiusura_id || indexes.chiusure.byTicketId.has(record.id)) {
    const chiusura = getIndexedRecord(record.chiusura_id, record.id, indexes.chiusure)
    const titleBase = "Chiusura rapporto"

    linkedRecords.push({
      type: "chiusura",
      id: record.chiusura_id ?? chiusura?.id ?? record.id,
      label: "Chiusura",
      title: chiusura?.data_fine_rapporto
        ? `${titleBase} | ${formatDateLabel(chiusura.data_fine_rapporto)}`
        : titleBase,
      subtitle: chiusura?.motivazione_cessazione_rapporto ?? chiusura?.tipo_licenziamento ?? chiusura?.tipo_decesso ?? null,
      status: chiusura?.stato ?? null,
      dateLabel: formatOptionalDateLabel(chiusura?.data_fine_rapporto ?? chiusura?.creato_il),
      accent: "rose",
      record: chiusura,
    })
  }

  if (record.assunzione_id) {
    const assunzione = indexes.assunzioni.get(record.assunzione_id) ?? null
    const nominativo = joinTitleParts([assunzione?.info_anagrafiche_cognome, assunzione?.info_anagrafiche_nome])

    linkedRecords.push({
      type: "assunzione",
      id: record.assunzione_id,
      label: "Assunzione",
      title: nominativo || "Assunzione collegata",
      subtitle: assunzione?.info_anagrafiche_email ?? null,
      status: assunzione?.type_of_compilazione_form ?? null,
      dateLabel: null,
      accent: "sky",
      record: assunzione,
    })
  }

  if (record.variazione_id || indexes.variazioni.byTicketId.has(record.id)) {
    const variazione = getIndexedRecord(record.variazione_id, record.id, indexes.variazioni)

    linkedRecords.push({
      type: "variazione",
      id: record.variazione_id ?? variazione?.id ?? record.id,
      label: "Variazione",
      title: variazione?.variazione_da_applicare ?? "Variazione collegata",
      subtitle: variazione?.rapporto_lavorativo_id ? `Rapporto ${variazione.rapporto_lavorativo_id}` : null,
      status: variazione?.stato ?? null,
      dateLabel: formatOptionalDateLabel(variazione?.data_variazione),
      accent: "violet",
      record: variazione,
    })
  }

  if (record.contributi_id || indexes.contributi.byTicketId.has(record.id)) {
    const contributo = getIndexedRecord(record.contributi_id, record.id, indexes.contributi)

    linkedRecords.push({
      type: "contributi",
      id: record.contributi_id ?? contributo?.id ?? record.id,
      label: "Contributi",
      title: contributo?.trimestre_id ? `Contributi INPS ${contributo.trimestre_id}` : "Contributi INPS collegati",
      subtitle: contributo?.importo_contributi_inps ? `${contributo.importo_contributi_inps} euro` : null,
      status: contributo?.stato_contributi_inps ?? null,
      dateLabel: formatOptionalDateLabel(contributo?.data_invio_famiglia ?? contributo?.data_ora_creazione),
      accent: "violet",
      record: contributo,
    })
  }

  if (record.cedolino_id || indexes.cedolini.byTicketId.has(record.id)) {
    const cedolino = getIndexedRecord(record.cedolino_id, record.id, indexes.cedolini)

    linkedRecords.push({
      type: "cedolino",
      id: record.cedolino_id ?? cedolino?.id ?? record.id,
      label: "Cedolino",
      title: cedolino?.mese_id ? `Cedolino ${cedolino.mese_id}` : "Cedolino collegato",
      subtitle: cedolino?.caso_particolare ?? null,
      status: cedolino?.stato_mese_lavorativo ?? null,
      dateLabel: formatOptionalDateLabel(cedolino?.data_invio_famiglia ?? cedolino?.data_ora_creazione),
      accent: "amber",
      record: cedolino,
    })
  }

  if (record.pagamenti_id || indexes.pagamenti.byTicketId.has(record.id)) {
    const pagamento = getIndexedRecord(record.pagamenti_id, record.id, indexes.pagamenti)

    linkedRecords.push({
      type: "pagamento",
      id: record.pagamenti_id ?? pagamento?.id ?? record.id,
      label: "Pagamento",
      title: formatCurrencyLabel(pagamento?.amount, pagamento?.currency) ?? "Pagamento collegato",
      subtitle: pagamento?.numero_fattura ?? pagamento?.customer_email ?? pagamento?.type_of_payment ?? null,
      status: pagamento?.status ?? null,
      dateLabel: formatOptionalDateLabel(pagamento?.data_ora_di_pagamento),
      accent: "emerald",
      record: pagamento,
    })
  }

  if (record.presenze_id || indexes.presenze.byTicketId.has(record.id)) {
    const presenza = getIndexedRecord(record.presenze_id, record.id, indexes.presenze)

    linkedRecords.push({
      type: "presenze",
      id: record.presenze_id ?? presenza?.id ?? record.id,
      label: "Presenze",
      title: presenza?.presenze_mensili ? `Presenze mensili: ${presenza.presenze_mensili} ore` : "Presenze collegate",
      subtitle: presenza?.note_interne ?? null,
      status: null,
      dateLabel: formatOptionalDateLabel(presenza?.data_ora_creazione),
      accent: "zinc",
      record: presenza,
    })
  }

  return linkedRecords
}

function mapRecordToCard(
  record: TicketRecord,
  ticketType: SupportTicketType,
  rapportoIndex: ReturnType<typeof buildRapportoIndex>,
  chiusuraIndex: ReturnType<typeof buildChiusuraIndex>,
  linkedRecordIndexes: LinkedRecordIndexes,
  aliases: Map<string, string>
): SupportTicketBoardCardData | null {
  const normalizedType = normalizeTicketType(record.tipo)
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
  const stage = aliases.get(normalizeToken(rawStage))
  if (!stage) {
    throw new Error(`Stato ticket non mappato per ticket ${record.id}: ${rawStage}`)
  }
  const personNames = rapporto ? rapportoIndex.personNamesById.get(rapporto.id) ?? null : null
  // Se il ticket non risale a un rapporto, proviamo a recuperare almeno la famiglia
  // dal pagamento collegato (i pagamenti referenziano direttamente la famiglia).
  const pagamentoFamiglia =
    !rapporto && (record.pagamenti_id || linkedRecordIndexes.pagamenti.byTicketId.has(record.id))
      ? (() => {
          const pagamento = getIndexedRecord(record.pagamenti_id, record.id, linkedRecordIndexes.pagamenti)
          const famigliaId = pagamento?.famiglia_id
          return famigliaId ? rapportoIndex.famigliaNameById.get(famigliaId) ?? null : null
        })()
      : null
  const nomeFamiglia = rapporto
    ? getRapportoFamilyLabel(rapporto, personNames?.famiglia)
    : formatPersonName(pagamentoFamiglia) ?? "Famiglia non disponibile"
  const nomeLavoratore = rapporto
    ? getRapportoWorkerLabel(rapporto, personNames?.lavoratore)
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
      ? getRapportoTitle(rapporto, { famiglia: personNames?.famiglia, lavoratore: personNames?.lavoratore })
      : `${nomeFamiglia} – ${nomeLavoratore}`,
    dataAperturaLabel: formatDateLabel(record.data_apertura ?? record.creato_il),
    tag,
    urgenza,
    assegnatario: assegnatario ?? "",
    note,
    attachmentCount: countAttachments(record.allegati),
  }
}

async function fetchSupportTicketsData(ticketType: SupportTicketType) {
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
    ])
  )
  const lavoratoriById = new Map<string, PersonNameInput>(
    (bundle.lavoratori ?? []).map((row) => [
      String(row.id),
      { cognome: row.cognome ?? null, nome: row.nome ?? null },
    ])
  )
  const rapportoIndex = buildRapportoIndex(rapportiRows, famiglieById, lavoratoriById)
  const chiusuraIndex = buildChiusuraIndex(chiusureRows)
  const linkedRecordIndexes: LinkedRecordIndexes = {
    assunzioni: buildRecordIndex((bundle.assunzioni ?? []) as unknown as AssunzioneRecord[]),
    cedolini: buildTicketRecordIndex((bundle.cedolini ?? []) as MeseLavoratoRecord[]),
    chiusure: buildTicketRecordIndex(chiusureRows),
    contributi: buildTicketRecordIndex((bundle.contributi ?? []) as ContributoInpsRecord[]),
    pagamenti: buildTicketRecordIndex(pagamentiRows),
    presenze: buildTicketRecordIndex((bundle.presenze ?? []) as PresenzaMensileRecord[]),
    variazioni: buildTicketRecordIndex((bundle.variazioni ?? []) as VariazioneContrattualeRecord[]),
  }
  const stageMetadata = buildStageMetadata(lookupResult.rows, filteredTicketRows)

  const cards = filteredTicketRows.flatMap((record) => {
    const card = mapRecordToCard(
      record,
      ticketType,
      rapportoIndex,
      chiusuraIndex,
      linkedRecordIndexes,
      stageMetadata.aliases
    )
    return card ? [card] : []
  })

  const activeRapportiCount = rapportiRows.filter((rapporto) => {
    const token = normalizeToken(resolveRapportoStatus(rapporto))
    return token === "attivo"
  }).length

  const rapportoOptions = rapportiRows
    .filter((rapporto) => {
      const token = normalizeToken(resolveRapportoStatus(rapporto))
      return token === "attivo"
    })
    .map((rapporto) => {
      const personNames = rapportoIndex.personNamesById.get(rapporto.id) ?? null
      return {
        id: rapporto.id,
        label: getRapportoTitle(rapporto, {
          famiglia: personNames?.famiglia,
          lavoratore: personNames?.lavoratore,
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

type SupportTicketsBoardData = {
  stages: SupportTicketStatusDefinition[]
  cards: SupportTicketBoardCardData[]
  activeRapportiCount: number
  rapportoOptions: Array<{ id: string; label: string }>
  rapportoIndex: ReturnType<typeof buildRapportoIndex>
  chiusuraIndex: ReturnType<typeof buildChiusuraIndex>
  linkedRecordIndexes: LinkedRecordIndexes
  stageAliases: Map<string, string>
}

export function useSupportTicketsBoard(ticketType: SupportTicketType): UseSupportTicketsBoardState {
  const queryClient = useQueryClient()
  const boardQueryKey = React.useMemo(
    () => ["support-tickets-board", ticketType] as const,
    [ticketType],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery<SupportTicketsBoardData>({
    queryKey: boardQueryKey,
    queryFn: () => fetchSupportTicketsData(ticketType),
  })

  const stages = data?.stages ?? []
  const cards = data?.cards ?? []
  const activeRapportiCount = data?.activeRapportiCount ?? 0
  const rapportoOptions = data?.rapportoOptions ?? []
  const rapportoIndex = data?.rapportoIndex ?? buildRapportoIndex([])
  const chiusuraIndex = data?.chiusuraIndex ?? buildChiusuraIndex([])
  const linkedRecordIndexes = data?.linkedRecordIndexes ?? buildEmptyLinkedRecordIndexes()
  const stageAliases = React.useMemo(
    () => data?.stageAliases ?? new Map<string, string>(),
    [data?.stageAliases],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["support-tickets-board"] })
  }, [queryClient])

  const setBoardData = React.useCallback(
    (updater: (previous: SupportTicketsBoardData | undefined) => SupportTicketsBoardData | undefined) => {
      queryClient.setQueryData<SupportTicketsBoardData>(boardQueryKey, (previous) =>
        updater(previous),
      )
    },
    [queryClient, boardQueryKey],
  )

  useRealtimeBoardSync({
    tables: SUPPORT_TICKETS_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const moveMutation = useMoveMutation<
    { ticketId: string; targetStageId: string },
    unknown,
    SupportTicketsBoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ ticketId, targetStageId }) =>
      updateRecord("ticket", ticketId, { stato: targetStageId }),
    applyOptimistic: (previous, { ticketId, targetStageId }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) =>
          card.id === ticketId
            ? {
                ...card,
                stage: targetStageId,
                record: { ...card.record, stato: targetStageId },
              }
            : card,
        ),
      }
    },
  })

  const moveTicket = React.useCallback(
    async (ticketId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ ticketId, targetStageId })
    },
    [moveMutation],
  )

  const patchMutation = usePatchMutation<
    { ticketId: string; patch: Partial<TicketRecord> },
    unknown,
    SupportTicketsBoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ ticketId, patch }) =>
      updateRecord("ticket", ticketId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { ticketId, patch }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) => {
          if (card.id !== ticketId) return card
          const nextRecord = { ...card.record, ...patch }
          const nextCard = mapRecordToCard(
            nextRecord,
            ticketType,
            previous.rapportoIndex,
            previous.chiusuraIndex,
            previous.linkedRecordIndexes,
            previous.stageAliases,
          )
          return nextCard ?? card
        }),
      }
    },
  })

  const patchTicket = React.useCallback(
    async (ticketId: string, patch: Partial<TicketRecord>) => {
      await patchMutation.mutateAsync({ ticketId, patch })
    },
    [patchMutation],
  )

  const createTicket = React.useCallback(
    async (input: CreateSupportTicketInput) => {
      const metadata: SupportTicketMetadata = {
        tag: input.tag,
        note: input.note,
        assegnatario: "",
      }

      const response = await createRecord("ticket", {
        allegati: [],
        causale: input.causale,
        data_apertura: new Date().toISOString(),
        rapporto_id: input.rapportoId,
        stato: SUPPORT_TICKET_STATUSES[0].id,
        tipo: input.tipo,
        urgenza: input.urgenza,
        metadati_migrazione: metadata,
      })

      const createdRecord = response.row as TicketRecord
      const nextCard = mapRecordToCard(
        createdRecord,
        ticketType,
        rapportoIndex,
        chiusuraIndex,
        linkedRecordIndexes,
        stageAliases,
      )

      if (nextCard) {
        setBoardData((previous) => {
          if (!previous) return previous
          return { ...previous, cards: [nextCard, ...previous.cards] }
        })
      }

      // Trigger a background refetch to pick up any server-derived fields.
      invalidateBoard()
    },
    [
      ticketType,
      rapportoIndex,
      chiusuraIndex,
      linkedRecordIndexes,
      stageAliases,
      setBoardData,
      invalidateBoard,
    ],
  )

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchMutation.error instanceof Error
        ? patchMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

  return {
    loading,
    error,
    stages,
    cards,
    activeRapportiCount,
    rapportoOptions,
    createTicket,
    moveTicket,
    patchTicket,
  }
}
