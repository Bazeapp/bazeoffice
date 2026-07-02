import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import { fetchLookupValues } from "@/lib/lookup-values"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { fetchCrmPipelineFamigliaDetail } from "../queries/fetch-crm-pipeline-famiglia-detail"
import { fetchCrmPipelineFamiglieBoard } from "../queries/fetch-crm-pipeline-famiglie-board"
import { updateProcessoMatchingStatoSales } from "../mutations/update-processo-matching-stato-sales"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { LookupValueRecord, RichiestaAttivazioneRecord } from "@/types"

const CRM_REALTIME_TABLES = ["processi_matching", "famiglie", "indirizzi"]
const CRM_REALTIME_RELOAD_DEBOUNCE_MS = 600

const STATO_SALES_COLUMN_ORDER = [
  "warm_lead",
  "hot_ingresso",
  "hot_in_attesa_di_primo_contatto",
  "hot_contatto_avvenuto",
  "hot_callback_programmato",
  "hot_decisione_rimandata",
  "hot_call_attivazione_prenotata",
  "hot_call_attivazione_fatta",
  "hot_follow_up_post_call",
  "hot_no_show",
  "cold_ricerca_futura",
  "won_in_attesa_di_conferma",
  "won_ricerca_attivata",
  "lost",
  "out_of_target",
] as const

const FALLBACK_STATO_SALES_STAGES = [
  {
    id: "won_in_attesa_di_conferma",
    label: "WON - In attesa di conferma",
    color: "emerald",
    sortOrder: null,
  },
] satisfies StageDefinition[]

const CRM_PIPELINE_CARD_LIMIT = 5000
const CRM_PIPELINE_SEARCH_CARD_LIMIT = 50000
const CLOSED_STAGE_IDS = new Set(["won_ricerca_attivata", "lost", "out_of_target"])
const PREVENTIVO_ACCEPTANCE_BASE_URL =
  "https://app.bazeapp.com/v2/checkout/accettare-preventivo"

const ADDRESS_BATCH_SIZE = 150

type LookupOption = {
  valueKey: string
  valueLabel: string
  color: string | null
  sortOrder: number | null
}

export type LookupOptionsByField = Record<string, LookupOption[]>

export type CrmPipelineCardData = {
  id: string
  famigliaId: string
  numeroRicercaAttivata: string | null
  stage: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  tipoLavoroBadges?: string[]
  tipoLavoroColors?: Record<string, string | null>
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  statoRes: string
  qualificazioneLead: string
  motivoNoMatch: string
  modelloSmartmatching: string
  oreSettimana: string
  giorniSettimana: string
  giornatePreferite: string[]
  salesColdCallFollowup: string
  salesNoShowFollowup: string
  motivazioneLost: string
  motivazioneOot: string
  appuntiChiamataSales: string
  dataPerRicercaFutura: string
  dataCallPrenotata: string
  dataLeadRaw: string | null
  dataPerRicercaFuturaRaw: string | null
  dataCallPrenotataRaw: string | null
  tentativiChiamataCount: number
  preventivoAccettato: boolean
  richiestaAttivazioneId: string | null
  preventivoUrl: string | null
  preventivoTitolo: string | null
  preventivoSessionId: string | null
  preventivoAcceptanceUrl: string | null
  feeConcordata: number | null
  origineUrl: string | null
  scontoApplicatoRaw: string | null
  scontoApplicato: string
  orarioDiLavoro: string
  nucleoFamigliare: string
  descrizioneCasa: string
  metraturaCasa: string
  descrizioneAnimaliInCasa: string
  mansioniRichieste: string
  informazioniExtraRiservate: string
  etaMinima: string
  etaMassima: string
  indirizzoProvincia: string
  indirizzoProvinciaSigla: string
  indirizzoCap: string
  indirizzoNote: string
  indirizzoId: string | null
  indirizzoCompleto: string
  indirizzoVia: string
  indirizzoCivico: string
  indirizzoComune: string
  indirizzoCitofono: string
  srcEmbedMapsAnnucio: string
  deadlineMobile: string
  disponibilitaColloquiInPresenza: string
  familyAvailabilityJson?: string | null
  tipoIncontroFamigliaLavoratore: string
  richiestaPatente: boolean
  richiestaTrasferte: boolean
  richiestaFerie: boolean
  descrizioneRichiestaTrasferte: string
  descrizioneRichiestaFerie: string
  patenteDettaglio: string
  sesso: string | null
  nazionalitaEscluse: string[]
  nazionalitaObbligatorie: string[]
  famigliaMoltoEsigente: boolean
  richiestaAutonomia: boolean
  datoreSpessoPresente: boolean
  richiestaDiscrezione: boolean
  comunicareBeneItaliano: boolean
  comunicareBeneInglese: boolean
  presenzaNeonati: boolean
  piuBambini: boolean
  famiglia4Persone: boolean
  caniPiccoli: boolean
  caniGrandi: boolean
  gatti: boolean
  pulireRipianiAlti: boolean
  stirare: boolean
  stirareAbitiDifficili: boolean
  cucinare: boolean
  cucinareElaborato: boolean
  curaPiante: boolean
  testoAnnuncioWhatsapp: string
}

export type CrmPipelineColumnData = {
  id: string
  label: string
  color: string | null
  totalCount: number
  cards: CrmPipelineCardData[]
}

export type CrmPipelineFilters = {
  createdFrom?: string | null
  createdTo?: string | null
  tipoLavoro?: string[]
  preventivoAccettato?: boolean | null
  chiamataPrenotata?: boolean | null
}

type UseCrmPipelinePreviewState = {
  loading: boolean
  error: string | null
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
  loadedClosedStageIds: Set<string>
  loadClosedStage: (stageId: string) => void
  loadProcessDetail: (processId: string) => Promise<void>
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  updateProcessCard: (
    processId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
  updateFamilyCard: (
    familyId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
  updateAddressCard: (
    processId: string,
    addressId: string | null,
    patch: Record<string, unknown>
  ) => Promise<void>
}

export type GenericRow = Record<string, unknown>
type LookupColorMap = Record<string, Record<string, string>>

type StageDefinition = {
  id: string
  label: string
  color: string | null
  sortOrder: number | null
}

type FetchBoardDataResult = {
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
}

type BoardRecordEntry = {
  process: GenericRow
  family: GenericRow | null
  address: GenericRow | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
}

type BoardRecordBundle = {
  entries: BoardRecordEntry[]
  stageGroups: Array<{ value: string; count: number }>
}

function asRowArray(input: unknown): GenericRow[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is GenericRow => Boolean(item) && typeof item === "object"
  )
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
    return null
  }

  return toStringValue(value)
}

function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  return single ? [single] : []
}

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return null
}

function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function formatItalianDateTime(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-"
}

function buildPreventivoAcceptanceUrl(sessionId: string | null) {
  if (!sessionId) return null

  const params = new URLSearchParams({
    utm_source: "whatsapp",
    utm_medium: "organic",
    utm_campaign: "whatsapp",
    utm_content: "reminder1",
    session_id: sessionId,
  })

  return `${PREVENTIVO_ACCEPTANCE_BASE_URL}?${params.toString()}`
}

function buildAddressLine(address: GenericRow | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  return (
    [
      toStringValue(address.via),
      toStringValue(address.civico),
      toStringValue(address.citta),
      toStringValue(address.cap),
    ]
      .filter((item): item is string => Boolean(item))
      .join(", ") || null
  )
}

function getFlexibleStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  if (!single) return []

  return single
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

