import * as React from "react"
import { toast } from "sonner"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import {
  asString,
  asStringArrayFirst,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  toAvatarThumbnailUrl,
  toAvatarUrl,
} from "@/features/lavoratori/lib/base-utils"
import {
  isBlacklistValue,
  normalizeLookupColors,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import { isDirectInvolvementSelection } from "@/features/lavoratori/lib/involvement-utils"
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils"
import {
  fetchFamiglie,
  fetchIndirizzi,
  fetchLavoratori,
  fetchLookupValues,
  fetchProcessiMatching,
  fetchSelezioniLavoratori,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

type GenericRow = Record<string, unknown>

type StageDefinition = {
  id: string
  label: string
  color: string | null
}

type StageMetadata = {
  definitions: StageDefinition[]
  aliases: Map<string, string>
}

export type RicercaWorkerSelectionCard = {
  id: string
  status: string
  punteggio: string
  scheduledAt: string | null
  endedAt: string | null
  worker: LavoratoreListItem
}

export type RicercaWorkerSelectionColumn = {
  id: string
  label: string
  color: string | null
  dropStatusId?: string
  groupColors?: Record<string, string | null>
  groupStatusIds?: Record<string, string>
  cards: RicercaWorkerSelectionCard[]
}

type UseRicercaWorkersPipelineState = {
  loading: boolean
  error: string | null
  columns: RicercaWorkerSelectionColumn[]
  moveCard: (selectionId: string, targetStatusId: string) => Promise<void>
  /**
   * Forza un refetch della pipeline. Da chiamare dopo mutazioni esterne
   * (aggiunta lavoratore, smart matching, ecc.) che alterano i dati
   * server-side e che non sono state riflesse via `moveCard`.
   */
  refresh: () => void
}

const EMPTY_RECRUITER_LABELS_BY_ID = new Map<string, string>()
const SELEZIONI_PAGE_SIZE = 500
const WORKER_BATCH_SIZE = 250
const ADDRESS_BATCH_SIZE = 120
const RELATED_WORKER_BATCH_SIZE = 50
const RELATED_PROCESS_BATCH_SIZE = 150
const RELATED_FAMILY_BATCH_SIZE = 150
const PIPELINE_SELECTIONS_SELECT = [
  "id",
  "lavoratore_id",
  "stato_selezione",
  "punteggio",
  "travel_time_tra_cap",
  "data_ora_colloquio_famiglia_lavoratore",
  "data_ora_fine_colloquio_famiglia_lavoratore",
  "aggiornato_il",
] satisfies string[]
const PIPELINE_WORKERS_SELECT = [
  "id",
  "nome",
  "cognome",
  "foto",
  "immagine",
  "avatar_url",
  "cap",
  "telefono",
  "check_blacklist",
  "tipo_lavoro_domestico",
  "tipo_rapporto_lavorativo",
  "data_di_nascita",
  "anni_esperienza_colf",
  "anni_esperienza_babysitter",
  "stato_lavoratore",
  "disponibilita",
] satisfies string[]
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

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeStatusToken(value: string | null | undefined) {
  return normalizeLookupToken(value)
    .replaceAll("_", " ")
    .replaceAll(",", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
}

const CANDIDATI_GROUP_KEYS = {
  good: "candidato - good fit",
  prospetto: "prospetto",
  poor: "candidato - poor fit",
} as const

function isCandidatiStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.good) ||
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.prospetto) ||
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.poor)
  )
}

const ARCHIVIO_GROUP_KEYS = {
  archivio: "archivio",
  nonSelezionato: "non selezionato",
  nascostoOot: "nascosto - oot",
  noMatch: "no match",
} as const

function isArchivioStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.archivio) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.nonSelezionato) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.nascostoOot) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.noMatch) ||
    (token.includes("nascosto") && token.includes("oot"))
  )
}

const DA_COLLOQUIARE_GROUP_KEYS = {
  daColloquiare: "da colloquiare",
  invitatoColloquio: "invitato a colloquio",
  nonRisponde: "non risponde",
} as const

function isDaColloquiareStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.daColloquiare) ||
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.invitatoColloquio) ||
    (token.includes("invitat") && token.includes("colloquio")) ||
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.nonRisponde)
  )
}

