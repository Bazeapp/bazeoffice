import * as React from "react"
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import type { FilterField } from "@/components/data-table/data-table-filters"
import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import {
  asLavoratoreRecord,
  getAgeFromBirthDate,
  asString,
  asStringArrayFirst,
  formatWorkerLocationLabel,
  normalizeDomesticRoleLabels,
  toListItem,
  toReadableColumnLabel,
} from "@/features/lavoratori/lib/base-utils"
import {
  type LookupOption,
  isBlacklistValue,
  normalizeLookupColors,
  normalizeLookupOptions,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils"
import { useTableQueryState } from "@/hooks/use-table-query-state"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import {
  type QueryFilterCondition,
  type QueryFilterGroup,
  type TableColumnMeta,
  fetchDocumentiLavoratoriByWorker,
  fetchEsperienzeLavoratoriByWorker,
  fetchFamiglie,
  fetchIndirizzi,
  fetchLookupValues,
  fetchLavoratori,
  fetchProcessiMatching,
  fetchReferenzeLavoratoriByWorker,
  fetchSelezioniLavoratori,
} from "@/lib/anagrafiche-api"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { LookupValueRecord } from "@/types/entities/lookup-values"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"

const DEFAULT_PAGE_SIZE = 50
const SERVER_QUERY_DEBOUNCE_MS = 700
const VIEWS_STORAGE_KEY = "lavoratori.cerca.saved-views"
const ADDRESS_BATCH_SIZE = 120
const RELATED_SELECTIONS_PAGE_SIZE = 500
const RELATED_WORKER_BATCH_SIZE = 50
const RELATED_PROCESS_BATCH_SIZE = 150
const RELATED_FAMILY_BATCH_SIZE = 150

const DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
  "prova in corso",
  "prova con cliente",
  "match",
])
const DIRECT_INVOLVEMENT_WORK_STATUS_TOKEN = "non attivo"
const GATE1_BLOCKING_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
])
const OTHER_SEARCH_GROUP_A_PROCESS_STATUS_TOKENS = new Set([
  "da assegnare",
  "raccolta candidature",
  "fare ricerca",
  "in preparazione per invio",
  "in preparazione per l invio",
])
const OTHER_SEARCH_GROUP_A_SELECTION_STATUS_TOKENS = new Set([
  "prospetto",
  "candidato poor fit",
  "candidato good fit",
  "da colloquiare",
  "non risponde",
  "invitato a colloquio",
  "selezionato",
  "inviato al cliente",
])
const OTHER_SEARCH_GROUP_B_PROCESS_STATUS_TOKENS = new Set([
  "inviare selezione",
  "selezione inviata in attesa di feedback",
  "selezione inviata ma in attesa di feedback",
  "fase di colloquio",
  "fase di colloqui",
  "in prova col lavoratore",
  "in prova con lavoratore",
  "match",
  "no match",
])
const OTHER_SEARCH_GROUP_B_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
  "prova in corso",
  "prova con cliente",
  "match",
  "no match",
])

type GenericRow = Record<string, unknown>

type UseLavoratoriDataOptions = {
  forcedWorkerStatus?: string | string[]
  applyGate1BaseFilters?: boolean
}

function toCanonicalWorkerStatus(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll("_", " ")

  switch (normalized) {
    case "non qualificato":
      return "Non qualificato"
    case "qualificato":
      return "Qualificato"
    case "non idoneo":
      return "Non idoneo"
    case "idoneo":
      return "Idoneo"
    case "certificato":
      return "Certificato"
    default:
      return value.trim()
  }
}

function mergeAndFilters(
  baseFilters: QueryFilterGroup | undefined,
  nodes: Array<QueryFilterCondition | QueryFilterGroup>,
  id: string
) {
  const validNodes = nodes.filter(Boolean)
  if (validNodes.length === 0) return baseFilters

  if (!baseFilters || !Array.isArray(baseFilters.nodes) || baseFilters.nodes.length === 0) {
    return {
      kind: "group" as const,
      id,
      logic: "and" as const,
      nodes: validNodes,
    }
  }

  return {
    kind: "group" as const,
    id: `${id}-merge`,
    logic: "and" as const,
    nodes: [baseFilters, ...validNodes],
  }
}

function formatDateFilterValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildGate1AvailabilityFilter(): QueryFilterGroup {
  const returnDateLimit = new Date()
  returnDateLimit.setDate(returnDateLimit.getDate() + 2)

  return {
    kind: "group",
    id: "gate1-disponibilita-rolling",
    logic: "or",
    nodes: [
      {
        kind: "condition",
        id: "gate1-disponibile",
        field: "disponibilita",
        operator: "is",
        value: "Disponibile",
      },
      {
        kind: "group",
        id: "gate1-non-disponibile-rientro-vicino",
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: "gate1-non-disponibile",
            field: "disponibilita",
            operator: "is",
            value: "Non disponibile",
          },
          {
            kind: "condition",
            id: "gate1-data-ritorno-entro-due-giorni",
            field: "data_ritorno_disponibilita",
            operator: "lte",
            value: formatDateFilterValue(returnDateLimit),
          },
        ],
      },
    ],
  }
}

function buildWorkerBaseFilter({
  baseFilters,
  forcedWorkerStatus,
  applyGate1BaseFilters,
}: {
  baseFilters: QueryFilterGroup | undefined
  forcedWorkerStatus: string | string[] | undefined
  applyGate1BaseFilters: boolean
}) {
  const normalizedStatuses = (
    Array.isArray(forcedWorkerStatus) ? forcedWorkerStatus : [forcedWorkerStatus ?? ""]
  )
    .map((status) => toCanonicalWorkerStatus(status))
    .filter(Boolean)
  const uniqueStatuses = Array.from(new Set(normalizedStatuses))
  const forcedNodes: Array<QueryFilterCondition | QueryFilterGroup> = []

  if (uniqueStatuses.length > 0) {
    forcedNodes.push(
      uniqueStatuses.length === 1
        ? {
            kind: "condition",
            id: "forced-stato-lavoratore",
            field: "stato_lavoratore",
            operator: "is",
            value: uniqueStatuses[0],
          }
        : {
            kind: "group",
            id: "forced-stato-lavoratore-any",
            logic: "or",
            nodes: uniqueStatuses.map((status, index) => ({
              kind: "condition",
              id: `forced-stato-lavoratore-${index}`,
              field: "stato_lavoratore",
              operator: "is",
              value: status,
            })),
          }
    )
  }

  if (applyGate1BaseFilters) {
    forcedNodes.push(buildGate1AvailabilityFilter())
  }

  return mergeAndFilters(baseFilters, forcedNodes, "worker-base-filter")
}

function isGate1BlockingSelection(selection: GenericRow) {
  return GATE1_BLOCKING_SELECTION_STATUS_TOKENS.has(
    normalizeStatusToken(selection.stato_selezione)
  )
}

function buildLookupFilterTypeMap(rows: LookupValueRecord[]) {
  const filterTypeMap = new Map<string, TableColumnMeta["filterType"]>()

  for (const row of rows) {
    if (!row.is_active) continue
    if (row.entity_table !== "lavoratori") continue
    const domain = `${row.entity_table}.${row.entity_field}`
    const metadata = row.metadata
    const filterType =
      metadata && typeof metadata === "object" && "filter_type" in metadata
        ? metadata.filter_type
        : null
    if (filterType === "enum" || filterType === "multi_enum") {
      filterTypeMap.set(domain, filterType)
    }
  }

  return filterTypeMap
}