// Ricava l'ordinale del tentativo più alto (es. "3° chiamata..." -> 3).
// Robusto sia alla scrittura cumulativa ("1°, 2°, 3°") sia a quella
// con singolo ordinale ("3°"): in entrambi i casi restituisce 3.
function getCallAttemptCount(value: unknown): number {
  const items = getFlexibleStringArrayValue(value)
  let maxOrdinal = 0
  for (const item of items) {
    const match = item.match(/\d+/)
    if (match) {
      maxOrdinal = Math.max(maxOrdinal, Number(match[0]))
    }
  }
  // Fallback: se nessun ordinale è presente, usa il numero di voci.
  return maxOrdinal || items.length
}

function resolveLookupOptionColor(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: string | null
) {
  if (!value) return null
  const token = normalizeLookupToken(value)
  const options = lookupOptionsByField[field] ?? []
  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )
  return matched?.color ?? null
}

function resolveLookupLabel(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: string
) {
  const token = normalizeLookupToken(value)
  if (!token) return value

  const matched = lookupOptionsByField[field]?.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )

  return matched?.valueLabel ?? value
}

function normalizeLookupPatchValue(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: unknown
) {
  if (!lookupOptionsByField[field]?.length || value == null) return value

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string"
        ? resolveLookupLabel(lookupOptionsByField, field, item)
        : item
    )
  }

  if (typeof value !== "string") return value

  const directLabel = resolveLookupLabel(lookupOptionsByField, field, value)
  if (directLabel !== value || !value.includes(",")) return directLabel

  return value
    .split(",")
    .map((item) => resolveLookupLabel(lookupOptionsByField, field, item.trim()))
    .filter(Boolean)
    .join(", ")
}

export function normalizeLookupPatchLabels(
  patch: Record<string, unknown>,
  lookupOptionsByField: LookupOptionsByField
) {
  return Object.fromEntries(
    Object.entries(patch).map(([field, value]) => [
      field,
      normalizeLookupPatchValue(lookupOptionsByField, field, value),
    ])
  )
}

function parseIsoTime(value: string | null) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareNullableDates(left: string | null, right: string | null, ascending: boolean) {
  const leftTime = parseIsoTime(left)
  const rightTime = parseIsoTime(right)

  if (leftTime === null && rightTime === null) return 0
  if (leftTime === null) return -1
  if (rightTime === null) return 1
  return ascending ? leftTime - rightTime : rightTime - leftTime
}

function sortCardsForStage(cards: CrmPipelineCardData[], stageId: string) {
  const sorted = [...cards]

  sorted.sort((left, right) => {
    if (stageId === "hot_call_attivazione_prenotata") {
      const byCall = compareNullableDates(left.dataCallPrenotataRaw, right.dataCallPrenotataRaw, true)
      if (byCall !== 0) return byCall
    } else if (stageId === "cold_ricerca_futura") {
      const byCallback = compareNullableDates(
        left.dataPerRicercaFuturaRaw,
        right.dataPerRicercaFuturaRaw,
        true
      )
      if (byCallback !== 0) return byCallback
    }

    return compareNullableDates(left.dataLeadRaw, right.dataLeadRaw, false)
  })

  return sorted
}

function getProcessAddressTypePriority(value: unknown) {
  const type = normalizeLookupToken(toStringValue(value))
  if (type === "luogo") return 0
  if (type === "prova") return 1
  if (!type) return 2
  return null
}

async function fetchProcessAddressesByIds(processIds: string[]) {
  const uniqueProcessIds = Array.from(new Set(processIds.filter(Boolean)))
  const addressesByProcessId = new Map<string, GenericRow>()
  if (uniqueProcessIds.length === 0) return addressesByProcessId

  const chunks = []
  for (let index = 0; index < uniqueProcessIds.length; index += ADDRESS_BATCH_SIZE) {
    chunks.push({
      index,
      batch: uniqueProcessIds.slice(index, index + ADDRESS_BATCH_SIZE),
    })
  }

  const results = await Promise.all(
    chunks.map(({ batch }) =>
      fetchIndirizziByEntity("processi_matching", batch),
    )
  )

  for (const result of results) {
    for (const row of asRowArray(result.rows)) {
      const processId = toStringValue(row.entita_id)
      if (!processId) continue
      const current = addressesByProcessId.get(processId)
      const currentPriority = current
        ? getProcessAddressTypePriority(current.tipo_indirizzo)
        : null
      const nextPriority = getProcessAddressTypePriority(row.tipo_indirizzo)
      if (nextPriority === null) continue
      if (currentPriority === null || nextPriority < currentPriority) {
        addressesByProcessId.set(processId, row)
      }
    }
  }

  return addressesByProcessId
}

function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+(?:[.,]\d+)?/)
  return match?.[0] ?? null
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeStatoSalesStageId(value: string | null | undefined) {
  const token = normalizeLookupToken(value)
  if (token === "won - in attesa di conferma") {
    return "won_in_attesa_di_conferma"
  }
  return token
}

function canonicalizeLookupValue(
  field: string | null | undefined,
  value: string | null | undefined
) {
  const token = normalizeLookupToken(value)
  if (!token) return null

  if (field === "tipo_lavoro") {
    if (["colf/pulizia", "colf / pulizia"].includes(token)) {
      return "Colf / Pulizie"
    }
    if (
      [
        "assistenza domestica / badante",
        "assistenza domiciliare / badante",
      ].includes(token)
    ) {
      return "Assistenza domiciliare / Badante"
    }
    if (["tata colf", "tata - colf", "babysitter / tata-colf"].includes(token)) {
      return "Tata - Colf"
    }
  }

  if (field === "tipo_rapporto") {
    if (
      [
        "*non* convivente full time",
        "non convivente full time",
        "non convivente full-time",
        "full time",
      ].includes(token)
    ) {
      return "Non convivente Full-time"
    }
    if (["part-time", "part time"].includes(token)) {
      return "Part time"
    }
    if (token === "lavoro ad ore") {
      return "Lavoro ad ore"
    }
    if (token === "convivente") {
      return "Convivente"
    }
  }

  return value?.trim() ?? null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null

  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    const canonicalValueKey = canonicalizeLookupValue(
      current.entity_field,
      current.value_key
    )
    const canonicalValueLabel = canonicalizeLookupValue(
      current.entity_field,
      current.value_label
    )

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    if (canonicalValueKey) {
      acc[domain][normalizeLookupToken(canonicalValueKey)] = color
    }
    if (canonicalValueLabel) {
      acc[domain][normalizeLookupToken(canonicalValueLabel)] = color
    }
    return acc
  }, {})
}

function buildLookupOptionsByField(rows: LookupValueRecord[]): LookupOptionsByField {
  const entries = rows
    .filter(
      (row) =>
        row.is_active &&
        (row.entity_table === "processi_matching" ||
          (row.entity_table === "lavoratori" && row.entity_field === "provincia")) &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label))
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const map: LookupOptionsByField = {}
  const seenByField = new Map<string, Set<string>>()
  for (const row of entries) {
    const field = toStringValue(row.entity_field)
    const valueKey = canonicalizeLookupValue(field, toStringValue(row.value_key))
    const valueLabel = canonicalizeLookupValue(field, toStringValue(row.value_label))
    if (!field || !valueKey || !valueLabel) continue

    if (!map[field]) map[field] = []
    if (!seenByField.has(field)) {
      seenByField.set(field, new Set<string>())
    }

    const normalizedValueKey = normalizeLookupToken(valueKey)
    const normalizedValueLabel = normalizeLookupToken(valueLabel)
    const dedupeToken = `${normalizedValueKey}::${normalizedValueLabel}`
    if (seenByField.get(field)?.has(dedupeToken)) {
      continue
    }

    seenByField.get(field)?.add(dedupeToken)

    map[field].push({
      valueKey,
      valueLabel,
      color: readLookupColor(row.metadata),
      sortOrder: row.sort_order,
    })
  }

  for (const fallbackStage of FALLBACK_STATO_SALES_STAGES) {
    const options = map.stato_sales ?? []
    const alreadyPresent = options.some(
      (option) =>
        normalizeStatoSalesStageId(option.valueKey) === fallbackStage.id ||
        normalizeStatoSalesStageId(option.valueLabel) === fallbackStage.id
    )

    if (!alreadyPresent) {
      map.stato_sales = [
        ...options,
        {
          valueKey: fallbackStage.id,
          valueLabel: fallbackStage.label,
          color: fallbackStage.color,
          sortOrder: fallbackStage.sortOrder,
        },
      ]
    }
  }

  return map
}

function resolveBadgeColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(value)] ?? null
}

function buildStageDefinitions(lookupRows: LookupValueRecord[]) {
  const stageRows = lookupRows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "processi_matching" &&
      row.entity_field === "stato_sales"
  )

  const byId = new Map<string, StageDefinition>()
  const tokenToStageId = new Map<string, string>()

  for (const row of stageRows) {
    const id = normalizeStatoSalesStageId(row.value_key)
    if (!id) continue

    const label = toStringValue(row.value_label) ?? id
    const color = readLookupColor(row.metadata)
    const stage = {
      id,
      label,
      color,
      sortOrder: row.sort_order,
    }

    byId.set(id, stage)
    tokenToStageId.set(normalizeLookupToken(row.value_key), id)
    tokenToStageId.set(normalizeLookupToken(row.value_label), id)
  }

  for (const fallbackStage of FALLBACK_STATO_SALES_STAGES) {
    if (!byId.has(fallbackStage.id)) {
      byId.set(fallbackStage.id, fallbackStage)
    }
    tokenToStageId.set(normalizeLookupToken(fallbackStage.id), fallbackStage.id)
    tokenToStageId.set(normalizeLookupToken(fallbackStage.label), fallbackStage.id)
  }

  const orderedIds: string[] = []
  for (const rawId of STATO_SALES_COLUMN_ORDER) {
    const normalizedId = normalizeStatoSalesStageId(rawId)
    if (byId.has(normalizedId)) {
      orderedIds.push(normalizedId)
    }
  }

  const orderedIdSet = new Set(orderedIds)
  const orderedStages = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is StageDefinition => Boolean(item))
  const unorderedStages = Array.from(byId.values())
    .filter((stage) => !orderedIdSet.has(stage.id))
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
  const stages = [...orderedStages, ...unorderedStages]

  return { stages, tokenToStageId }
}

/**
 * Bindings between source DB columns and the card fields they populate.
 *
 * These let `mapCardData` rebuild a card while preserving any field whose
 * source column is *not present* in the fresh payload — which happens when
 * the board RPC returns a narrower SELECT than the detail RPC. Without
 * preservation, a board refetch would blank every field the board does not
 * fetch (the open detail panel would visibly empty out).
 *
 * Treatment: if `column in row` is false for a fresh payload, we keep the
 * previousCard's value for the corresponding card field. If the column is
 * present (even if null), the fresh value wins — clearing in DB still
 * propagates correctly.
 */
export const PROCESS_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["stato_res", "statoRes"],
  ["qualificazione_lead", "qualificazioneLead"],
  ["motivo_no_match", "motivoNoMatch"],
  ["modello_smartmatching", "modelloSmartmatching"],
  ["ore_settimanale", "oreSettimana"],
  ["preferenza_giorno", "giornatePreferite"],
  ["sales_cold_call_followup", "salesColdCallFollowup"],
  ["sales_no_show_followup", "salesNoShowFollowup"],
  ["motivazione_lost", "motivazioneLost"],
  ["motivazione_oot", "motivazioneOot"],
  ["appunti_chiamata_sales", "appuntiChiamataSales"],
  ["data_per_ricerca_futura", "dataPerRicercaFutura"],
  ["data_per_ricerca_futura", "dataPerRicercaFuturaRaw"],
  ["creato_il", "dataLead"],
  ["creato_il", "dataLeadRaw"],
  ["sales_cold_call_followup", "tentativiChiamataCount"],
  ["preventivo_firmato", "preventivoAccettato"],
  ["source_url", "origineUrl"],
  ["offerta", "scontoApplicato"],
  ["offerta", "scontoApplicatoRaw"],
  ["orario_di_lavoro", "orarioDiLavoro"],
  ["nucleo_famigliare", "nucleoFamigliare"],
  ["descrizione_casa", "descrizioneCasa"],
  ["metratura_casa", "metraturaCasa"],
  ["descrizione_animali_in_casa", "descrizioneAnimaliInCasa"],
  ["mansioni_richieste", "mansioniRichieste"],
  ["informazioni_extra_riservate", "informazioniExtraRiservate"],
  ["eta_minima", "etaMinima"],
  ["eta_massima", "etaMassima"],
  ["src_embed_maps_annucio", "srcEmbedMapsAnnucio"],
  ["deadline_mobile", "deadlineMobile"],
  ["disponibilita_colloqui_in_presenza", "disponibilitaColloquiInPresenza"],
  ["family_availability_json", "familyAvailabilityJson"],
  ["tipo_incontro_famiglia_lavoratore", "tipoIncontroFamigliaLavoratore"],
  ["richiesta_patente", "richiestaPatente"],
  ["richiesta_trasferte", "richiestaTrasferte"],
  ["richiesta_ferie", "richiestaFerie"],
  ["descrizione_richiesta_trasferte", "descrizioneRichiestaTrasferte"],
  ["descrizione_richiesta_ferie", "descrizioneRichiestaFerie"],
  ["patente", "patenteDettaglio"],
  ["sesso", "sesso"],
  ["nazionalita_escluse", "nazionalitaEscluse"],
  ["nazionalita_obbligatorie", "nazionalitaObbligatorie"],
  ["famiglia_molto_esigente", "famigliaMoltoEsigente"],
  ["richiesta_autonomia", "richiestaAutonomia"],
  ["datore_spesso_presente", "datoreSpessoPresente"],
  ["richiesta_discrezione", "richiestaDiscrezione"],
  ["comunicare_bene_italiano", "comunicareBeneItaliano"],
  ["comunicare_bene_inglese", "comunicareBeneInglese"],
  ["presenza_neonati", "presenzaNeonati"],
  ["piu_bambini", "piuBambini"],
  ["famiglia_4_persone", "famiglia4Persone"],
  ["cani_piccoli", "caniPiccoli"],
  ["cani_grandi", "caniGrandi"],
  ["gatti", "gatti"],
  ["pulire_ripiani_alti", "pulireRipianiAlti"],
  ["stirare", "stirare"],
  ["stirare_abiti_difficili", "stirareAbitiDifficili"],
  ["cucinare", "cucinare"],
  ["cucinare_elaborato", "cucinareElaborato"],
  ["cura_piante", "curaPiante"],
  ["testo_annuncio_whatsapp", "testoAnnuncioWhatsapp"],
  ["tipo_lavoro", "tipoLavoroBadges"],
  ["tipo_lavoro", "tipoLavoroBadge"],
  ["tipo_lavoro", "tipoLavoroColor"],
  ["tipo_lavoro", "tipoLavoroColors"],
  ["tipo_rapporto", "tipoRapportoBadge"],
  ["tipo_rapporto", "tipoRapportoColor"],
  ["numero_giorni_settimanali", "giorniSettimana"],
  ["numero_ricerca_attivata", "numeroRicercaAttivata"],
  ["frequenza_rapporto", "giorniSettimana"],
]