const COLLOQUI_GROUP_KEYS = {
  colloquioSchedulato: "colloquio schedulato",
  colloquioRimandato: "colloquio rimandato",
  colloquioFatto: "colloquio fatto",
  provaSchedulata: "prova schedulata",
  provaRimandata: "prova rimandata",
  provaInCorso: "prova in corso",
  match: "match",
} as const
const LEGACY_PROVA_CON_CLIENTE_STATUS = "prova con cliente"

function isLegacyProvaConClienteStatus(value: string | null | undefined) {
  return (
    normalizeStatusToken(value) ===
    normalizeStatusToken(LEGACY_PROVA_CON_CLIENTE_STATUS)
  )
}

function canonicalizeSelectionStatus(value: string) {
  return isLegacyProvaConClienteStatus(value) ? "Prova in corso" : value
}

function isColloquiStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioSchedulato) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioRimandato) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioFatto) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaSchedulata) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaRimandata) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaInCorso) ||
    token === normalizeStatusToken(LEGACY_PROVA_CON_CLIENTE_STATUS) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.match)
  )
}

function buildGroupColors(columns: RicercaWorkerSelectionColumn[]) {
  const groupColors: Record<string, string | null> = {}

  for (const column of columns) {
    groupColors[normalizeStatusToken(column.id)] = column.color
    groupColors[normalizeStatusToken(column.label)] = column.color
  }

  return groupColors
}

function buildGroupStatusIds(columns: RicercaWorkerSelectionColumn[]) {
  const groupStatusIds: Record<string, string> = {}

  for (const column of columns) {
    const canonicalId = column.id
    groupStatusIds[normalizeStatusToken(column.id)] = canonicalId
    groupStatusIds[normalizeStatusToken(column.label)] = canonicalId
  }

  return groupStatusIds
}

function resolvePreferredDropStatusId(
  columns: RicercaWorkerSelectionColumn[],
  preferredToken: string,
  fallback: string
) {
  const normalizedPreferred = normalizeStatusToken(preferredToken)
  const preferred = columns.find(
    (column) =>
      normalizeStatusToken(column.id) === normalizedPreferred ||
      normalizeStatusToken(column.label) === normalizedPreferred
  )
  return preferred?.id ?? fallback
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim().replace(",", "."))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function parseAddressCoordinates(address: GenericRow | undefined) {
  if (!address) return null
  const lat = toNumberValue(address.latitudine)
  const lng = toNumberValue(address.longitudine)
  if (lat === null || lng === null) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function formatAddressLabel(address: GenericRow | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  const street = [toStringValue(address.via), toStringValue(address.civico)]
    .filter(Boolean)
    .join(" ")
    .trim()
  const note = toStringValue(address.note)
  const citta = toStringValue(address.citta)
  const cap = toStringValue(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [street || shortNote, citta, cap]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
      .join(" • ") || null
  )
}

function resolveWorkerAddress(
  workerId: string,
  addressesByWorkerId: Map<string, GenericRow[]>
) {
  const addresses = addressesByWorkerId.get(workerId) ?? []
  if (addresses.length === 0) return undefined

  return (
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "residenza"
    ) ??
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "domicilio"
    ) ??
    addresses[0]
  )
}