function buildWorkerListItem(
  row: LavoratoreRecord,
  lookupColorsByDomain: Map<string, string>,
  addressesByWorkerId: Map<string, Record<string, unknown>[]> = new Map()
): LavoratoreListItem {
  const statusFlags = toWorkerStatusFlags(row.stato_lavoratore)
  const baseItem = toListItem(row, {
    isBlacklisted: isBlacklistValue(row.check_blacklist),
    statusFlags,
  })
  const workerAddress = resolveWorkerAddress(row.id, addressesByWorkerId)
  const statoLavoratore = asString(row.stato_lavoratore) || null
  const disponibilita = asString(row.disponibilita) || null
  const disponibilitaToken = (disponibilita ?? "").toLowerCase().replaceAll("_", " ")
  const isDisponibile =
    disponibilitaToken.length === 0
      ? null
      : disponibilitaToken.includes("non disponibile") ||
          disponibilitaToken.includes("non idone")
        ? false
        : disponibilitaToken.includes("disponib")
          ? true
          : null
  const ruoliDomesticiRaw = Array.isArray(row.tipo_lavoro_domestico)
    ? row.tipo_lavoro_domestico
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const ruoliDomestici = normalizeDomesticRoleLabels(ruoliDomesticiRaw)
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavoro = asStringArrayFirst(row.tipo_rapporto_lavorativo) || null
  const eta = getAgeFromBirthDate(row.data_di_nascita)
  const anniEsperienzaColf =
    typeof row.anni_esperienza_colf === "number" && Number.isFinite(row.anni_esperienza_colf)
      ? row.anni_esperienza_colf
      : null
  const anniEsperienzaBabysitter =
    typeof row.anni_esperienza_babysitter === "number" &&
    Number.isFinite(row.anni_esperienza_babysitter)
      ? row.anni_esperienza_babysitter
      : null

  return {
    ...baseItem,
    locationLabel: formatWorkerLocationLabel(row, workerAddress),
    statoLavoratore,
    statoLavoratoreColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.stato_lavoratore",
      statoLavoratore
    ),
    disponibilita,
    disponibilitaColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.disponibilita",
      disponibilita
    ),
    isDisponibile,
    tipoRuolo,
    tipoRuoloColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_lavoro_domestico",
      tipoRuolo
    ),
    tipoLavoro,
    tipoLavoroColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_rapporto_lavorativo",
      tipoLavoro
    ),
    ruoliDomestici,
    eta,
    anniEsperienzaColf,
    anniEsperienzaBabysitter,
  }
}

function normalizeAddressType(value: unknown) {
  return asString(value).toLowerCase().replaceAll("_", " ").trim()
}

function normalizeStatusToken(value: unknown) {
  return asString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll(",", " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatRelatedFamilyName(row: GenericRow | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim()

  return familyName || "Famiglia senza nome"
}

function formatRelatedSearchLabel(processRow: GenericRow) {
  const searchNumber = asString(processRow.numero_ricerca_attivata)
  if (searchNumber) return `Ricerca #${searchNumber}`

  const processId = asString(processRow.id)
  return processId ? `Ricerca ${processId.slice(0, 8)}` : "Ricerca"
}

function formatRelatedZona(processRow: GenericRow) {
  const parts = [
    asString(processRow.indirizzo_prova_via),
    asString(processRow.indirizzo_prova_comune),
    asString(processRow.indirizzo_prova_provincia),
    asString(processRow.indirizzo_prova_cap),
    asString(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index
  )

  return parts.join(" • ")
}

function resolveLookupColorByStatusToken(
  lookupColors: Map<string, string>,
  domain: string,
  value: string | null | undefined
) {
  const direct = resolveLookupColor(lookupColors, domain, value ?? null)
  if (direct) return direct

  const normalizedValue = normalizeStatusToken(value)
  if (!normalizedValue) return null

  for (const [key, color] of lookupColors.entries()) {
    if (!key.startsWith(`${domain}:`)) continue
    const rawValue = key.slice(domain.length + 1)
    if (normalizeStatusToken(rawValue) === normalizedValue) {
      return color
    }
  }

  return null
}

function isDirectInvolvementSelection(selection: GenericRow) {
  return (
    DIRECT_INVOLVEMENT_SELECTION_STATUS_TOKENS.has(
      normalizeStatusToken(selection.stato_selezione)
    ) &&
    normalizeStatusToken(selection.stato_situazione_lavorativa) ===
      DIRECT_INVOLVEMENT_WORK_STATUS_TOKEN
  )
}

function isOtherSearchSelection(selection: GenericRow, processRow: GenericRow) {
  const processStatusToken = normalizeStatusToken(processRow.stato_res)
  const selectionStatusToken = normalizeStatusToken(selection.stato_selezione)

  const matchesGroupA =
    OTHER_SEARCH_GROUP_A_PROCESS_STATUS_TOKENS.has(processStatusToken) &&
    OTHER_SEARCH_GROUP_A_SELECTION_STATUS_TOKENS.has(selectionStatusToken)

  const matchesGroupB =
    OTHER_SEARCH_GROUP_B_PROCESS_STATUS_TOKENS.has(processStatusToken) &&
    OTHER_SEARCH_GROUP_B_SELECTION_STATUS_TOKENS.has(selectionStatusToken)

  return matchesGroupA || matchesGroupB
}

function getDotColorClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "bg-red-500"
    case "rose":
      return "bg-rose-500"
    case "orange":
      return "bg-orange-500"
    case "amber":
      return "bg-amber-500"
    case "yellow":
      return "bg-yellow-500"
    case "lime":
      return "bg-lime-500"
    case "green":
      return "bg-green-500"
    case "emerald":
      return "bg-emerald-500"
    case "teal":
      return "bg-teal-500"
    case "cyan":
      return "bg-cyan-500"
    case "sky":
      return "bg-sky-500"
    case "blue":
      return "bg-blue-500"
    case "indigo":
      return "bg-indigo-500"
    case "violet":
      return "bg-violet-500"
    case "purple":
      return "bg-purple-500"
    case "fuchsia":
      return "bg-fuchsia-500"
    case "pink":
      return "bg-pink-500"
    case "slate":
    case "gray":
    case "zinc":
    case "neutral":
    case "stone":
      return "bg-zinc-500"
    default:
      return "bg-sky-500"
  }
}