export const FAMILY_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["email", "email"],
  ["telefono", "telefono"],
  ["data_call_prenotata", "dataCallPrenotata"],
  ["data_call_prenotata", "dataCallPrenotataRaw"],
  ["nome", "nomeFamiglia"],
  ["cognome", "nomeFamiglia"],
]

export const ADDRESS_FIELD_BINDINGS: Array<readonly [string, keyof CrmPipelineCardData]> = [
  ["provincia", "indirizzoProvincia"],
  ["provincia_sigla", "indirizzoProvinciaSigla"],
  ["cap", "indirizzoCap"],
  ["note", "indirizzoNote"],
  ["via", "indirizzoVia"],
  ["civico", "indirizzoCivico"],
  ["citta", "indirizzoComune"],
  ["citofono", "indirizzoCitofono"],
  ["id", "indirizzoId"],
]

// Fourth data source: richiesta_attivazione attached to the process. Without
// these bindings, fee_concordata + preventivo fields visibly disappear from
// the open detail panel right after a remote realtime change, even if the
// values are intact in DB (the board fetch may not return them).
export const RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS: Array<
  readonly [string, keyof CrmPipelineCardData]
> = [
  ["id", "richiestaAttivazioneId"],
  ["signed_document_url", "preventivoUrl"],
  ["signed_document_title", "preventivoTitolo"],
  ["fee_concordata", "feeConcordata"],
]

/**
 * For each binding, if the source column is NOT present in `row`, restore
 * the previous card's value. Mutates `card` in place. Pass nullable `row`:
 * if `row` is missing entirely, every bound field falls back to previous.
 */
export function preserveMissingFields(
  card: CrmPipelineCardData,
  previousCard: CrmPipelineCardData,
  row: GenericRow | undefined | null,
  bindings: Array<readonly [string, keyof CrmPipelineCardData]>,
) {
  for (const [column, field] of bindings) {
    if (row && column in row) continue
    ;(card as Record<string, unknown>)[field as string] = previousCard[field]
  }
}

export function mapCardData(
  family: GenericRow,
  process: GenericRow,
  stageId: string,
  lookupColors: LookupColorMap,
  processAddress?: GenericRow,
  richiestaAttivazione?: RichiestaAttivazioneRecord | null,
  previousCard?: CrmPipelineCardData,
): CrmPipelineCardData {
  const familyName = [toStringValue(family.nome), toStringValue(family.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")

  const processId = displayValue(process.id)
  const famigliaId = displayValue(process.famiglia_id)
  const preventivoSessionId = toStringValue(process.id)
  const tipoLavoroBadges = getStringArrayValue(process.tipo_lavoro)
    .map((value) => canonicalizeLookupValue("tipo_lavoro", value))
    .filter((value): value is string => Boolean(value))
  const tipoLavoroBadge = canonicalizeLookupValue(
    "tipo_lavoro",
    getFirstArrayValue(process.tipo_lavoro)
  )
  const tipoRapportoBadge = canonicalizeLookupValue(
    "tipo_rapporto",
    getFirstArrayValue(process.tipo_rapporto)
  )
  const giorniSettimanaValue =
    toStringValue(process.numero_giorni_settimanali) ??
    extractFirstNumberToken(process.frequenza_rapporto) ??
    "-"

  const card: CrmPipelineCardData = {
    id: processId,
    famigliaId,
    numeroRicercaAttivata: toStringValue(process.numero_ricerca_attivata),
    stage: stageId,
    nomeFamiglia: familyName || "-",
    email: displayValue(family.email),
    telefono: displayValue(family.telefono),
    dataLead: formatItalianDate(process.creato_il),
    tipoLavoroBadges,
    tipoLavoroColors: Object.fromEntries(
      tipoLavoroBadges.map((value) => [
        value,
        resolveBadgeColor(
          lookupColors,
          "processi_matching",
          "tipo_lavoro",
          value
        ),
      ])
    ),
    tipoLavoroBadge,
    tipoLavoroColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_lavoro",
      tipoLavoroBadge
    ),
    tipoRapportoBadge,
    tipoRapportoColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_rapporto",
      tipoRapportoBadge
    ),
    statoRes: displayValue(process.stato_res),
    qualificazioneLead: displayValue(process.qualificazione_lead),
    motivoNoMatch: displayValue(process.motivo_no_match),
    modelloSmartmatching: displayValue(process.modello_smartmatching),
    oreSettimana: displayValue(process.ore_settimanale),
    giorniSettimana: giorniSettimanaValue,
    giornatePreferite: getStringArrayValue(process.preferenza_giorno),
    salesColdCallFollowup: displayValue(process.sales_cold_call_followup),
    salesNoShowFollowup: displayValue(process.sales_no_show_followup),
    motivazioneLost: displayValue(process.motivazione_lost),
    motivazioneOot: displayValue(process.motivazione_oot),
    appuntiChiamataSales: displayValue(process.appunti_chiamata_sales),
    dataPerRicercaFutura: formatItalianDate(process.data_per_ricerca_futura),
    dataCallPrenotata: formatItalianDateTime(family.data_call_prenotata),
    dataLeadRaw: toStringValue(process.creato_il),
    dataPerRicercaFuturaRaw: toStringValue(process.data_per_ricerca_futura),
    dataCallPrenotataRaw: toStringValue(family.data_call_prenotata),
    tentativiChiamataCount: getCallAttemptCount(process.sales_cold_call_followup),
    preventivoAccettato: toBooleanValue(process.preventivo_firmato) ?? false,
    richiestaAttivazioneId: richiestaAttivazione?.id ?? null,
    preventivoUrl: richiestaAttivazione?.signed_document_url ?? null,
    preventivoTitolo: richiestaAttivazione?.signed_document_title ?? null,
    preventivoSessionId,
    preventivoAcceptanceUrl: buildPreventivoAcceptanceUrl(preventivoSessionId),
    feeConcordata: richiestaAttivazione?.fee_concordata ?? null,
    origineUrl: toStringValue(process.source_url),
    scontoApplicatoRaw: toStringValue(process.offerta),
    scontoApplicato: displayValue(process.offerta),
    orarioDiLavoro: displayValue(process.orario_di_lavoro),
    nucleoFamigliare: displayValue(process.nucleo_famigliare),
    descrizioneCasa: displayValue(process.descrizione_casa),
    metraturaCasa: displayValue(process.metratura_casa),
    descrizioneAnimaliInCasa: displayValue(process.descrizione_animali_in_casa),
    mansioniRichieste: displayValue(process.mansioni_richieste),
    informazioniExtraRiservate: displayValue(process.informazioni_extra_riservate),
    etaMinima: displayValue(process.eta_minima),
    etaMassima: displayValue(process.eta_massima),
    indirizzoProvincia: displayValue(
      processAddress?.provincia_sigla ?? processAddress?.provincia,
    ),
    indirizzoProvinciaSigla: displayValue(
      processAddress?.provincia_sigla ?? processAddress?.provincia,
    ),
    indirizzoCap: displayValue(processAddress?.cap),
    indirizzoNote: displayValue(processAddress?.note),
    indirizzoId: toStringValue(processAddress?.id),
    indirizzoCompleto: displayValue(buildAddressLine(processAddress)),
    indirizzoVia: displayValue(processAddress?.via),
    indirizzoCivico: displayValue(processAddress?.civico),
    indirizzoComune: displayValue(processAddress?.citta),
    indirizzoCitofono: displayValue(processAddress?.citofono),
    srcEmbedMapsAnnucio: displayValue(process.src_embed_maps_annucio),
    deadlineMobile: formatItalianDate(process.deadline_mobile),
    disponibilitaColloquiInPresenza: displayValue(
      process.disponibilita_colloqui_in_presenza
    ),
    familyAvailabilityJson: toStringValue(process.family_availability_json),
    tipoIncontroFamigliaLavoratore: displayValue(
      process.tipo_incontro_famiglia_lavoratore
    ),
    richiestaPatente: toBooleanValue(process.richiesta_patente) ?? false,
    richiestaTrasferte: toBooleanValue(process.richiesta_trasferte) ?? false,
    richiestaFerie: toBooleanValue(process.richiesta_ferie) ?? false,
    descrizioneRichiestaTrasferte: displayValue(process.descrizione_richiesta_trasferte),
    descrizioneRichiestaFerie: displayValue(process.descrizione_richiesta_ferie),
    patenteDettaglio: getFirstArrayValue(process.patente) ?? displayValue(process.patente),
    sesso: toStringValue(process.sesso),
    nazionalitaEscluse: getStringArrayValue(process.nazionalita_escluse),
    nazionalitaObbligatorie: getStringArrayValue(process.nazionalita_obbligatorie),
    famigliaMoltoEsigente: toBooleanValue(process.famiglia_molto_esigente) ?? false,
    richiestaAutonomia: toBooleanValue(process.richiesta_autonomia) ?? false,
    datoreSpessoPresente: toBooleanValue(process.datore_spesso_presente) ?? false,
    richiestaDiscrezione: toBooleanValue(process.richiesta_discrezione) ?? false,
    comunicareBeneItaliano: toBooleanValue(process.comunicare_bene_italiano) ?? false,
    comunicareBeneInglese: toBooleanValue(process.comunicare_bene_inglese) ?? false,
    presenzaNeonati: toBooleanValue(process.presenza_neonati) ?? false,
    piuBambini: toBooleanValue(process.piu_bambini) ?? false,
    famiglia4Persone: toBooleanValue(process.famiglia_4_persone) ?? false,
    caniPiccoli: toBooleanValue(process.cani_piccoli) ?? false,
    caniGrandi: toBooleanValue(process.cani_grandi) ?? false,
    gatti: toBooleanValue(process.gatti) ?? false,
    pulireRipianiAlti: toBooleanValue(process.pulire_ripiani_alti) ?? false,
    stirare: toBooleanValue(process.stirare) ?? false,
    stirareAbitiDifficili: toBooleanValue(process.stirare_abiti_difficili) ?? false,
    cucinare: toBooleanValue(process.cucinare) ?? false,
    cucinareElaborato: toBooleanValue(process.cucinare_elaborato) ?? false,
    curaPiante: toBooleanValue(process.cura_piante) ?? false,
    testoAnnuncioWhatsapp: displayValue(process.testo_annuncio_whatsapp),
  }

  if (previousCard) {
    preserveMissingFields(card, previousCard, process, PROCESS_FIELD_BINDINGS)
    preserveMissingFields(card, previousCard, family, FAMILY_FIELD_BINDINGS)
    preserveMissingFields(card, previousCard, processAddress, ADDRESS_FIELD_BINDINGS)
    preserveMissingFields(
      card,
      previousCard,
      (richiestaAttivazione ?? undefined) as GenericRow | undefined,
      RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
    )
  }

  return card
}

