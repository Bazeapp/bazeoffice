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
  asInputValue,
  asString,
  formatWorkerLocationLabel,
  normalizeDomesticRoleDbLabel,
  normalizeDomesticRoleLabels,
  readArrayStrings,
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
  type Gate1RpcFilter,
  type QueryFilterGroup,
  type TableColumnMeta,
  clearReadCaches,
  fetchIndirizziByEntity,
  fetchLavoratoreScheda,
  fetchLavoratoriBoard,
  fetchLookupValues,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const LAVORATORI_REALTIME_TABLES = ["lavoratori"]
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { LookupValueRecord } from "@/types/entities/lookup-values"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"

const DEFAULT_PAGE_SIZE = 50
const SERVER_QUERY_DEBOUNCE_MS = 700
const VIEWS_STORAGE_KEY = "lavoratori.cerca.saved-views"
const ADDRESS_BATCH_SIZE = 120
const WORKER_LIST_DATA_VERSION = "worker-list-gate-detail-v1"

// FASE 4 BIS — whitelist colonne ordinabili. Deve restare allineata agli helper
// SQL public.lavoratore_sort_text / public.lavoratore_sort_num: solo queste
// colonne sono instradate alle RPC (cerca/gate1/gate2) tramite p_order_by.
// Tutto ciò che è fuori da questa lista non è offerto nella UI di ordinamento,
// così non serve più alcun fallback table-query per il sort.
const WORKER_SORTABLE_FIELDS = [
  "nome",
  "cognome",
  "stato_lavoratore",
  "disponibilita",
  "provincia",
  "data_di_nascita",
  "anni_esperienza_colf",
  "anni_esperienza_babysitter",
  "followup_chiamata_idoneita",
  "creato_il",
  "aggiornato_il",
] as const
const WORKER_SORTABLE_FIELD_SET = new Set<string>(WORKER_SORTABLE_FIELDS)

type RpcOrderBy = { field: string; ascending: boolean }

// Le RPC ordinano per UNA colonna whitelisted. Sort vuoto o multi-colonna fuori
// whitelist → undefined (default RPC).
function toRpcOrderBy(
  sorting: { id: string; desc: boolean }[]
): RpcOrderBy | undefined {
  const first = sorting[0]
  if (!first || !WORKER_SORTABLE_FIELD_SET.has(first.id)) return undefined
  return { field: first.id, ascending: !first.desc }
}

// Una richiesta è gestibile via RPC se il sort è vuoto oppure è un singolo
// criterio su colonna whitelisted (le RPC non supportano sort multi-colonna).
function isRpcSortable(sorting: { id: string; desc: boolean }[]): boolean {
  if (sorting.length === 0) return true
  return sorting.length === 1 && WORKER_SORTABLE_FIELD_SET.has(sorting[0].id)
}

// FASE 4 BIS — catalogo campi filtro STATICO (sostituisce lo schema dinamico che
// prima arrivava da table-query con includeSchema=true). La lista replica
// esattamente ALLOWED_FIELDS['lavoratori'] dell'edge function; il filterType di
// base è derivato col medesimo euristico (id / date / text), poiché lo schema
// veniva inferito da una riga `select id` senza campioni di valore. La FE
// sovrascrive comunque il tipo con quello dei lookup (enum/multi_enum) via
// lookupFilterTypeByDomain, quindi qui basta id/date/text.
const WORKER_FILTER_FIELD_NAMES = [
  "id", "anni_esperienza_babysitter", "anni_esperienza_badante", "anni_esperienza_colf",
  "check_accetta_babysitting_multipli_bambini", "check_accetta_babysitting_neonati",
  "check_accetta_case_con_cani", "check_accetta_case_con_cani_grandi", "check_accetta_case_con_gatti",
  "check_accetta_funzionamento_baze", "check_accetta_lavori_con_trasferta",
  "check_accetta_multipli_contratti", "check_accetta_paga_9_euro_netti",
  "check_accetta_salire_scale_o_soffitti_alti", "check_blacklist", "check_lavori_accettabili",
  "nome", "cognome", "come_ti_sposti",
  "compatibilita_babysitting_neonati", "compatibilita_con_animali_in_casa",
  "compatibilita_con_case_di_grandi_dimensioni", "compatibilita_con_contesti_pacati",
  "compatibilita_con_cucina_strutturata", "compatibilita_con_elevata_autonomia_richiesta",
  "compatibilita_con_stiro_esigente", "compatibilita_famiglie_molto_esigenti",
  "compatibilita_famiglie_numerose", "compatibilita_lavoro_con_datore_presente_in_casa",
  "conoscenza_dellitaliano", "data_di_nascita",
  "data_ritorno_disponibilita", "data_scadenza_naspi", "data_ultima_candidatura",
  "descrizione_pubblica", "descrizione_rivista",
  "disponibilita", "availability_final_json", "disponibilita_nel_giorno",
  "disponibilita_domenica_mattina", "disponibilita_domenica_pomeriggio", "disponibilita_domenica_sera",
  "disponibilita_giovedi_mattina", "disponibilita_giovedi_pomeriggio", "disponibilita_giovedi_sera",
  "disponibilita_lunedi_mattina", "disponibilita_lunedi_pomeriggio", "disponibilita_lunedi_sera",
  "disponibilita_martedi_mattina", "disponibilita_martedi_pomeriggio", "disponibilita_martedi_sera",
  "disponibilita_mercoledi_mattina", "disponibilita_mercoledi_pomeriggio", "disponibilita_mercoledi_sera",
  "disponibilita_sabato_mattina", "disponibilita_sabato_pomeriggio", "disponibilita_sabato_sera",
  "disponibilita_venerdi_mattina", "disponibilita_venerdi_pomeriggio", "disponibilita_venerdi_sera",
  "documenti_in_regola", "email", "fbclid", "feedback_recruiter", "followup_chiamata_idoneita",
  "foto", "gclid", "hai_referenze", "iban", "id_stripe_account", "livello_babysitting",
  "livello_cucina", "livello_dogsitting", "livello_giardinaggio", "livello_inglese",
  "livello_italiano", "livello_pulizie", "livello_stiro", "motivazione_non_idoneo", "nazionalita",
  "paga_oraria_richiesta", "provincia", "rating_atteggiamento", "rating_capacita_comunicative",
  "rating_corporatura", "rating_cura_personale", "rating_precisione_puntualita",
  "referente_certificazione_id", "referente_idoneita_id", "riassunto_profilo_breve", "sesso",
  "situazione_lavorativa_attuale", "stato_lavoratore",
  "stato_verifica_documenti", "telefono", "tipo_lavoro_domestico", "tipo_rapporto_lavorativo",
  "ultima_modifica", "utm_campaign", "utm_content", "utm_medium",
  "utm_source", "utm_term", "vincoli_orari_disponibilita", "creato_il", "aggiornato_il",
]