function resolveWorkerAddress(
  workerId: string,
  addressesByWorkerId: Map<string, Record<string, unknown>[]>
) {
  const addresses = addressesByWorkerId.get(workerId) ?? []
  if (addresses.length === 0) return null

  return (
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "residenza") ??
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "domicilio") ??
    addresses[0] ??
    null
  )
}

async function fetchWorkerAddressesByIds(workerIds: string[]) {
  if (workerIds.length === 0) return new Map<string, Record<string, unknown>[]>()

  const addressesByWorkerId = new Map<string, Record<string, unknown>[]>()

  for (let index = 0; index < workerIds.length; index += ADDRESS_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + ADDRESS_BATCH_SIZE)
    const result = await fetchIndirizzi({
      select: [
        "entita_id",
        "tipo_indirizzo",
        "via",
        "civico",
        "cap",
        "citta",
        "provincia",
        "indirizzo_formattato",
        "note",
      ],
      limit: Math.max(batch.length * 2, batch.length),
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: `lavoratori-addresses-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `lavoratori-addresses-table-${index}`,
            field: "entita_tabella",
            operator: "is",
            value: "lavoratori",
          },
          {
            kind: "condition",
            id: `lavoratori-addresses-id-${index}`,
            field: "entita_id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    })

    for (const row of result.rows) {
      const workerId = asString(row.entita_id)
      if (!workerId) continue
      const current = addressesByWorkerId.get(workerId) ?? []
      current.push(row)
      addressesByWorkerId.set(workerId, current)
    }
  }

  return addressesByWorkerId
}

async function fetchSelectionsForWorkers(workerIds: string[]) {
  if (workerIds.length === 0) return []

  const rows: GenericRow[] = []

  for (let index = 0; index < workerIds.length; index += RELATED_WORKER_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + RELATED_WORKER_BATCH_SIZE)
    let offset = 0

    while (true) {
      const result = await fetchSelezioniLavoratori({
        select: [
          "id",
          "lavoratore_id",
          "processo_matching_id",
          "stato_selezione",
          "stato_situazione_lavorativa",
          "note_selezione",
          "aggiornato_il",
        ],
        limit: RELATED_SELECTIONS_PAGE_SIZE,
        offset,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
        filters: {
          kind: "group",
          id: `lavoratori-related-selections-${index}-${offset}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `lavoratori-related-worker-ids-${index}-${offset}`,
              field: "lavoratore_id",
              operator: "in",
              value: batch.join(","),
            },
          ],
        },
      })

      const pageRows = Array.isArray(result.rows) ? (result.rows as GenericRow[]) : []
      rows.push(...pageRows)

      if (pageRows.length < RELATED_SELECTIONS_PAGE_SIZE) break
      offset += RELATED_SELECTIONS_PAGE_SIZE
    }
  }

  return rows
}

async function fetchRelatedProcessesByIds(processIds: string[]) {
  if (processIds.length === 0) return []

  const rows: GenericRow[] = []

  for (let index = 0; index < processIds.length; index += RELATED_PROCESS_BATCH_SIZE) {
    const batch = processIds.slice(index, index + RELATED_PROCESS_BATCH_SIZE)
    const result = await fetchProcessiMatching({
      select: [
        "id",
        "famiglia_id",
        "numero_ricerca_attivata",
        "stato_res",
        "recruiter_ricerca_e_selezione_id",
        "orario_di_lavoro",
        "indirizzo_prova_via",
        "indirizzo_prova_comune",
        "indirizzo_prova_provincia",
        "indirizzo_prova_cap",
        "indirizzo_prova_note",
      ],
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `lavoratori-related-processes-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `lavoratori-related-process-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    })

    rows.push(...((Array.isArray(result.rows) ? result.rows : []) as GenericRow[]))
  }

  return rows
}