function mapBoardEntryToCard(
  entry: BoardRecordEntry,
  stageId: string,
  lookupColors: LookupColorMap,
  previousCard?: CrmPipelineCardData,
) {
  if (!entry.family) return null

  return mapCardData(
    entry.family,
    entry.process,
    stageId,
    lookupColors,
    entry.address ?? undefined,
    entry.richiestaAttivazione,
    previousCard,
  )
}

function buildSalesStageCounts(
  groups: Array<{ value: string; count: number }>,
  tokenToStageId: Map<string, string>
) {
  const counts = new Map<string, number>()

  for (const group of groups) {
    const token = normalizeLookupToken(group.value)
    const stageId = tokenToStageId.get(token) ?? token
    if (!stageId) continue
    counts.set(stageId, (counts.get(stageId) ?? 0) + group.count)
  }

  return counts
}

function getStageFilterValues(stages: StageDefinition[], loadedClosedStageIds: Set<string>) {
  const values: string[] = []

  for (const stage of stages) {
    if (
      CLOSED_STAGE_IDS.has(stage.id) &&
      !loadedClosedStageIds.has(stage.id)
    ) {
      continue
    }

    values.push(stage.id, stage.label)
  }

  return Array.from(new Set(values.filter(Boolean)))
}

function hasActiveServerFilters(searchQuery: string, filters: CrmPipelineFilters) {
  return (
    Boolean(searchQuery.trim()) ||
    Boolean(filters.createdFrom) ||
    Boolean(filters.createdTo) ||
    Boolean(filters.tipoLavoro?.length) ||
    filters.preventivoAccettato !== null ||
    filters.chiamataPrenotata !== null
  )
}

async function fetchBoardRecordsWithRpc(
  stageFilter: string[],
  searchQuery: string,
  filters: CrmPipelineFilters
): Promise<BoardRecordBundle> {
  const result = await fetchCrmPipelineFamiglieBoard({
    limit: searchQuery.trim() ? CRM_PIPELINE_SEARCH_CARD_LIMIT : CRM_PIPELINE_CARD_LIMIT,
    offset: 0,
    stageFilter,
    search: searchQuery,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    tipoLavoro: filters.tipoLavoro,
    preventivoAccettato: filters.preventivoAccettato,
    chiamataPrenotata: filters.chiamataPrenotata,
  })

  return {
    entries: result.rows
      .map((row) => ({
        process: row.process,
        family: row.family,
        address: row.address,
        richiestaAttivazione: (row.richiesta_attivazione ?? null) as RichiestaAttivazioneRecord | null,
      }))
      .filter((entry) => Boolean(entry.process)),
    stageGroups: result.stageCounts,
  }
}

async function fetchBoardRecordsForStages(
  stageFilter: string[],
  searchQuery: string,
  filters: CrmPipelineFilters
): Promise<BoardRecordBundle> {
  // FASE 4 BIS: rimosso il fallback table-query (fetchBoardRecordsWithTableQueries).
  // La board RPC crm_pipeline_famiglie_board è la sola fonte; gli errori
  // propagano e diventano visibili via toast invece di mascherarsi.
  return fetchBoardRecordsWithRpc(stageFilter, searchQuery, filters)
}

async function fetchBoardData(
  loadedClosedStageIds: Set<string>,
  searchQuery: string,
  filters: CrmPipelineFilters,
  /**
   * Called lazily at mapping time (AFTER the network fetch) so any concurrent
   * `setBoardData` (e.g. from a parallel `loadProcessDetail`) is observed
   * when we merge previous detail-only fields. Reading a snapshot at queryFn
   * start would race against detail refetches and reinstate stale values.
   */
  getPreviousCard?: (processId: string) => CrmPipelineCardData | undefined,
): Promise<FetchBoardDataResult> {
  const normalizedSearchQuery = searchQuery.trim()
  const lookupResult = await fetchLookupValues()
  const lookupRows = lookupResult.rows
  const lookupColors = buildLookupColorMap(lookupRows)
  const lookupOptionsByField = buildLookupOptionsByField(lookupRows)
  const { stages, tokenToStageId } = buildStageDefinitions(lookupRows)
  const effectiveLoadedClosedStageIds = hasActiveServerFilters(
    normalizedSearchQuery,
    filters
  )
    ? new Set([...loadedClosedStageIds, ...CLOSED_STAGE_IDS])
    : loadedClosedStageIds
  const boardRecords = await fetchBoardRecordsForStages(
    getStageFilterValues(stages, effectiveLoadedClosedStageIds),
    normalizedSearchQuery,
    filters
  )
  const salesStageCounts = buildSalesStageCounts(
    boardRecords.stageGroups,
    tokenToStageId
  )
  if (stages.length === 0) {
    return {
      columns: [],
      lookupOptionsByField,
    }
  }

  const cardsByStage = new Map<string, CrmPipelineCardData[]>()
  for (const stage of stages) {
    cardsByStage.set(stage.id, [])
  }

  for (const { process, family, address, richiestaAttivazione } of boardRecords.entries) {
    if (!family) continue

    const statusToken = normalizeLookupToken(toStringValue(process.stato_sales))
    const stageId = tokenToStageId.get(statusToken)
    if (!stageId) continue

    const processId = toStringValue(process.id)
    const previousCard = processId ? getPreviousCard?.(processId) : undefined
    const card = mapBoardEntryToCard(
      { process, family, address, richiestaAttivazione },
      stageId,
      lookupColors,
      previousCard,
    )
    if (!card) continue
    cardsByStage.get(stageId)?.push(card)
  }

  return {
    columns: stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      totalCount: salesStageCounts.get(stage.id) ?? cardsByStage.get(stage.id)?.length ?? 0,
      cards: sortCardsForStage(cardsByStage.get(stage.id) ?? [], stage.id),
    })),
    lookupOptionsByField,
  }
}