function formatRelatedFamilyName(row: GenericRow | null | undefined) {
  const familyName = [
    toStringValue(row?.nome),
    toStringValue(row?.cognome),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim()

  return familyName || "Famiglia senza nome"
}

function formatRelatedSearchLabel(processRow: GenericRow) {
  const searchNumber = toStringValue(processRow.numero_ricerca_attivata)
  if (searchNumber) return `Ricerca #${searchNumber}`

  const processId = toStringValue(processRow.id)
  return processId ? `Ricerca ${processId.slice(0, 8)}` : "Ricerca"
}

function formatRelatedZona(processRow: GenericRow) {
  const parts = [
    toStringValue(processRow.indirizzo_prova_via),
    toStringValue(processRow.indirizzo_prova_comune),
    toStringValue(processRow.indirizzo_prova_provincia),
    toStringValue(processRow.indirizzo_prova_cap),
    toStringValue(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index
  )

  return parts.join(" • ")
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
        limit: SELEZIONI_PAGE_SIZE,
        offset,
        orderBy: [{ field: "aggiornato_il", ascending: false }],
        filters: {
          kind: "group",
          id: `pipeline-related-selections-${index}-${offset}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `pipeline-related-worker-ids-${index}-${offset}`,
              field: "lavoratore_id",
              operator: "in",
              value: batch.join(","),
            },
          ],
        },
      }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`selezioni_lavoratori correlate(batch ${index}): ${message}`)
      })

      const pageRows = asRowArray(result.rows)
      rows.push(...pageRows)

      if (pageRows.length < SELEZIONI_PAGE_SIZE) break
      offset += SELEZIONI_PAGE_SIZE
    }
  }

  return rows
}

async function fetchRelatedProcessesByIds(processIds: string[]) {
  if (processIds.length === 0) return []

  const rows: GenericRow[] = []

  for (
    let index = 0;
    index < processIds.length;
    index += RELATED_PROCESS_BATCH_SIZE
  ) {
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
        id: `pipeline-related-processes-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `pipeline-related-process-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`processi_matching correlati(batch ${index}): ${message}`)
    })

    rows.push(...asRowArray(result.rows))
  }

  return rows
}

async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return []

  const rows: GenericRow[] = []

  for (
    let index = 0;
    index < familyIds.length;
    index += RELATED_FAMILY_BATCH_SIZE
  ) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE)
    const result = await fetchFamiglie({
      select: ["id", "nome", "cognome"],
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `pipeline-related-families-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `pipeline-related-family-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`famiglie correlate(batch ${index}): ${message}`)
    })

    rows.push(...asRowArray(result.rows))
  }

  return rows
}

async function fetchRelatedActiveSelectionsByWorkerIds({
  workerIds,
  currentProcessId,
  lookupColorsByDomain,
  recruiterLabelsById,
}: {
  workerIds: string[]
  currentProcessId: string
  lookupColorsByDomain: Map<string, string>
  recruiterLabelsById: Map<string, string>
}) {
  const selections = (await fetchSelectionsForWorkers(workerIds)).filter((selection) => {
    const processId = toStringValue(selection.processo_matching_id)
    return Boolean(processId) && processId !== currentProcessId
  })

  const processIds = Array.from(
    new Set(
      selections
        .map((selection) => toStringValue(selection.processo_matching_id))
        .filter((value): value is string => Boolean(value))
    )
  )
  const processRows = await fetchRelatedProcessesByIds(processIds)
  const processRowsById = new Map(
    processRows
      .map((row) => {
        const rowId = toStringValue(row.id)
        if (!rowId) return null
        return [rowId, row] as const
      })
      .filter((entry): entry is readonly [string, GenericRow] => Boolean(entry))
  )
  const familyIds = Array.from(
    new Set(
      processRows
        .map((row) => toStringValue(row.famiglia_id))
        .filter((value): value is string => Boolean(value))
    )
  )
  const familyRows = await fetchRelatedFamiliesByIds(familyIds)
  const familyRowsById = new Map(
    familyRows
      .map((row) => {
        const rowId = toStringValue(row.id)
        if (!rowId) return null
        return [rowId, row] as const
      })
      .filter((entry): entry is readonly [string, GenericRow] => Boolean(entry))
  )
  const selectionsByWorkerId = new Map<string, GenericRow[]>()

  for (const selection of selections) {
    const workerId = toStringValue(selection.lavoratore_id)
    if (!workerId) continue
    const current = selectionsByWorkerId.get(workerId) ?? []
    current.push(selection)
    selectionsByWorkerId.set(workerId, current)
  }

  const relatedSelectionsByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()

  for (const workerId of workerIds) {
    const workerSelections = selectionsByWorkerId.get(workerId) ?? []
    const details: NonNullable<LavoratoreListItem["otherActiveSelections"]>["details"] = []
    const dots: NonNullable<LavoratoreListItem["otherActiveSelections"]>["dots"] = []
    const seenProcesses = new Set<string>()

    for (const selection of workerSelections) {
      const processId = toStringValue(selection.processo_matching_id)
      if (!processId || seenProcesses.has(processId)) continue

      const processRow = processRowsById.get(processId)
      if (!processRow || !isDirectInvolvementSelection(selection)) {
        continue
      }

      const statoSelezione = toStringValue(selection.stato_selezione) ?? "-"
      const statoRicerca = toStringValue(processRow.stato_res) ?? "-"
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
      const recruiterId = toStringValue(processRow.recruiter_ricerca_e_selezione_id)
      const familyRow = familyRowsById.get(toStringValue(processRow.famiglia_id) ?? "")

      details.push({
        id: processId,
        familyName: formatRelatedFamilyName(familyRow),
        ricercaLabel: formatRelatedSearchLabel(processRow),
        recruiterLabel: recruiterId ? recruiterLabelsById.get(recruiterId) ?? "" : "",
        statoSelezione,
        statoSelezioneColor: selectionColor,
        statoRicerca,
        statoRicercaColor: processColor,
        orarioDiLavoro: toStringValue(processRow.orario_di_lavoro) ?? "",
        zona: formatRelatedZona(processRow),
        appunti: toStringValue(selection.note_selezione) ?? "",
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

function buildWorkerListItem(
  worker: GenericRow,
  lookupColorsByDomain: Map<string, string>,
  addressesByWorkerId: Map<string, GenericRow[]>
): LavoratoreListItem {
  const workerId = toStringValue(worker.id) ?? "unknown-worker"
  const nome = toStringValue(worker.nome) ?? ""
  const cognome = toStringValue(worker.cognome) ?? ""
  const statoLavoratore = toStringValue(worker.stato_lavoratore)
  const disponibilita = toStringValue(worker.disponibilita)
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
  const ruoliDomestici = normalizeDomesticRoleLabels(readArrayStrings(worker.tipo_lavoro_domestico))
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavoro = asStringArrayFirst(worker.tipo_rapporto_lavorativo) || null
  const statusFlags = toWorkerStatusFlags(statoLavoratore)
  const workerAddress = resolveWorkerAddress(workerId, addressesByWorkerId)

  const anniEsperienzaColf = toNumberValue(worker.anni_esperienza_colf)
  const anniEsperienzaBabysitter = toNumberValue(worker.anni_esperienza_babysitter)

  return {
    id: workerId,
    nomeCompleto: `${nome} ${cognome}`.trim() || workerId,
    immagineUrl: toAvatarThumbnailUrl(worker) ?? toAvatarUrl(worker) ?? getDefaultWorkerAvatar(workerId),
    travelTimeMinutes: null,
    locationLabel: formatAddressLabel(workerAddress) ?? asString(worker.cap) ?? null,
    telefono: asString(worker.telefono) || null,
    isBlacklisted: isBlacklistValue(worker.check_blacklist),
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
    eta: getAgeFromBirthDate(worker.data_di_nascita),
    anniEsperienzaColf,
    anniEsperienzaBabysitter,
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
    coordinates: parseAddressCoordinates(workerAddress),
    isDisponibile,
    isQualified: statusFlags.isQualified,
    isIdoneo: statusFlags.isIdoneo,
    isCertificato: statusFlags.isCertificato,
    otherActiveSelections: null,
  }
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const stageRows = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === "lavoratori" &&
        row.entity_field === "stato_selezione" &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label))
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const definitions: StageDefinition[] = []
  const aliases = new Map<string, string>()

  for (const row of stageRows) {
    const id = toStringValue(row.value_key)
    const label = toStringValue(row.value_label)
    if (!id || !label) continue

    definitions.push({
      id,
      label,
      color: readLookupColor(row.metadata),
    })
    aliases.set(normalizeLookupToken(id), id)
    aliases.set(normalizeLookupToken(label), id)
  }

  return {
    definitions,
    aliases,
  }
}

async function fetchAllSelectionsForProcess(processId: string) {
  const rows: GenericRow[] = []
  let offset = 0

  while (true) {
    const result = await fetchSelezioniLavoratori({
      select: PIPELINE_SELECTIONS_SELECT,
      limit: SELEZIONI_PAGE_SIZE,
      offset,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: "selezioni-lavoratori-by-process",
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: "processo-matching-id",
            field: "processo_matching_id",
            operator: "is",
            value: processId,
          },
        ],
      },
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`selezioni_lavoratori: ${message}`)
    })

    const pageRows = asRowArray(result.rows)
    rows.push(...pageRows)

    if (pageRows.length < SELEZIONI_PAGE_SIZE) break
    offset += SELEZIONI_PAGE_SIZE
  }

  return rows
}

async function fetchWorkersByIds(workerIds: string[]) {
  if (workerIds.length === 0) return []

  const workerRows: GenericRow[] = []

  for (let index = 0; index < workerIds.length; index += WORKER_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + WORKER_BATCH_SIZE)
    const result = await fetchLavoratori({
      select: PIPELINE_WORKERS_SELECT,
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `pipeline-workers-by-id-batch-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition" as const,
            id: `pipeline-workers-id-in-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`lavoratori(batch ${index}): ${message}`)
    })

    workerRows.push(...asRowArray(result.rows))
  }

  return workerRows
}

async function fetchWorkerAddressesByIds(workerIds: string[]) {
  if (workerIds.length === 0) return new Map<string, GenericRow[]>()

  const addressesByWorkerId = new Map<string, GenericRow[]>()

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
        "latitudine",
        "longitudine",
      ],
      limit: Math.max(batch.length * 2, batch.length),
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: `pipeline-worker-addresses-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `pipeline-worker-addresses-table-${index}`,
            field: "entita_tabella",
            operator: "is",
            value: "lavoratori",
          },
          {
            kind: "condition",
            id: `pipeline-worker-addresses-id-${index}`,
            field: "entita_id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`indirizzi(batch ${index}): ${message}`)
    })

    for (const row of asRowArray(result.rows)) {
      const workerId = toStringValue(row.entita_id)
      if (!workerId) continue
      const current = addressesByWorkerId.get(workerId) ?? []
      current.push(row)
      addressesByWorkerId.set(workerId, current)
    }
  }

  return addressesByWorkerId
}