function inferWorkerFilterType(name: string): TableColumnMeta["filterType"] {
  if (name === "id") return "id"
  const n = name.trim().toLowerCase()
  if (n.startsWith("anni_")) return "number"
  const dateLike =
    !n.endsWith("_id") &&
    (n.startsWith("data_") ||
      n.includes("deadline") ||
      n.includes("scadenza") ||
      n === "creata" ||
      n === "creato_il" ||
      n === "aggiornato_il")
  return dateLike ? "date" : "text"
}

const WORKER_SCHEMA_COLUMNS: TableColumnMeta[] = WORKER_FILTER_FIELD_NAMES.map((name) => {
  const filterType = inferWorkerFilterType(name)
  return {
    name,
    filterType,
    dataType:
      filterType === "id" ? "uuid" : filterType === "date" ? "timestamp with time zone" : "text",
    udtName: filterType === "id" ? "uuid" : filterType === "date" ? "timestamptz" : null,
  }
})

type GenericRow = Record<string, unknown>

type UseLavoratoriDataOptions = {
  initialSelectedWorkerId?: string | null
  forcedWorkerStatus?: string | string[]
  applyGate1BaseFilters?: boolean
  includeRelatedSelectionDetails?: boolean
  gate1ProvinciaFilter?: string
  gate1FollowupFilter?: string
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


function collectGate1RpcFilters(
  group: QueryFilterGroup | undefined
): Gate1RpcFilter[] | null {
  if (!group || !Array.isArray(group.nodes) || group.nodes.length === 0) return []
  if (group.logic !== "and") return null

  const filters: Gate1RpcFilter[] = []
  for (const node of group.nodes) {
    if (node.kind === "condition") {
      filters.push({
        field: node.field,
        operator: node.operator,
        value: node.value,
        valueTo: node.valueTo,
      })
      continue
    }

    const nestedFilters = collectGate1RpcFilters(node)
    if (!nestedFilters) return null
    filters.push(...nestedFilters)
  }

  return filters
}

function buildGate1RpcFilters({
  filters,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
}: {
  filters: QueryFilterGroup | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
}) {
  const rpcFilters = collectGate1RpcFilters(filters)
  if (!rpcFilters) return null

  if (gate1ProvinciaFilter !== "all") {
    rpcFilters.push({
      field: "provincia_sigla",
      operator: "is",
      value: gate1ProvinciaFilter,
    })
  }

  if (gate1FollowupFilter !== "all") {
    rpcFilters.push({
      field: "followup_chiamata_idoneita",
      operator: "is",
      value: gate1FollowupFilter,
    })
  }

  return rpcFilters
}

// Variante per filtri con logica OR (non appiattibili in array): costruisce il
// GRUPPO annidato { and: [filtriUtente, provincia?, followup?] } che gate1/gate2
// valutano via lavoratore_matches_filter_group. Niente più fallback table-query.
function buildGate1RpcFilterGroup({
  filters,
  gate1ProvinciaFilter,
  gate1FollowupFilter,
}: {
  filters: QueryFilterGroup | undefined
  gate1ProvinciaFilter: string
  gate1FollowupFilter: string
}): QueryFilterGroup {
  const nodes: QueryFilterGroup["nodes"] = []
  if (filters && Array.isArray(filters.nodes) && filters.nodes.length > 0) {
    nodes.push(filters)
  }
  if (gate1ProvinciaFilter !== "all") {
    nodes.push({
      kind: "condition",
      id: "gate-rpc-provincia",
      field: "provincia_sigla",
      operator: "is",
      value: gate1ProvinciaFilter,
    })
  }
  if (gate1FollowupFilter !== "all") {
    nodes.push({
      kind: "condition",
      id: "gate-rpc-followup",
      field: "followup_chiamata_idoneita",
      operator: "is",
      value: gate1FollowupFilter,
    })
  }
  return { kind: "group", id: "gate-rpc-filter-group", logic: "and", nodes }
}

function buildGate2RpcStatusFilters(
  forcedWorkerStatus: string | string[] | undefined
): Gate1RpcFilter[] | null {
  const statuses = (Array.isArray(forcedWorkerStatus) ? forcedWorkerStatus : [forcedWorkerStatus ?? ""])
    .map((status) => toCanonicalWorkerStatus(status))
    .filter(Boolean)
  const uniqueStatuses = Array.from(new Set(statuses)).sort()

  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === "Idoneo") {
    return [
      {
        field: "stato_lavoratore",
        operator: "is",
        value: "Idoneo",
      },
    ]
  }

  if (
    uniqueStatuses.length === 2 &&
    uniqueStatuses[0] === "Idoneo" &&
    uniqueStatuses[1] === "Qualificato"
  ) {
    return []
  }

  return null
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
    useThumbnailAvatar: true,
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
  const tipoLavori = readArrayStrings(row.tipo_rapporto_lavorativo)
  const tipoLavoro = tipoLavori[0] ?? null
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
    tipoLavori,
    tipoLavoriColors: Object.fromEntries(
      tipoLavori.map((tipo) => [
        tipo,
        resolveLookupColor(
          lookupColorsByDomain,
          "lavoratori.tipo_rapporto_lavorativo",
          tipo
        ),
      ])
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
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata)
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

// Pure: raggruppa righe indirizzi (da indirizzi_by_entity o da lavoratori_board)
// per entita_id (worker id). Riusato sia dal fetch standalone sia dal board RPC.
function groupAddressesByWorker(
  rows: Record<string, unknown>[]
): Map<string, Record<string, unknown>[]> {
  const addressesByWorkerId = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const workerId = asString(row.entita_id)
    if (!workerId) continue
    const current = addressesByWorkerId.get(workerId) ?? []
    current.push(row)
    addressesByWorkerId.set(workerId, current)
  }
  return addressesByWorkerId
}