async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return []

  const rows: GenericRow[] = []

  for (let index = 0; index < familyIds.length; index += RELATED_FAMILY_BATCH_SIZE) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE)
    const result = await fetchFamiglie({
      select: ["id", "nome", "cognome"],
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `lavoratori-related-families-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `lavoratori-related-family-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    })

    rows.push(...((Array.isArray(result.rows) ? result.rows : []) as GenericRow[]))
  }

  return rows
}

async function fetchRelatedActiveSelectionsByWorkerIds({
  workerIds,
  lookupColorsByDomain,
  recruiterLabelsById,
}: {
  workerIds: string[]
  lookupColorsByDomain: Map<string, string>
  recruiterLabelsById: Map<string, string>
}) {
  const selections = await fetchSelectionsForWorkers(workerIds)
  const processIds = Array.from(
    new Set(
      selections
        .map((selection) => asString(selection.processo_matching_id))
        .filter((value): value is string => Boolean(value))
    )
  )
  const processRows = await fetchRelatedProcessesByIds(processIds)
  const processRowsById = new Map(
    processRows
      .map((row) => {
        const rowId = asString(row.id)
        if (!rowId) return null
        return [rowId, row] as const
      })
      .filter((entry): entry is readonly [string, GenericRow] => Boolean(entry))
  )
  const familyIds = Array.from(
    new Set(
      processRows
        .map((row) => asString(row.famiglia_id))
        .filter((value): value is string => Boolean(value))
    )
  )
  const familyRows = await fetchRelatedFamiliesByIds(familyIds)
  const familyRowsById = new Map(
    familyRows
      .map((row) => {
        const rowId = asString(row.id)
        if (!rowId) return null
        return [rowId, row] as const
      })
      .filter((entry): entry is readonly [string, GenericRow] => Boolean(entry))
  )
  const relatedSelectionsByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()
  const gate1BlockedWorkerIds = new Set<string>()

  for (const workerId of workerIds) {
    const workerSelections = selections.filter(
      (selection) => asString(selection.lavoratore_id) === workerId
    )
    const details: NonNullable<LavoratoreListItem["otherActiveSelections"]>["details"] = []
    const dots: NonNullable<LavoratoreListItem["otherActiveSelections"]>["dots"] = []
    const seenProcesses = new Set<string>()

    for (const selection of workerSelections) {
      if (isGate1BlockingSelection(selection)) {
        gate1BlockedWorkerIds.add(workerId)
      }

      const processId = asString(selection.processo_matching_id)
      if (!processId || seenProcesses.has(processId)) continue

      const processRow = processRowsById.get(processId)
      if (!processRow) continue
      if (
        !isDirectInvolvementSelection(selection) &&
        !isOtherSearchSelection(selection, processRow)
      ) {
        continue
      }

      const statoSelezione = asString(selection.stato_selezione) ?? "-"
      const statoRicerca = asString(processRow.stato_res) ?? "-"
      const selectionColor =
        resolveLookupColorByStatusToken(
          lookupColorsByDomain,
          "selezioni_lavoratori.stato_selezione",
          statoSelezione
        ) ??
        resolveLookupColorByStatusToken(
          lookupColorsByDomain,
          "lavoratori.stato_selezione",
          statoSelezione
        )
      const processColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "processi_matching.stato_res",
        statoRicerca
      )
      const recruiterId = asString(processRow.recruiter_ricerca_e_selezione_id)
      const familyRow = familyRowsById.get(asString(processRow.famiglia_id) ?? "")

      details.push({
        id: processId,
        familyName: formatRelatedFamilyName(familyRow),
        ricercaLabel: formatRelatedSearchLabel(processRow),
        recruiterLabel: recruiterId ? recruiterLabelsById.get(recruiterId) ?? "" : "",
        statoSelezione,
        statoSelezioneColor: selectionColor,
        statoRicerca,
        statoRicercaColor: processColor,
        orarioDiLavoro: asString(processRow.orario_di_lavoro) ?? "",
        zona: formatRelatedZona(processRow),
        appunti: asString(selection.note_selezione) ?? "",
      })
      if (dots.length < 4) {
        dots.push({
          key: `${processId}-${statoSelezione}`,
          colorClassName: getDotColorClassName(selectionColor),
          label: statoSelezione,
        })
      }
      seenProcesses.add(processId)
    }

    if (details.length > 0) {
      relatedSelectionsByWorkerId.set(workerId, {
        count: details.length,
        dots,
        details,
      })
    }
  }

  return {
    relatedSelectionsByWorkerId,
    gate1BlockedWorkerIds,
  }
}