function serializeCrmPipelineFilters(filters: CrmPipelineFilters) {
  return JSON.stringify({
    createdFrom: filters.createdFrom ?? null,
    createdTo: filters.createdTo ?? null,
    tipoLavoro: [...(filters.tipoLavoro ?? [])].sort(),
    preventivoAccettato: filters.preventivoAccettato ?? null,
    chiamataPrenotata: filters.chiamataPrenotata ?? null,
  })
}

export function useCrmPipelinePreview(
  searchQuery = "",
  filters: CrmPipelineFilters = {},
  openProcessId: string | null = null
): UseCrmPipelinePreviewState {
  const queryClient = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)
  const [loadedClosedStageIds, setLoadedClosedStageIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const filtersKey = React.useMemo(() => serializeCrmPipelineFilters(filters), [filters])
  const stableFilters = React.useMemo(
    () => JSON.parse(filtersKey) as CrmPipelineFilters,
    [filtersKey]
  )

  const boardQueryKey = React.useMemo(
    () =>
      [
        "crm-pipeline-board",
        filtersKey,
        searchQuery,
        Array.from(loadedClosedStageIds).sort().join(","),
      ] as const,
    [filtersKey, searchQuery, loadedClosedStageIds],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () =>
      fetchBoardData(
        loadedClosedStageIds,
        searchQuery,
        stableFilters,
        // Read the latest cached card at mapping time (after the fetch) so
        // any concurrent setBoardData (e.g. loadProcessDetail completing
        // mid-fetch) is observed and we never reinstate a stale snapshot.
        (processId) => {
          const latest = queryClient.getQueryData<FetchBoardDataResult>(boardQueryKey)
          if (!latest) return undefined
          for (const column of latest.columns) {
            const card = column.cards.find((c) => c.id === processId)
            if (card) return card
          }
          return undefined
        },
      ),
  })

  const columns = React.useMemo(() => data?.columns ?? [], [data?.columns])
  const lookupOptionsByField = React.useMemo(
    () => data?.lookupOptionsByField ?? ({} as LookupOptionsByField),
    [data?.lookupOptionsByField],
  )

  type CrmBoardData = NonNullable<typeof data>

  const setBoardData = React.useCallback(
    (updater: (previous: CrmBoardData | undefined) => CrmBoardData | undefined) => {
      queryClient.setQueryData<CrmBoardData>(boardQueryKey, (previous) => updater(previous))
    },
    [queryClient, boardQueryKey],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["crm-pipeline-board"] })
  }, [queryClient])

  const loadClosedStage = React.useCallback((stageId: string) => {
    if (!CLOSED_STAGE_IDS.has(stageId)) return
    setLoadedClosedStageIds((current) => {
      if (current.has(stageId)) return current
      const next = new Set(current)
      next.add(stageId)
      return next
    })
  }, [])

  const loadProcessDetail = React.useCallback(async (processId: string) => {
    setError(null)

    try {
      const [detailRow, lookupResult] = await Promise.all([
        fetchCrmPipelineFamigliaDetail(processId),
        fetchLookupValues(),
      ])
      if (!detailRow?.process) return

      const lookupColors = buildLookupColorMap(lookupResult.rows)
      const statusToken = normalizeLookupToken(toStringValue(detailRow.process.stato_sales))
      const { tokenToStageId } = buildStageDefinitions(lookupResult.rows)
      const stageId = tokenToStageId.get(statusToken)
      if (!stageId) return

      let address = detailRow.address
      if (!toStringValue(address?.id)) {
        address = (await fetchProcessAddressesByIds([processId])).get(processId) ?? address
      }

      const card = mapBoardEntryToCard(
        {
          process: detailRow.process,
          family: detailRow.family,
          address,
          richiestaAttivazione:
            (detailRow.richiesta_attivazione ?? null) as RichiestaAttivazioneRecord | null,
        },
        stageId,
        lookupColors
      )
      if (!card) return

      setBoardData((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          columns: previous.columns.map((column) => ({
            ...column,
            cards: sortCardsForStage(
              column.cards.map((currentCard) =>
                currentCard.id === processId ? card : currentCard,
              ),
              column.id,
            ),
          })),
        }
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Errore caricando dettaglio ricerca"
      setError(message)
    }
  }, [setBoardData])

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      setError(null)

      const sourceColumnIndex = columns.findIndex((column) =>
        column.cards.some((card) => card.id === processId)
      )
      if (sourceColumnIndex === -1) return

      const targetColumnIndex = columns.findIndex(
        (column) => column.id === targetStageId
      )
      if (targetColumnIndex === -1) return

      const sourceColumn = columns[sourceColumnIndex]
      const cardIndex = sourceColumn.cards.findIndex(
        (card) => card.id === processId
      )
      if (cardIndex === -1) return

      if (sourceColumn.id === targetStageId) {
        return
      }

      const movedCard = sourceColumn.cards[cardIndex]

      const updatedSourceCards = sourceColumn.cards.filter(
        (card) => card.id !== processId
      )
      const targetColumn = columns[targetColumnIndex]
      const updatedTargetCards = [
        { ...movedCard, stage: targetStageId },
        ...targetColumn.cards,
      ]

      const previousColumns = columns
      const optimisticColumns = columns.map((column) => {
        if (column.id === sourceColumn.id) {
          return {
            ...column,
            totalCount: Math.max(0, column.totalCount - 1),
            cards: sortCardsForStage(updatedSourceCards, sourceColumn.id),
          }
        }
        if (column.id === targetStageId) {
          return {
            ...column,
            totalCount: column.totalCount + 1,
            cards: sortCardsForStage(updatedTargetCards, targetStageId),
          }
        }
        return column
      })

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateProcessoMatchingStatoSales(processId, targetStageId)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato ricerca su Supabase"
        setError(message)
      }
    },
    [columns, setBoardData]
  )

  const updateProcessCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      setError(null)
      const normalizedPatch = normalizeLookupPatchLabels(
        patch,
        lookupOptionsByField
      )

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(column.cards.map((card) => {
          if (card.id !== processId) return card

          const nextCard = { ...card }

          if (typeof patch.stato_sales === "string" && patch.stato_sales.trim()) {
            nextCard.stage = patch.stato_sales.trim()
          }
          if ("tipo_lavoro" in normalizedPatch) {
            const nextTipoLavori = getStringArrayValue(normalizedPatch.tipo_lavoro)
            const nextTipoLavoro = getFirstArrayValue(normalizedPatch.tipo_lavoro)
            nextCard.tipoLavoroBadges = nextTipoLavori
            nextCard.tipoLavoroColors = Object.fromEntries(
              nextTipoLavori.map((value) => [
                value,
                resolveLookupOptionColor(
                  lookupOptionsByField,
                  "tipo_lavoro",
                  value
                ),
              ])
            )
            nextCard.tipoLavoroBadge = nextTipoLavoro
            nextCard.tipoLavoroColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_lavoro",
              nextTipoLavoro
            )
          }
          if ("tipo_rapporto" in normalizedPatch) {
            const nextTipoRapporto = getFirstArrayValue(normalizedPatch.tipo_rapporto)
            nextCard.tipoRapportoBadge = nextTipoRapporto
            nextCard.tipoRapportoColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_rapporto",
              nextTipoRapporto
            )
          }
          if ("sales_cold_call_followup" in normalizedPatch) {
            nextCard.salesColdCallFollowup = displayValue(
              normalizedPatch.sales_cold_call_followup
            )
            nextCard.tentativiChiamataCount = getCallAttemptCount(
              normalizedPatch.sales_cold_call_followup
            )
          }
          if ("sales_no_show_followup" in normalizedPatch) {
            nextCard.salesNoShowFollowup = displayValue(
              normalizedPatch.sales_no_show_followup
            )
          }
          if ("motivazione_lost" in normalizedPatch) {
            nextCard.motivazioneLost = displayValue(normalizedPatch.motivazione_lost)
          }
          if ("motivazione_oot" in normalizedPatch) {
            nextCard.motivazioneOot = displayValue(normalizedPatch.motivazione_oot)
          }
          if ("appunti_chiamata_sales" in patch) {
            nextCard.appuntiChiamataSales = displayValue(
              patch.appunti_chiamata_sales
            )
          }
          if ("data_per_ricerca_futura" in patch) {
            nextCard.dataPerRicercaFutura = formatItalianDate(
              patch.data_per_ricerca_futura
            )
            nextCard.dataPerRicercaFuturaRaw = toStringValue(
              patch.data_per_ricerca_futura
            )
          }
          if ("orario_di_lavoro" in patch) {
            nextCard.orarioDiLavoro = displayValue(patch.orario_di_lavoro)
          }
          if ("stato_res" in normalizedPatch) {
            nextCard.statoRes = displayValue(normalizedPatch.stato_res)
          }
          if ("qualificazione_lead" in normalizedPatch) {
            nextCard.qualificazioneLead = displayValue(normalizedPatch.qualificazione_lead)
          }
          if ("motivo_no_match" in normalizedPatch) {
            nextCard.motivoNoMatch = displayValue(normalizedPatch.motivo_no_match)
          }
          if ("modello_smartmatching" in patch) {
            nextCard.modelloSmartmatching = displayValue(
              patch.modello_smartmatching
            )
          }
          if ("ore_settimanale" in patch) {
            nextCard.oreSettimana = displayValue(patch.ore_settimanale)
          }
          if ("numero_giorni_settimanali" in patch) {
            nextCard.giorniSettimana = displayValue(
              patch.numero_giorni_settimanali
            )
          }
          if ("preferenza_giorno" in normalizedPatch) {
            nextCard.giornatePreferite = getStringArrayValue(normalizedPatch.preferenza_giorno)
          }
          if ("nucleo_famigliare" in patch) {
            nextCard.nucleoFamigliare = displayValue(patch.nucleo_famigliare)
          }
          if ("descrizione_casa" in patch) {
            nextCard.descrizioneCasa = displayValue(patch.descrizione_casa)
          }
          if ("metratura_casa" in patch) {
            nextCard.metraturaCasa = displayValue(patch.metratura_casa)
          }
          if ("descrizione_animali_in_casa" in patch) {
            nextCard.descrizioneAnimaliInCasa = displayValue(
              patch.descrizione_animali_in_casa
            )
          }
          if ("mansioni_richieste" in patch) {
            nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste)
          }
          if ("sesso" in patch) {
            nextCard.sesso = toStringValue(patch.sesso)
          }
          if ("nazionalita_escluse" in patch) {
            nextCard.nazionalitaEscluse = getStringArrayValue(patch.nazionalita_escluse)
          }
          if ("nazionalita_obbligatorie" in patch) {
            nextCard.nazionalitaObbligatorie = getStringArrayValue(
              patch.nazionalita_obbligatorie
            )
          }
          if ("famiglia_molto_esigente" in patch) {
            nextCard.famigliaMoltoEsigente =
              toBooleanValue(patch.famiglia_molto_esigente) ?? false
          }
          if ("richiesta_autonomia" in patch) {
            nextCard.richiestaAutonomia =
              toBooleanValue(patch.richiesta_autonomia) ?? false
          }
          if ("datore_spesso_presente" in patch) {
            nextCard.datoreSpessoPresente =
              toBooleanValue(patch.datore_spesso_presente) ?? false
          }
          if ("richiesta_discrezione" in patch) {
            nextCard.richiestaDiscrezione =
              toBooleanValue(patch.richiesta_discrezione) ?? false
          }
          if ("comunicare_bene_italiano" in patch) {
            nextCard.comunicareBeneItaliano =
              toBooleanValue(patch.comunicare_bene_italiano) ?? false
          }
          if ("comunicare_bene_inglese" in patch) {
            nextCard.comunicareBeneInglese =
              toBooleanValue(patch.comunicare_bene_inglese) ?? false
          }
          if ("presenza_neonati" in patch) {
            nextCard.presenzaNeonati = toBooleanValue(patch.presenza_neonati) ?? false
          }
          if ("piu_bambini" in patch) {
            nextCard.piuBambini = toBooleanValue(patch.piu_bambini) ?? false
          }
          if ("famiglia_4_persone" in patch) {
            nextCard.famiglia4Persone =
              toBooleanValue(patch.famiglia_4_persone) ?? false
          }
          if ("cani_piccoli" in patch) {
            nextCard.caniPiccoli = toBooleanValue(patch.cani_piccoli) ?? false
          }
          if ("cani_grandi" in patch) {
            nextCard.caniGrandi = toBooleanValue(patch.cani_grandi) ?? false
          }
          if ("gatti" in patch) {
            nextCard.gatti = toBooleanValue(patch.gatti) ?? false
          }
          if ("pulire_ripiani_alti" in patch) {
            nextCard.pulireRipianiAlti =
              toBooleanValue(patch.pulire_ripiani_alti) ?? false
          }
          if ("stirare" in patch) {
            nextCard.stirare = toBooleanValue(patch.stirare) ?? false
          }
          if ("stirare_abiti_difficili" in patch) {
            nextCard.stirareAbitiDifficili =
              toBooleanValue(patch.stirare_abiti_difficili) ?? false
          }
          if ("cucinare" in patch) {
            nextCard.cucinare = toBooleanValue(patch.cucinare) ?? false
          }
          if ("cucinare_elaborato" in patch) {
            nextCard.cucinareElaborato =
              toBooleanValue(patch.cucinare_elaborato) ?? false
          }
          if ("cura_piante" in patch) {
            nextCard.curaPiante = toBooleanValue(patch.cura_piante) ?? false
          }
          if ("richiesta_patente" in patch) {
            nextCard.richiestaPatente =
              toBooleanValue(patch.richiesta_patente) ?? false
          }
          if ("richiesta_trasferte" in patch) {
            nextCard.richiestaTrasferte =
              toBooleanValue(patch.richiesta_trasferte) ?? false
          }
          if ("richiesta_ferie" in patch) {
            nextCard.richiestaFerie = toBooleanValue(patch.richiesta_ferie) ?? false
          }
          if ("preventivo_firmato" in patch) {
            nextCard.preventivoAccettato =
              toBooleanValue(patch.preventivo_firmato) ?? false
          }
          if ("offerta" in patch) {
            nextCard.scontoApplicatoRaw = toStringValue(patch.offerta)
            nextCard.scontoApplicato = displayValue(patch.offerta)
          }
          if ("source_url" in patch) {
            nextCard.origineUrl = toStringValue(patch.source_url)
          }
          if ("descrizione_richiesta_trasferte" in patch) {
            nextCard.descrizioneRichiestaTrasferte = displayValue(
              patch.descrizione_richiesta_trasferte
            )
          }
          if ("descrizione_richiesta_ferie" in patch) {
            nextCard.descrizioneRichiestaFerie = displayValue(
              patch.descrizione_richiesta_ferie
            )
          }
          if ("patente" in patch) {
            nextCard.patenteDettaglio = getFirstArrayValue(patch.patente) ?? "-"
          }
          if ("eta_minima" in patch) {
            nextCard.etaMinima = displayValue(patch.eta_minima)
          }
          if ("eta_massima" in patch) {
            nextCard.etaMassima = displayValue(patch.eta_massima)
          }
          if ("informazioni_extra_riservate" in patch) {
            nextCard.informazioniExtraRiservate = displayValue(
              patch.informazioni_extra_riservate
            )
          }
          if ("indirizzo_prova_provincia" in patch) {
            nextCard.indirizzoProvincia = displayValue(patch.indirizzo_prova_provincia)
          }
          if ("indirizzo_prova_cap" in patch) {
            nextCard.indirizzoCap = displayValue(patch.indirizzo_prova_cap)
          }
          if ("indirizzo_prova_note" in patch) {
            nextCard.indirizzoNote = displayValue(patch.indirizzo_prova_note)
          }
          if ("src_embed_maps_annucio" in patch) {
            nextCard.srcEmbedMapsAnnucio = displayValue(patch.src_embed_maps_annucio)
          }
          if ("deadline_mobile" in patch) {
            nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile)
          }
          if ("disponibilita_colloqui_in_presenza" in patch) {
            nextCard.disponibilitaColloquiInPresenza = displayValue(
              patch.disponibilita_colloqui_in_presenza
            )
          }
          if ("family_availability_json" in patch) {
            nextCard.familyAvailabilityJson = toStringValue(patch.family_availability_json)
          }
          if ("tipo_incontro_famiglia_lavoratore" in patch) {
            nextCard.tipoIncontroFamigliaLavoratore = displayValue(
              patch.tipo_incontro_famiglia_lavoratore
            )
          }
          if ("testo_annuncio_whatsapp" in patch) {
            nextCard.testoAnnuncioWhatsapp = displayValue(
              patch.testo_annuncio_whatsapp
            )
          }

          return nextCard
        }), column.id),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateRecord("processi_matching", processId, normalizedPatch)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, lookupOptionsByField, setBoardData]
  )

  const updateFamilyCard = React.useCallback(
    async (familyId: string, patch: Record<string, unknown>) => {
      setError(null)

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(
          column.cards.map((card) => {
            if (card.famigliaId !== familyId) return card

            const nextCard = { ...card }

            if ("data_call_prenotata" in patch) {
              nextCard.dataCallPrenotata = formatItalianDateTime(
                patch.data_call_prenotata
              )
              nextCard.dataCallPrenotataRaw = toStringValue(
                patch.data_call_prenotata
              )
            }
            if ("email" in patch) {
              nextCard.email = displayValue(patch.email)
            }
            if ("telefono" in patch) {
              nextCard.telefono = displayValue(patch.telefono)
            }
            if ("nome" in patch || "cognome" in patch) {
              const nome = toStringValue(patch.nome)
              const cognome = toStringValue(patch.cognome)
              nextCard.nomeFamiglia = [nome, cognome]
                .filter((value): value is string => Boolean(value))
                .join(" ") || "-"
            }

            return nextCard
          }),
          column.id
        ),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateRecord("famiglie", familyId, patch)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando famiglia su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, setBoardData]
  )

  // Serialize concurrent address-create calls per process so that field
  // patches firing before the first INSERT returns don't each create a
  // new `indirizzi` row.
  const pendingAddressCreateRef = React.useRef<Map<string, Promise<string | null>>>(new Map())

  const updateAddressCard = React.useCallback(
    async (
      processId: string,
      addressId: string | null,
      patch: Record<string, unknown>
    ) => {
      setError(null)

      if (!addressId && !Object.values(patch).some((value) => toStringValue(value))) {
        return
      }

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(
          column.cards.map((card) => {
            if (card.id !== processId) return card

            const nextCard = { ...card }
            if (addressId) {
              nextCard.indirizzoId = addressId
            }
            if ("provincia" in patch) {
              nextCard.indirizzoProvincia = displayValue(patch.provincia)
            }
            if ("provincia_sigla" in patch) {
              nextCard.indirizzoProvinciaSigla = displayValue(patch.provincia_sigla)
              nextCard.indirizzoProvincia = displayValue(patch.provincia_sigla)
            }
            if ("cap" in patch) {
              nextCard.indirizzoCap = displayValue(patch.cap)
            }
            if ("note" in patch) {
              nextCard.indirizzoNote = displayValue(patch.note)
            }
            if ("via" in patch) {
              nextCard.indirizzoVia = displayValue(patch.via)
            }

            return nextCard
          }),
          column.id
        ),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        if (addressId) {
          await updateRecord("indirizzi", addressId, patch)
          return
        }

        const pending = pendingAddressCreateRef.current.get(processId)
        if (pending) {
          const existingId = await pending
          if (existingId) {
            await updateRecord("indirizzi", existingId, patch)
            return
          }
        }

        const createPromise = createRecord("indirizzi", {
          entita_tabella: "processi_matching",
          entita_id: processId,
          tipo_indirizzo: "luogo",
          ...patch,
        }).then((response) => toStringValue(response.row.id))

        pendingAddressCreateRef.current.set(processId, createPromise)
        let createdAddressId: string | null = null
        try {
          createdAddressId = await createPromise
        } finally {
          if (pendingAddressCreateRef.current.get(processId) === createPromise) {
            pendingAddressCreateRef.current.delete(processId)
          }
        }
        if (!createdAddressId) return

        setBoardData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            columns: prev.columns.map((column) => ({
              ...column,
              cards: column.cards.map((card) =>
                card.id === processId
                  ? { ...card, indirizzoId: createdAddressId }
                  : card,
              ),
            })),
          }
        })
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando indirizzo su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, setBoardData]
  )

  // Track the currently-open detail card so the realtime reload can re-enrich
  // its detail-only fields instead of leaving them stale.
  const openProcessIdRef = React.useRef<string | null>(openProcessId)
  React.useEffect(() => {
    openProcessIdRef.current = openProcessId
  }, [openProcessId])

  useRealtimeBoardSync({
    tables: CRM_REALTIME_TABLES,
    reload: invalidateBoard,
    reloadOpenDetail: () => {
      const openId = openProcessIdRef.current
      return openId ? loadProcessDetail(openId) : undefined
    },
    debounceMs: CRM_REALTIME_RELOAD_DEBOUNCE_MS,
  })

  const combinedError =
    error ?? (queryError instanceof Error ? queryError.message : null)

  return {
    loading,
    error: combinedError,
    columns,
    lookupOptionsByField,
    loadedClosedStageIds,
    loadClosedStage,
    loadProcessDetail,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
    updateAddressCard,
  }
}