async function fetchWorkersPipelineData(
  processId: string,
  recruiterLabelsById: Map<string, string>
): Promise<RicercaWorkerSelectionColumn[]> {
  const [selezioniRows, lookupResult] = await Promise.all([
    fetchAllSelectionsForProcess(processId),
    fetchLookupValues().catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`lookup_values: ${message}`)
    }),
  ])

  const lookupRows = lookupResult.rows
  const lookupColorsByDomain = normalizeLookupColors(lookupRows)

  const workerIds = Array.from(
    new Set(
      selezioniRows
        .map((selection) => toStringValue(selection.lavoratore_id))
        .filter((value): value is string => Boolean(value))
    )
  )

  const [
    workerRows,
    addressesByWorkerId,
    relatedSelectionsByWorkerId,
  ] = await Promise.all([
    fetchWorkersByIds(workerIds),
    fetchWorkerAddressesByIds(workerIds),
    fetchRelatedActiveSelectionsByWorkerIds({
      workerIds,
      currentProcessId: processId,
      lookupColorsByDomain,
      recruiterLabelsById,
    }).catch(() => new Map<string, NonNullable<LavoratoreListItem["otherActiveSelections"]>>()),
  ])
  const stageMetadata = buildStageMetadata(lookupRows)
  const stageDefinitions = stageMetadata.definitions

  const workerById = new Map<string, GenericRow>()
  for (const worker of workerRows) {
    const workerId = toStringValue(worker.id)
    if (!workerId) continue
    workerById.set(workerId, worker)
  }

  const cardsByStageId = new Map<string, RicercaWorkerSelectionCard[]>()
  for (const stage of stageDefinitions) {
    cardsByStageId.set(stage.id, [])
  }

  const unknownStages = new Map<string, RicercaWorkerSelectionColumn>()

  for (const selection of selezioniRows) {
    const id = toStringValue(selection.id)
    const statusRaw = toStringValue(selection.stato_selezione) ?? "Prospetto"
    const workerId = toStringValue(selection.lavoratore_id)
    if (!id || !workerId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(statusRaw)) ?? statusRaw
    const canonicalStage = canonicalizeSelectionStatus(stage)
    const worker = workerById.get(workerId)

    const workerCard = worker
      ? {
          ...buildWorkerListItem(worker, lookupColorsByDomain, addressesByWorkerId),
          travelTimeMinutes: toNumberValue(selection.travel_time_tra_cap),
          otherActiveSelections: relatedSelectionsByWorkerId.get(workerId) ?? null,
        }
      : {
          id: workerId,
          nomeCompleto: workerId,
          immagineUrl: getDefaultWorkerAvatar(workerId),
          travelTimeMinutes: toNumberValue(selection.travel_time_tra_cap),
          locationLabel: null,
          telefono: null,
          isBlacklisted: false,
          tipoRuolo: null,
          tipoRuoloColor: null,
          tipoLavoro: null,
          tipoLavoroColor: null,
          ruoliDomestici: [],
          eta: null,
          anniEsperienzaColf: null,
          anniEsperienzaBabysitter: null,
          statoLavoratore: "-",
          statoLavoratoreColor: null,
          disponibilita: null,
          disponibilitaColor: null,
          coordinates: null,
          isDisponibile: null,
          isQualified: false,
          isIdoneo: false,
          isCertificato: false,
          otherActiveSelections: relatedSelectionsByWorkerId.get(workerId) ?? null,
        }

    const card: RicercaWorkerSelectionCard = {
      id,
      status: canonicalStage,
      punteggio: toStringValue(selection.punteggio) ?? "-",
      scheduledAt: toStringValue(selection.data_ora_colloquio_famiglia_lavoratore),
      endedAt: toStringValue(selection.data_ora_fine_colloquio_famiglia_lavoratore),
      worker: workerCard,
    }

    const knownColumn = cardsByStageId.get(canonicalStage)
    if (knownColumn) {
      knownColumn.push(card)
      continue
    }

    if (!unknownStages.has(canonicalStage)) {
      unknownStages.set(canonicalStage, {
        id: canonicalStage,
        label: canonicalStage,
        color: null,
        cards: [],
      })
    }
    unknownStages.get(canonicalStage)?.cards.push(card)
  }

  const baseColumns: RicercaWorkerSelectionColumn[] = [
    ...stageDefinitions.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      cards: cardsByStageId.get(stage.id) ?? [],
    })),
    ...unknownStages.values(),
  ]

  const candidateColumns = baseColumns.filter(
    (column) => isCandidatiStatus(column.id) || isCandidatiStatus(column.label)
  )
  let nextColumns = baseColumns

  if (candidateColumns.length > 0) {
    const firstCandidateIndex = nextColumns.findIndex((column) =>
      candidateColumns.some((candidate) => candidate.id === column.id)
    )

    const mergedCandidatiColumn: RicercaWorkerSelectionColumn = {
      id: "__candidati__",
      label: "Candidati",
      color: "sky",
      dropStatusId: resolvePreferredDropStatusId(
        candidateColumns,
        "prospetto",
        "Prospetto"
      ),
      groupColors: buildGroupColors(candidateColumns),
      groupStatusIds: buildGroupStatusIds(candidateColumns),
      cards: candidateColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !candidateColumns.some((candidate) => candidate.id === column.id)
    )
    nextColumns.splice(Math.max(0, firstCandidateIndex), 0, mergedCandidatiColumn)
  }

  const daColloquiareColumns = nextColumns.filter(
    (column) => isDaColloquiareStatus(column.id) || isDaColloquiareStatus(column.label)
  )
  if (daColloquiareColumns.length > 0) {
    const firstDaColloquiareIndex = nextColumns.findIndex((column) =>
      daColloquiareColumns.some((grouped) => grouped.id === column.id)
    )

    const mergedDaColloquiareColumn: RicercaWorkerSelectionColumn = {
      id: "__da_colloquiare__",
      label: "Da colloquiare",
      color:
        daColloquiareColumns.find(
          (column) => normalizeStatusToken(column.label) === "da colloquiare"
        )?.color ?? "indigo",
      dropStatusId: resolvePreferredDropStatusId(
        daColloquiareColumns,
        "da colloquiare",
        "Da colloquiare"
      ),
      groupColors: buildGroupColors(daColloquiareColumns),
      groupStatusIds: buildGroupStatusIds(daColloquiareColumns),
      cards: daColloquiareColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !daColloquiareColumns.some((grouped) => grouped.id === column.id)
    )
    nextColumns.splice(
      Math.max(0, firstDaColloquiareIndex),
      0,
      mergedDaColloquiareColumn
    )
  }

  const archivioColumns = nextColumns.filter(
    (column) => isArchivioStatus(column.id) || isArchivioStatus(column.label)
  )
  if (archivioColumns.length > 0) {
    const mergedArchivioColumn: RicercaWorkerSelectionColumn = {
      id: "__archivio__",
      label: "Scartati",
      color: "muted",
      dropStatusId: resolvePreferredDropStatusId(
        archivioColumns,
        "archivio",
        "Archivio"
      ),
      groupColors: buildGroupColors(archivioColumns),
      groupStatusIds: buildGroupStatusIds(archivioColumns),
      cards: archivioColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !archivioColumns.some((archivio) => archivio.id === column.id)
    )
    nextColumns.push(mergedArchivioColumn)
  }

  const colloquiColumns = nextColumns.filter(
    (column) => isColloquiStatus(column.id) || isColloquiStatus(column.label)
  )
  if (colloquiColumns.length > 0) {
    const firstColloquiIndex = nextColumns.findIndex((column) =>
      colloquiColumns.some((colloquio) => colloquio.id === column.id)
    )

    const mergedColloquiColumn: RicercaWorkerSelectionColumn = {
      id: "__colloqui_match__",
      label: "Colloqui / Match",
      color: "green",
      dropStatusId: resolvePreferredDropStatusId(
        colloquiColumns,
        "colloquio schedulato",
        "Colloquio schedulato"
      ),
      groupColors: buildGroupColors(colloquiColumns),
      groupStatusIds: buildGroupStatusIds(colloquiColumns),
      cards: colloquiColumns.flatMap((column) => column.cards),
    }

    nextColumns = nextColumns.filter(
      (column) => !colloquiColumns.some((colloquio) => colloquio.id === column.id)
    )
    nextColumns.splice(Math.max(0, firstColloquiIndex), 0, mergedColloquiColumn)
  }

  return nextColumns
}