async function fetchWorkerAddressesByIds(workerIds: string[]) {
  if (workerIds.length === 0) return new Map<string, Record<string, unknown>[]>()

  const allRows: Record<string, unknown>[] = []
  for (let index = 0; index < workerIds.length; index += ADDRESS_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + ADDRESS_BATCH_SIZE)
    // La RPC ritorna TUTTI gli indirizzi del batch in un colpo, quindi non
    // serve più il loop di paginazione che table-query richiedeva.
    const result = await fetchIndirizziByEntity("lavoratori", batch)
    allRows.push(...result.rows)
  }

  return groupAddressesByWorker(allRows)
}

// Pure: dalle righe grezze di lavoratori_selezioni_correlate (annidate nel
// board RPC lavoratori_board) costruisce la mappa otherActiveSelections per
// worker, risolvendo colori/label client-side.
function buildRelatedSelectionsMap(
  rows: GenericRow[],
  lookupColorsByDomain: Map<string, string>,
  recruiterLabelsById: Map<string, string>
): Map<string, NonNullable<LavoratoreListItem["otherActiveSelections"]>> {
  const relatedSelectionsByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()
  const rowsByWorker = new Map<string, GenericRow[]>()
  for (const row of rows) {
    const workerId = asString(row.lavoratore_id)
    if (!workerId) continue
    const bucket = rowsByWorker.get(workerId)
    if (bucket) bucket.push(row)
    else rowsByWorker.set(workerId, [row])
  }

  for (const [workerId, workerRows] of rowsByWorker) {
    const details: NonNullable<LavoratoreListItem["otherActiveSelections"]>["details"] = []
    const dots: NonNullable<LavoratoreListItem["otherActiveSelections"]>["dots"] = []
    const seenProcesses = new Set<string>()

    for (const row of workerRows) {
      const processId = asString(row.processo_matching_id)
      if (!processId || seenProcesses.has(processId)) continue

      const statoSelezione = asString(row.stato_selezione) ?? "-"
      const statoRicerca = asString(row.stato_res) ?? "-"
      const selectionColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "selezioni_lavoratori.stato_selezione",
        statoSelezione
      )
      const processColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "processi_matching.stato_res",
        statoRicerca
      )
      const recruiterId = asString(row.recruiter_ricerca_e_selezione_id)

      details.push({
        id: processId,
        familyName: formatRelatedFamilyName({
          nome: row.famiglia_nome,
          cognome: row.famiglia_cognome,
        }),
        ricercaLabel: formatRelatedSearchLabel({
          numero_ricerca_attivata: row.numero_ricerca_attivata,
          id: processId,
        }),
        recruiterLabel: recruiterId ? recruiterLabelsById.get(recruiterId) ?? "" : "",
        statoSelezione,
        statoSelezioneColor: selectionColor,
        statoRicerca,
        statoRicercaColor: processColor,
        orarioDiLavoro: asString(row.orario_di_lavoro) ?? "",
        zona: formatRelatedZona(row),
        appunti: asString(row.note_selezione) ?? "",
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

  return relatedSelectionsByWorkerId
}

export function useLavoratoriData(options: UseLavoratoriDataOptions = {}) {
  const {
    initialSelectedWorkerId = null,
    forcedWorkerStatus,
    applyGate1BaseFilters = false,
    includeRelatedSelectionDetails = true,
    gate1ProvinciaFilter = "all",
    gate1FollowupFilter = "all",
  } = options
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  })
  const [workers, setWorkers] = React.useState<LavoratoreListItem[]>([])
  const [workerRows, setWorkerRows] = React.useState<LavoratoreRecord[]>([])
  const workerRowsRef = React.useRef<LavoratoreRecord[]>([])
  const [selectedWorkerRow, setSelectedWorkerRow] =
    React.useState<LavoratoreRecord | null>(null)
  const [relatedSelectionsByWorkerId, setRelatedSelectionsByWorkerId] = React.useState<
    Map<string, NonNullable<LavoratoreListItem["otherActiveSelections"]>>
  >(new Map())
  const [workerAddressesById, setWorkerAddressesById] = React.useState<
    Map<string, Record<string, unknown>[]>
  >(new Map())
  const [workersTotal, setWorkersTotal] = React.useState(0)
  const [selectedWorkerId, setSelectedWorkerId] = React.useState<string | null>(
    initialSelectedWorkerId
  )
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  // FASE 4 BIS — catalogo filtri STATICO: niente più table-query con includeSchema.
  // L'elenco campi del filter-builder arriva dal catalogo hardcoded
  // (WORKER_SCHEMA_COLUMNS); i tipi enum/multi_enum vengono comunque sovrascritti
  // a runtime dai lookup. Stato di sola lettura (nessun setter).
  const [workersColumns] = React.useState<TableColumnMeta[]>(WORKER_SCHEMA_COLUMNS)
  const [selectedWorkerExperiences, setSelectedWorkerExperiences] = React.useState<
    EsperienzaLavoratoreRecord[]
  >([])
  const [selectedWorkerDocuments, setSelectedWorkerDocuments] = React.useState<
    DocumentoLavoratoreRecord[]
  >([])
  const [selectedWorkerReferences, setSelectedWorkerReferences] = React.useState<
    ReferenzaLavoratoreRecord[]
  >([])
  // FASE 4 BIS — "altre ricerche attive" del worker selezionato, dalla Scheda RPC
  // (related_searches). Consumato da lavoratori-cerca-view per lo split direct/other.
  const [selectedWorkerRelatedSearches, setSelectedWorkerRelatedSearches] = React.useState<
    GenericRow[]
  >([])
  // Bumped per forzare il refetch della Scheda RPC senza cambiare worker
  // (es. dopo aver aggiunto il lavoratore a una ricerca).
  const [selectedWorkerSchedaTick, setSelectedWorkerSchedaTick] = React.useState(0)
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
  // Bumped by realtime events to force the list effect to re-run silently.
  const [realtimeTick, setRealtimeTick] = React.useState(0)
  const silentReloadRef = React.useRef(false)
  const requestIdRef = React.useRef(0)
  const selectedWorkerAddressLoadAttemptsRef = React.useRef(new Set<string>())
  const lastLoadedListQueryKeyRef = React.useRef<string | null>(null)
  const inFlightListQueryKeyRef = React.useRef<string | null>(null)
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
  const lookupColorsByDomainRef = React.useRef(lookupColorsByDomain)
  const recruiterLabelsByIdRef = React.useRef(recruiterLabelsById)

  React.useEffect(() => {
    lookupColorsByDomainRef.current = lookupColorsByDomain
  }, [lookupColorsByDomain])

  React.useEffect(() => {
    recruiterLabelsByIdRef.current = recruiterLabelsById
  }, [recruiterLabelsById])

  React.useEffect(() => {
    workerRowsRef.current = workerRows
  }, [workerRows])

  React.useEffect(() => {
    setPageIndex(0)
  }, [debouncedQuery.searchValue, filters, gate1FollowupFilter, gate1ProvinciaFilter, sorting])

  // FASE 4 BIS — lo schema filtri è ora STATICO (WORKER_SCHEMA_COLUMNS), quindi
  // non c'è più nulla da caricare via table-query. Manteniamo il callback come
  // no-op per non cambiare l'API dei consumer (onRequestSchema).
  const loadWorkersSchema = React.useCallback(() => {}, [])

  React.useEffect(() => {
    let isCancelled = false

    async function loadLookupOptions() {
      try {
        const lookup = await fetchLookupValues()
        // FASE 4 BIS — le nazionalità sono ora in lookup_values
        // (lavoratori.nazionalita), quindi arrivano da lookup-values come gli
        // altri filtri: niente più chiamata dedicata lavoratori_nazionalita_options.
        const lookupOptions = normalizeLookupOptions(lookup.rows)
        if (isCancelled) return
        setLookupOptionsByDomain(lookupOptions)
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
    async function load() {
      const silent = silentReloadRef.current
      silentReloadRef.current = false

      const queryKey = JSON.stringify({
        applyGate1BaseFilters,
        filters: debouncedQuery.filters ?? null,
        forcedWorkerStatus,
        gate1FollowupFilter,
        gate1ProvinciaFilter,
        includeRelatedSelectionDetails,
        listDataVersion: WORKER_LIST_DATA_VERSION,
        offset: pageIndex * pageSize,
        pageSize,
        search: debouncedQuery.searchValue.trim(),
        sorting: debouncedQuery.sorting,
      })
      if (lastLoadedListQueryKeyRef.current === queryKey && workerRows.length > 0) {
        if (!silent) setLoading(false)
        return
      }
      if (inFlightListQueryKeyRef.current === queryKey) {
        if (!silent) setLoading(true)
        return
      }

      // FASE 4 BIS — bump del requestId SOLO quando partiamo davvero con un
      // fetch (dopo i dedup). Bumparlo a ogni run dell'effect invalidava il
      // fetch in volo a ogni re-render benigno (stessa queryKey): l'await
      // vedeva requestId != current e usciva senza settare dati né loading=false
      // → spinner infinito su query lente (es. ordinamento).
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      inFlightListQueryKeyRef.current = queryKey
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        if (applyGate1BaseFilters) {
          const gate1RpcFilters = buildGate1RpcFilters({
            filters: debouncedQuery.filters,
            gate1ProvinciaFilter,
            gate1FollowupFilter,
          })
          // FASE 4 BIS — Gate 1 SEMPRE via RPC. gate1_lavoratori assume stato
          // 'Qualificato' (l'unico usato con applyGate1BaseFilters) e applica
          // disponibilità + blocco selezioni server-side. I filtri OR passano
          // come gruppo annidato (matcher ricorsivo). Nessun fallback table-query.
          {
            const board = await fetchLavoratoriBoard("gate1", {
              limit: pageSize,
              offset: pageIndex * pageSize,
              search: debouncedQuery.searchValue.trim() || undefined,
              filters:
                gate1RpcFilters ??
                buildGate1RpcFilterGroup({
                  filters: debouncedQuery.filters,
                  gate1ProvinciaFilter,
                  gate1FollowupFilter,
                }),
              orderBy: toRpcOrderBy(debouncedQuery.sorting),
              includeRelated: includeRelatedSelectionDetails,
            })
            if (requestId !== requestIdRef.current) return

            const pageRows = board.rows.map(asLavoratoreRecord)
            setWorkerRows(pageRows)
            setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
            setRelatedSelectionsByWorkerId(
              includeRelatedSelectionDetails
                ? buildRelatedSelectionsMap(
                    board.selezioniCorrelate as GenericRow[],
                    lookupColorsByDomainRef.current,
                    recruiterLabelsByIdRef.current
                  )
                : new Map()
            )
            setWorkersTotal(board.total)
            lastLoadedListQueryKeyRef.current = queryKey
            setSelectedWorkerId((previous) => {
              if (previous && (previous === initialSelectedWorkerId || pageRows.some((row) => row.id === previous))) {
                return previous
              }
              return pageRows[0]?.id ?? null
            })
            return
          }
        }

        const gate2UserRpcFilters = buildGate1RpcFilters({
          filters: debouncedQuery.filters,
          gate1ProvinciaFilter,
          gate1FollowupFilter,
        })
        const gate2StatusRpcFilters = buildGate2RpcStatusFilters(forcedWorkerStatus)
        const gate2RpcFilters =
          gate2UserRpcFilters && gate2StatusRpcFilters
            ? [...gate2UserRpcFilters, ...gate2StatusRpcFilters]
            : null
        // Filtri utente con OR (gate2UserRpcFilters null) ma stato esprimibile:
        // costruiamo il gruppo annidato { and: [filtriUtente, ...stato] } che
        // gate2_lavoratori valuta col matcher ricorsivo → niente fallback.
        const gate2RpcFilterGroup: QueryFilterGroup | null =
          gate2UserRpcFilters === null && gate2StatusRpcFilters !== null
            ? {
                kind: "group",
                id: "gate2-rpc-filter-group",
                logic: "and",
                nodes: [
                  ...(debouncedQuery.filters &&
                  Array.isArray(debouncedQuery.filters.nodes) &&
                  debouncedQuery.filters.nodes.length > 0
                    ? [debouncedQuery.filters]
                    : []),
                  ...gate2StatusRpcFilters.map((filter, index) => ({
                    kind: "condition" as const,
                    id: `gate2-rpc-status-${index}`,
                    field: filter.field,
                    operator: filter.operator,
                    value: filter.value ?? "",
                  })),
                ],
              }
            : null
        const canUseGate2Rpc =
          !applyGate1BaseFilters &&
          (gate2RpcFilters !== null || gate2RpcFilterGroup !== null) &&
          isRpcSortable(debouncedQuery.sorting)

        if (canUseGate2Rpc) {
          const board = await fetchLavoratoriBoard("gate2", {
            limit: pageSize,
            offset: pageIndex * pageSize,
            search: debouncedQuery.searchValue.trim() || undefined,
            filters: gate2RpcFilters ?? (gate2RpcFilterGroup as QueryFilterGroup),
            orderBy: toRpcOrderBy(debouncedQuery.sorting),
            includeRelated: includeRelatedSelectionDetails,
          })
          if (requestId !== requestIdRef.current) return

          const pageRows = board.rows.map(asLavoratoreRecord)
          setWorkerRows(pageRows)
          setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
          setRelatedSelectionsByWorkerId(
            includeRelatedSelectionDetails
              ? buildRelatedSelectionsMap(
                  board.selezioniCorrelate as GenericRow[],
                  lookupColorsByDomainRef.current,
                  recruiterLabelsByIdRef.current
                )
              : new Map()
          )
          setWorkersTotal(board.total)
          lastLoadedListQueryKeyRef.current = queryKey
          setSelectedWorkerId((previous) => {
            if (previous && (previous === initialSelectedWorkerId || pageRows.some((row) => row.id === previous))) {
              return previous
            }
            return pageRows[0]?.id ?? null
          })
          return
        }

        const cercaRpcFilters = buildGate1RpcFilters({
          filters: debouncedQuery.filters,
          gate1ProvinciaFilter: "all",
          gate1FollowupFilter: "all",
        })
        // cercaRpcFilters è null quando i filtri usano la logica OR (non
        // appiattibili in array). In quel caso passiamo il GRUPPO annidato
        // grezzo: cerca_lavoratori lo valuta via lavoratore_matches_filter_group
        // (AND/OR ricorsivo). Niente più fallback table-query per i filtri OR.
        // FASE 4 BIS — Cerca SEMPRE via RPC: gate1/gate2 ritornano dai rispettivi
        // blocchi sopra, quindi qui arriva solo la vista Cerca (nessuno status
        // forzato). Nessun fallback table-query.
        {
          const board = await fetchLavoratoriBoard("cerca", {
            limit: pageSize,
            offset: pageIndex * pageSize,
            search: debouncedQuery.searchValue.trim() || undefined,
            filters: cercaRpcFilters ?? debouncedQuery.filters,
            orderBy: toRpcOrderBy(debouncedQuery.sorting),
            includeRelated: includeRelatedSelectionDetails,
          })
          if (requestId !== requestIdRef.current) return

          const pageRows = board.rows.map(asLavoratoreRecord)
          setWorkerRows(pageRows)
          setWorkerAddressesById(groupAddressesByWorker(board.indirizzi))
          setRelatedSelectionsByWorkerId(
            includeRelatedSelectionDetails
              ? buildRelatedSelectionsMap(
                  board.selezioniCorrelate as GenericRow[],
                  lookupColorsByDomainRef.current,
                  recruiterLabelsByIdRef.current
                )
              : new Map()
          )
          setWorkersTotal(board.total)
          lastLoadedListQueryKeyRef.current = queryKey
          setSelectedWorkerId((previous) => {
            if (previous && (previous === initialSelectedWorkerId || pageRows.some((row) => row.id === previous))) {
              return previous
            }
            return pageRows[0]?.id ?? null
          })
          return
        }
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) return
        if (!silent) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Errore nel caricamento lavoratori"
          )
          setWorkers([])
          setWorkerRows([])
          setWorkerAddressesById(new Map())
          setRelatedSelectionsByWorkerId(new Map())
          setWorkersTotal(0)
        }
      } finally {
        if (inFlightListQueryKeyRef.current === queryKey) {
          inFlightListQueryKeyRef.current = null
        }
        if (requestId === requestIdRef.current && !silent) setLoading(false)
      }
    }

    void load()
  }, [
    applyGate1BaseFilters,
    debouncedQuery,
    forcedWorkerStatus,
    gate1FollowupFilter,
    gate1ProvinciaFilter,
    includeRelatedSelectionDetails,
    initialSelectedWorkerId,
    pageIndex,
    pageSize,
    realtimeTick,
    workerRows.length,
  ])

  const reloadSilently = React.useCallback(() => {
    silentReloadRef.current = true
    clearReadCaches()
    // Invalidate the cached query key so the load effect actually re-fetches
    // even when the query params haven't changed.
    lastLoadedListQueryKeyRef.current = null
    setRealtimeTick((current) => current + 1)
  }, [])

  useRealtimeBoardSync({
    tables: LAVORATORI_REALTIME_TABLES,
    reload: reloadSilently,
  })

  React.useEffect(() => {
    setWorkers(
      workerRows.map((row) => ({
        ...buildWorkerListItem(row, lookupColorsByDomain, workerAddressesById),
        otherActiveSelections: relatedSelectionsByWorkerId.get(row.id) ?? null,
      }))
    )
  }, [lookupColorsByDomain, relatedSelectionsByWorkerId, workerAddressesById, workerRows])

  // FASE 4 BIS — Scheda RPC: worker row + documenti/esperienze/referenze +
  // altre-ricerche del worker selezionato in UNA chiamata (lavoratore_scheda),
  // al posto di lavoratori_by_ids + lavoratore_extras (+ i fetch di cerca-view).
  // Seed immediato della riga dalla lista per UI reattiva, poi rimpiazzo col
  // dettaglio completo.
  React.useEffect(() => {
    let isCancelled = false

    async function loadSelectedWorkerScheda() {
      if (!selectedWorkerId) {
        setSelectedWorkerRow(null)
        setSelectedWorkerDocuments([])
        setSelectedWorkerExperiences([])
        setSelectedWorkerReferences([])
        setSelectedWorkerRelatedSearches([])
        setLoadingSelectedWorkerDocuments(false)
        setLoadingSelectedWorkerExperiences(false)
        setLoadingSelectedWorkerReferences(false)
        return
      }

      const listRow = workerRowsRef.current.find((row) => row.id === selectedWorkerId) ?? null
      setSelectedWorkerRow(listRow)
      setLoadingSelectedWorkerDocuments(true)
      setLoadingSelectedWorkerExperiences(true)
      setLoadingSelectedWorkerReferences(true)

      try {
        const scheda = await fetchLavoratoreScheda(selectedWorkerId)
        if (isCancelled) return
        const detailRow = scheda.worker ? asLavoratoreRecord(scheda.worker) : listRow
        setSelectedWorkerRow(detailRow ?? null)
        setSelectedWorkerDocuments(scheda.documenti as DocumentoLavoratoreRecord[])
        setSelectedWorkerExperiences(scheda.esperienze as EsperienzaLavoratoreRecord[])
        setSelectedWorkerReferences(scheda.referenze as ReferenzaLavoratoreRecord[])
        setSelectedWorkerRelatedSearches(scheda.relatedSearches as GenericRow[])
      } catch {
        if (isCancelled) return
        setSelectedWorkerRow(listRow)
        setSelectedWorkerDocuments([])
        setSelectedWorkerExperiences([])
        setSelectedWorkerReferences([])
        setSelectedWorkerRelatedSearches([])
      } finally {
        if (!isCancelled) {
          setLoadingSelectedWorkerDocuments(false)
          setLoadingSelectedWorkerExperiences(false)
          setLoadingSelectedWorkerReferences(false)
        }
      }
    }

    void loadSelectedWorkerScheda()

    return () => {
      isCancelled = true
    }
    // NOTE: omette volutamente realtimeTick (i save passano da trackWrite +
    // echo-window di useRealtimeBoardSync; l'anti-overwrite del draft è gestito
    // in use-selected-worker-editor via le guardie isEditingXxx).
    // selectedWorkerSchedaTick: refetch forzato dopo mutazioni (es. aggiunta a ricerca).
  }, [selectedWorkerId, selectedWorkerSchedaTick])

  const reloadSelectedWorkerScheda = React.useCallback(() => {
    setSelectedWorkerSchedaTick((current) => current + 1)
  }, [])

  const filterFields = React.useMemo<FilterField[]>(() => {
    return workersColumns.map((column) => {
      const domain = `lavoratori.${column.name}`
      const options = lookupOptionsByDomain.get(domain) ?? []
      const resolvedFilterType = lookupFilterTypeByDomain.get(domain) ?? column.filterType
      // The DB stores value_label (not value_key) for lookup-backed fields. Use
      // label as the filter option value so filter conditions match the stored value.
      // tipo_lavoro_domestico stores canonical DB labels via normalizeDomesticRoleDbLabel
      // (e.g. "Colf / Pulizie", "Assistenza Domestica / Badante").
      const filterOptions =
        resolvedFilterType === "enum" || resolvedFilterType === "multi_enum"
          ? options.map((opt) => ({
              value:
                column.name === "tipo_lavoro_domestico"
                  ? normalizeDomesticRoleDbLabel(opt.label)
                  : opt.label,
              label: opt.label,
            }))
          : undefined
      return {
        label: toReadableColumnLabel(column.name),
        value: column.name,
        type: resolvedFilterType,
        options: filterOptions,
      } satisfies FilterField
    })
  }, [lookupFilterTypeByDomain, lookupOptionsByDomain, workersColumns])

  // FASE 4 BIS — colonne ordinabili dalla whitelist (non più dallo schema
  // table-query). Le RPC ordinano solo su questi campi, quindi la UI "Ordina
  // per" deve offrire esattamente questi e nient'altro.
  const sortingColumns = React.useMemo<ColumnDef<LavoratoreRecord>[]>(
    () =>
      WORKER_SORTABLE_FIELDS.map((field) => ({
        id: field,
        header: toReadableColumnLabel(field),
        accessorFn: (row) => row[field as keyof LavoratoreRecord],
      })),
    []
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
      if (previous && (previous === initialSelectedWorkerId || workers.some((worker) => worker.id === previous))) {
        return previous
      }
      return workers[0]?.id ?? null
    })
  }, [initialSelectedWorkerId, workers])

  React.useEffect(() => {
    if (!initialSelectedWorkerId) return
    setSelectedWorkerId(initialSelectedWorkerId)
  }, [initialSelectedWorkerId])

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
  const selectedWorker = React.useMemo(() => {
    const listWorker = workers.find((worker) => worker.id === selectedWorkerId) ?? null
    if (listWorker) return listWorker
    if (!selectedWorkerRow) return null

    return toListItem(selectedWorkerRow, {
      isBlacklisted: isBlacklistValue(selectedWorkerRow.check_blacklist),
      statusFlags: toWorkerStatusFlags(selectedWorkerRow.stato_lavoratore),
    })
  }, [selectedWorkerId, selectedWorkerRow, workers])
  const selectedWorkerAddress = React.useMemo(
    () =>
      selectedWorkerId
        ? resolveWorkerAddress(selectedWorkerId, workerAddressesById)
        : null,
    [selectedWorkerId, workerAddressesById]
  )

  React.useEffect(() => {
    if (!selectedWorkerId || selectedWorkerAddress) return
    if (selectedWorkerAddressLoadAttemptsRef.current.has(selectedWorkerId)) return

    let isCancelled = false
    const workerId = selectedWorkerId
    selectedWorkerAddressLoadAttemptsRef.current.add(workerId)

    async function loadSelectedWorkerAddress() {
      const result = await fetchWorkerAddressesByIds([workerId])
      if (isCancelled) return
      const addresses = result.get(workerId)
      if (!addresses || addresses.length === 0) return

      setWorkerAddressesById((current) => {
        const next = new Map(current)
        next.set(workerId, addresses)
        return next
      })
    }

    void loadSelectedWorkerAddress().catch(() => {
      if (!isCancelled) selectedWorkerAddressLoadAttemptsRef.current.delete(workerId)
    })

    return () => {
      isCancelled = true
    }
    // NOTE: intentionally omits realtimeTick (see loadSelectedWorkerRow
    // effect above for rationale).
  }, [selectedWorkerAddress, selectedWorkerId])

  const applyUpdatedWorkerRow = React.useCallback(
    (nextRow: LavoratoreRecord) => {
      setSelectedWorkerRow((current) => (current?.id === nextRow.id ? nextRow : current))
      setWorkerRows((current) =>
        current.map((row) => (row.id === nextRow.id ? { ...row, ...nextRow } : row))
      )
      setWorkers((current) =>
        current.map((worker) =>
          worker.id === nextRow.id
            ? {
                ...buildWorkerListItem(
                  { ...(workerRows.find((row) => row.id === nextRow.id) ?? nextRow), ...nextRow },
                  lookupColorsByDomain,
                  workerAddressesById
                ),
                otherActiveSelections: worker.otherActiveSelections ?? null,
              }
            : worker
        )
      )
    },
    [lookupColorsByDomain, workerAddressesById, workerRows]
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
    workerAddressesById,
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
    selectedWorkerRelatedSearches,
    reloadSelectedWorkerScheda,
    loading,
    error,
    setError,
    lookupOptionsByDomain,
    lookupFilterTypeByDomain,
    lookupColorsByDomain,
    filterFields,
    loadWorkersSchema,
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