export function useLavoratoriData(options: UseLavoratoriDataOptions = {}) {
  const { forcedWorkerStatus, applyGate1BaseFilters = false } = options
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })
  const [workers, setWorkers] = React.useState<LavoratoreListItem[]>([])
  const [workerRows, setWorkerRows] = React.useState<LavoratoreRecord[]>([])
  const [workerAddressesById, setWorkerAddressesById] = React.useState<
    Map<string, Record<string, unknown>[]>
  >(new Map())
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [workersColumns, setWorkersColumns] = React.useState<TableColumnMeta[]>([])
  const [selectedWorkerExperiences, setSelectedWorkerExperiences] = React.useState<
    EsperienzaLavoratoreRecord[]
  >([])
  const [selectedWorkerDocuments, setSelectedWorkerDocuments] = React.useState<
    DocumentoLavoratoreRecord[]
  >([])
  const [selectedWorkerReferences, setSelectedWorkerReferences] = React.useState<
    ReferenzaLavoratoreRecord[]
  >([])
  const [loadingSelectedWorkerDocuments, setLoadingSelectedWorkerDocuments] =
    React.useState(false)
  const [loadingSelectedWorkerExperiences, setLoadingSelectedWorkerExperiences] =
    React.useState(false)
  const [loadingSelectedWorkerReferences, setLoadingSelectedWorkerReferences] =
    React.useState(false)
  const [lookupOptionsByDomain, setLookupOptionsByDomain] = React.useState<
    Map<string, LookupOption[]>
  >(new Map())
  const [lookupFilterTypeByDomain, setLookupFilterTypeByDomain] = React.useState<
    Map<string, TableColumnMeta["filterType"]>
  >(new Map())
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const requestIdRef = React.useRef(0)
  const {
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    debouncedQuery,
    savedViews,
    activeViewId,
    saveView,
    applyView,
    deleteView,
  } = useTableQueryState({
    viewsStorageKey: VIEWS_STORAGE_KEY,
    debounceMs: SERVER_QUERY_DEBOUNCE_MS,
  })
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions]
  )

  React.useEffect(() => {
    setPageIndex(0)
  }, [filters, searchValue, sorting])

  React.useEffect(() => {
    let isCancelled = false

    async function loadLookupOptions() {
      try {
        const lookup = await fetchLookupValues()
        if (isCancelled) return
        setLookupOptionsByDomain(normalizeLookupOptions(lookup.rows))
        setLookupFilterTypeByDomain(buildLookupFilterTypeMap(lookup.rows))
        setLookupColorsByDomain(normalizeLookupColors(lookup.rows))
      } catch {
        if (isCancelled) return
        setLookupOptionsByDomain(new Map())
        setLookupFilterTypeByDomain(new Map())
        setLookupColorsByDomain(new Map())
      }
    }

    void loadLookupOptions()

    return () => {
      isCancelled = true
    }
  }, [])

  React.useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sortOrderBy =
          debouncedQuery.sorting.length > 0
            ? debouncedQuery.sorting.map((item) => ({ field: item.id, ascending: !item.desc }))
            : [
                { field: "stato_lavoratore", ascending: true },
                { field: "data_ora_ultima_modifica", ascending: false },
                { field: "creato_il", ascending: false },
              ]
        const result = await fetchLavoratori({
          limit: pageSize,
          offset: pageIndex * pageSize,
          includeSchema: true,
          orderBy: sortOrderBy,
          search: debouncedQuery.searchValue.trim() || undefined,
          searchFields: ["nome", "cognome", "email", "telefono"],
          filters: buildWorkerBaseFilter({
            baseFilters: debouncedQuery.filters,
            forcedWorkerStatus,
            applyGate1BaseFilters,
          }),
        })
        if (requestId !== requestIdRef.current) return

        if (result.columns.length > 0) {
          setWorkersColumns(result.columns)
        } else {
          setWorkersColumns([])
          setError("Schema filtri lavoratori non disponibile (columns vuote da table-query).")
        }

        const rows = result.rows.map(asLavoratoreRecord)
        const workerIds = rows.map((row) => row.id)
        const [addressesByWorkerId, relatedSelectionsResult] = await Promise.all([
          fetchWorkerAddressesByIds(workerIds),
          fetchRelatedActiveSelectionsByWorkerIds({
            workerIds,
            lookupColorsByDomain,
            recruiterLabelsById,
          }).catch(() => ({
            relatedSelectionsByWorkerId: new Map<
              string,
              NonNullable<LavoratoreListItem["otherActiveSelections"]>
            >(),
            gate1BlockedWorkerIds: new Set<string>(),
          })),
        ])
        if (requestId !== requestIdRef.current) return

        const visibleRows = applyGate1BaseFilters
          ? rows.filter((row) => !relatedSelectionsResult.gate1BlockedWorkerIds.has(row.id))
          : rows

        setWorkerRows(visibleRows)
        setWorkerAddressesById(addressesByWorkerId)
        setWorkers(
          visibleRows.map((row) => ({
            ...buildWorkerListItem(row, lookupColorsByDomain, addressesByWorkerId),
            otherActiveSelections:
              relatedSelectionsResult.relatedSelectionsByWorkerId.get(row.id) ?? null,
          }))
        )
        setWorkersTotal(
          applyGate1BaseFilters
            ? Math.max(result.total - relatedSelectionsResult.gate1BlockedWorkerIds.size, visibleRows.length)
            : result.total
        )
        setSelectedWorkerId((previous) => {
          if (previous && visibleRows.some((row) => row.id === previous)) return previous
          return visibleRows[0]?.id ?? null
        })
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore nel caricamento lavoratori"
        )
        setWorkers([])
        setWorkerRows([])
        setWorkerAddressesById(new Map())
        setWorkersTotal(0)
        setWorkersColumns([])
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }

    void load()
  }, [
    applyGate1BaseFilters,
    debouncedQuery,
    forcedWorkerStatus,
    lookupColorsByDomain,
    pageIndex,
    pageSize,
    recruiterLabelsById,
  ])

  const filterFields = React.useMemo<FilterField[]>(() => {
    return workersColumns.map((column) => {
      const domain = `lavoratori.${column.name}`
      const options = lookupOptionsByDomain.get(domain) ?? []
      const resolvedFilterType = lookupFilterTypeByDomain.get(domain) ?? column.filterType
      return {
        label: toReadableColumnLabel(column.name),
        value: column.name,
        type: resolvedFilterType,
        options:
          resolvedFilterType === "enum" || resolvedFilterType === "multi_enum"
            ? options
            : undefined,
      } satisfies FilterField
    })
  }, [lookupFilterTypeByDomain, lookupOptionsByDomain, workersColumns])

  const sortingColumns = React.useMemo<ColumnDef<LavoratoreRecord>[]>(
    () =>
      workersColumns.map((column) => ({
        id: column.name,
        header: toReadableColumnLabel(column.name),
        accessorFn: (row) => row[column.name as keyof LavoratoreRecord],
      })),
    [workersColumns]
  )

  const table = useReactTable({
    data: workerRows,
    columns: sortingColumns,
    state: {
      sorting,
      grouping,
    },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  React.useEffect(() => {
    setSelectedWorkerId((previous) => {
      if (previous && workers.some((worker) => worker.id === previous)) return previous
      return workers[0]?.id ?? null
    })
  }, [workers])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerDocuments() {
      if (!selectedWorkerId) {
        setSelectedWorkerDocuments([])
        setLoadingSelectedWorkerDocuments(false)
        return
      }

      setLoadingSelectedWorkerDocuments(true)
      try {
        const result = await fetchDocumentiLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerDocuments(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerDocuments([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerDocuments(false)
        }
      }
    }

    void loadSelectedWorkerDocuments()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerExperiences() {
      if (!selectedWorkerId) {
        setSelectedWorkerExperiences([])
        setLoadingSelectedWorkerExperiences(false)
        return
      }

      setLoadingSelectedWorkerExperiences(true)
      try {
        const result = await fetchEsperienzeLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerExperiences(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerExperiences([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerExperiences(false)
        }
      }
    }

    void loadSelectedWorkerExperiences()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerReferences() {
      if (!selectedWorkerId) {
        setSelectedWorkerReferences([])
        setLoadingSelectedWorkerReferences(false)
        return
      }

      setLoadingSelectedWorkerReferences(true)
      try {
        const result = await fetchReferenzeLavoratoriByWorker(selectedWorkerId)
        if (isCancelled) return
        setSelectedWorkerReferences(result.rows)
      } catch {
        if (isCancelled) return
        setSelectedWorkerReferences([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerReferences(false)
        }
      }
    }

    void loadSelectedWorkerReferences()

    return () => {
      isCancelled = true
    }
  }, [selectedWorkerId])

  const saveCurrentView = React.useCallback((name: string) => {
    saveView(name)
  }, [saveView])

  const applySavedView = React.useCallback((id: string) => {
    const view = applyView(id)
    if (!view) return
    setPageIndex(0)
  }, [applyView])

  const deleteSavedView = React.useCallback((id: string) => {
    deleteView(id)
  }, [deleteView])

  const pageCount = Math.max(1, Math.ceil(workersTotal / pageSize))
  const currentPage = pageIndex + 1
  const selectedWorker = React.useMemo(
    () => workers.find((worker) => worker.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workers]
  )
  const selectedWorkerRow = React.useMemo(
    () => workerRows.find((row) => row.id === selectedWorkerId) ?? null,
    [selectedWorkerId, workerRows]
  )
  const selectedWorkerAddress = React.useMemo(
    () =>
      selectedWorkerId
        ? resolveWorkerAddress(selectedWorkerId, workerAddressesById)
        : null,
    [selectedWorkerId, workerAddressesById]
  )

  const applyUpdatedWorkerRow = React.useCallback(
    (nextRow: LavoratoreRecord) => {
      setWorkerRows((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
      setWorkers((current) =>
        current.map((worker) =>
          worker.id === nextRow.id
            ? {
                ...buildWorkerListItem(nextRow, lookupColorsByDomain, workerAddressesById),
                otherActiveSelections: worker.otherActiveSelections ?? null,
              }
            : worker
        )
      )
    },
    [lookupColorsByDomain, workerAddressesById]
  )

  const applyUpdatedWorkerAddress = React.useCallback(
    (nextAddress: Record<string, unknown>) => {
      const workerId = asString(nextAddress.entita_id)
      if (!workerId) return

      setWorkerAddressesById((current) => {
        const next = new Map(current)
        const addresses = next.get(workerId) ?? []
        const nextId = asString(nextAddress.id)
        const existingIndex = nextId
          ? addresses.findIndex((address) => asString(address.id) === nextId)
          : -1
        const nextAddresses =
          existingIndex === -1
            ? [nextAddress, ...addresses]
            : addresses.map((address, index) =>
                index === existingIndex ? nextAddress : address
              )
        next.set(workerId, nextAddresses)

        setWorkers((currentWorkers) =>
          currentWorkers.map((worker) => {
            if (worker.id !== workerId) return worker
            const row = workerRows.find((item) => item.id === workerId)
            return row
              ? {
                  ...buildWorkerListItem(row, lookupColorsByDomain, next),
                  otherActiveSelections: worker.otherActiveSelections ?? null,
                }
              : worker
          })
        )

        return next
      })
    },
    [lookupColorsByDomain, workerRows]
  )

  const applyUpdatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerExperience = React.useCallback(
    (nextRow: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) => [nextRow, ...current])
    },
    []
  )

  const removeWorkerExperience = React.useCallback((experienceId: string) => {
    setSelectedWorkerExperiences((current) =>
      current.filter((row) => row.id !== experienceId)
    )
  }, [])

  const applyUpdatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) =>
        current.map((row) => (row.id === nextRow.id ? nextRow : row))
      )
    },
    []
  )

  const appendCreatedWorkerReference = React.useCallback(
    (nextRow: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) => [nextRow, ...current])
    },
    []
  )

  const upsertSelectedWorkerDocument = React.useCallback(
    (nextRow: DocumentoLavoratoreRecord) => {
      setSelectedWorkerDocuments((current) => {
        const existingIndex = current.findIndex((row) => row.id === nextRow.id)
        if (existingIndex === -1) {
          return [nextRow, ...current]
        }

        return current.map((row) => (row.id === nextRow.id ? nextRow : row))
      })
    },
    []
  )

  return {
    workers,
    workerRows,
    workersTotal,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    loading,
    error,
    setError,
    lookupOptionsByDomain,
    lookupFilterTypeByDomain,
    lookupColorsByDomain,
    filterFields,
    table,
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    savedViews,
    activeViewId,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    pageIndex,
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  }
}