export function useRicercaWorkersPipeline(
  processId: string,
  recruiterLabelsById: Map<string, string> = EMPTY_RECRUITER_LABELS_BY_ID
): UseRicercaWorkersPipelineState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<RicercaWorkerSelectionColumn[]>([])
  const [refreshTick, setRefreshTick] = React.useState(0)
  const refresh = React.useCallback(() => {
    setRefreshTick((current) => current + 1)
  }, [])

  const moveCard = React.useCallback(
    async (selectionId: string, targetStatusId: string) => {
      const previous = columns

      setColumns((current) => {
        let movedCard: RicercaWorkerSelectionCard | null = null

        const nextColumns = current.map((column) => {
          if (column.cards.some((card) => card.id === selectionId)) {
            const remainingCards = column.cards.filter((card) => {
              if (card.id !== selectionId) return true
              movedCard = { ...card, status: targetStatusId }
              return false
            })
            return { ...column, cards: remainingCards }
          }

          return column
        })

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStatusId ||
          (column.id === "__candidati__" && isCandidatiStatus(targetStatusId)) ||
          (column.id === "__da_colloquiare__" &&
            isDaColloquiareStatus(targetStatusId)) ||
          (column.id === "__archivio__" && isArchivioStatus(targetStatusId)) ||
          (column.id === "__colloqui_match__" && isColloquiStatus(targetStatusId))
            ? { ...column, cards: [movedCard as RicercaWorkerSelectionCard, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("selezioni_lavoratori", selectionId, {
          stato_selezione: targetStatusId,
        })
      } catch (caughtError) {
        setColumns(previous)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato selezione lavoratore"
        setError(message)
        toast.error(message)
      }
    },
    [columns]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchWorkersPipelineData(processId, recruiterLabelsById)
        if (cancelled) return
        setColumns(data)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricamento pipeline lavoratori"
        )
        setColumns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [processId, recruiterLabelsById, refreshTick])

  return {
    loading,
    error,
    columns,
    moveCard,
    refresh,
  }
}
