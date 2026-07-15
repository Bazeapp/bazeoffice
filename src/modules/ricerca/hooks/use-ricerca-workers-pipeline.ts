import * as React from "react"
import { toast } from "sonner"

import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"
import {
  asString,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  isBlacklistValue,
  normalizeDomesticRoleLabels,
  normalizeLookupColors,
  readArrayStrings,
  resolveLookupColor,
  toAvatarImage,
  toWorkerStatusFlags,
} from "@/modules/lavoratori/lib"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useMoveMutation } from "@/hooks/use-board-mutations"
import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import { fetchLavoratoriByIds } from "@/modules/lavoratori/queries"
import { fetchRicercaWorkerRelatedSelectionSummaries } from "../queries/fetch-ricerca-worker-related-selection-summaries"
import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const RICERCA_WORKERS_REALTIME_TABLES = [
  "selezioni_lavoratori",
  "processi_matching",
  "lavoratori",
]
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import type { LookupValueRecord } from "@/types"

import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
  RicercaWorkersPipelineState,
} from "../types"
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

type UseRicercaWorkersPipelineState = RicercaWorkersPipelineState

const WORKER_BATCH_SIZE = 250
const ADDRESS_BATCH_SIZE = 120

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
  provaFatta: "prova fatta",
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
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaFatta)
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

function getWorkerCertificationRank(worker: LavoratoreListItem) {
  if (worker.isCertificato) return 0
  if (worker.isIdoneo) return 1
  return 2
}

function getTravelTimeSortValue(worker: LavoratoreListItem) {
  const travelTime = worker.travelTimeMinutes
  return typeof travelTime === "number" && Number.isFinite(travelTime)
    ? travelTime
    : Number.MAX_SAFE_INTEGER
}

function sortWorkerSelectionCards(cards: RicercaWorkerSelectionCard[]) {
  return [...cards].sort((a, b) => {
    const certificationDelta =
      getWorkerCertificationRank(a.worker) - getWorkerCertificationRank(b.worker)
    if (certificationDelta !== 0) return certificationDelta

    const travelTimeDelta =
      getTravelTimeSortValue(a.worker) - getTravelTimeSortValue(b.worker)
    if (travelTimeDelta !== 0) return travelTimeDelta

    return a.worker.nomeCompleto.localeCompare(b.worker.nomeCompleto, "it")
  })
}

function sortWorkerSelectionColumns(columns: RicercaWorkerSelectionColumn[]) {
  return columns.map((column) => ({
    ...column,
    cards: sortWorkerSelectionCards(column.cards),
  }))
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

async function fetchRelatedSelectionSummariesByWorkerIds({
  workerIds,
  currentProcessId,
  lookupColorsByDomain,
}: {
  workerIds: string[]
  currentProcessId: string
  lookupColorsByDomain: Map<string, string>
}) {
  const summariesByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()

  const rpcRows = await fetchRicercaWorkerRelatedSelectionSummaries({
    workerIds,
    currentProcessId,
  })

  for (const row of rpcRows) {
    const workerId = toStringValue(row.worker_id)
    if (!workerId) continue

    const dots = row.dots.slice(0, 4).map((dot) => {
      const statoSelezione = toStringValue(dot.stato_selezione) ?? "-"
      const selectionColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "selezioni_lavoratori.stato_selezione",
        statoSelezione
      )

      return {
        key: `${dot.process_id}-${statoSelezione}`,
        colorClassName: getDotColorClassName(selectionColor),
        label: statoSelezione,
      }
    })

    summariesByWorkerId.set(workerId, {
      count: row.count,
      dots,
      details: [],
    })
  }

  return summariesByWorkerId
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
  const tipoLavori = readArrayStrings(worker.tipo_rapporto_lavorativo)
  const tipoLavoro = tipoLavori[0] ?? null
  const statusFlags = toWorkerStatusFlags(statoLavoratore)
  const workerAddress = resolveWorkerAddress(workerId, addressesByWorkerId)

  const anniEsperienzaColf = toNumberValue(worker.anni_esperienza_colf)
  const anniEsperienzaBabysitter = toNumberValue(worker.anni_esperienza_babysitter)
  const avatarImage = toAvatarImage(worker)

  return {
    id: workerId,
    nomeCompleto: `${nome} ${cognome}`.trim() || workerId,
    immagineUrl: avatarImage?.url ?? getDefaultWorkerAvatar(workerId),
    immagineType: avatarImage?.type ?? null,
    hasRealPhoto: avatarImage != null,
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
        row.entity_table === "selezioni_lavoratori" &&
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

  const result = await fetchSelezioniLookup({ processoIds: [processId] }).catch(
    (error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`selezioni_lookup: ${message}`)
    },
  )
  rows.push(...asRowArray(result.rows))

  return rows
}

async function fetchWorkersByIds(workerIds: string[]) {
  if (workerIds.length === 0) return []

  const workerRows: GenericRow[] = []

  for (let index = 0; index < workerIds.length; index += WORKER_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + WORKER_BATCH_SIZE)
    // FASE 4 BIS — pilota: rimpiazza il table-query "id IN (...)" con la RPC
    // dedicata lavoratori_by_ids. Stessa shape di ritorno ({ rows, ... }).
    const result = await fetchLavoratoriByIds(batch).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`lavoratori_by_ids(batch ${index}): ${message}`)
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
    const result = await fetchIndirizziByEntity("lavoratori", batch).catch(
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`indirizzi_by_entity(batch ${index}): ${message}`)
      },
    )

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
  processId: string
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
    fetchRelatedSelectionSummariesByWorkerIds({
      workerIds,
      currentProcessId: processId,
      lookupColorsByDomain,
    }),
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
          hasRealPhoto: false,
          travelTimeMinutes: toNumberValue(selection.travel_time_tra_cap),
          locationLabel: null,
          telefono: null,
          isBlacklisted: false,
          tipoRuolo: null,
          tipoRuoloColor: null,
          tipoLavori: [],
          tipoLavoriColors: {},
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
      id: "__colloqui_prove__",
      label: "Colloqui / Prove",
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

  return sortWorkerSelectionColumns(nextColumns)
}

export function useRicercaWorkersPipeline(
  processId: string
): UseRicercaWorkersPipelineState {
  const queryClient = useQueryClient()
  const boardQueryKey = React.useMemo(
    () => ["ricerca-workers-pipeline", processId] as const,
    [processId],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => fetchWorkersPipelineData(processId),
  })

  const columns = React.useMemo(() => data ?? [], [data])

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["ricerca-workers-pipeline"] })
  }, [queryClient])

  const refresh = React.useCallback(() => {
    void refetch()
  }, [refetch])

  useRealtimeBoardSync({
    tables: RICERCA_WORKERS_REALTIME_TABLES,
    reload: invalidateBoard,
    // FASE 4 BIS — revert F.1: niente reloadOpenDetail. Il bump del tick ad
    // ogni evento realtime causava il loop di "Caricamento dettaglio…" su DB
    // condiviso. L'auto-refresh granulare del dettaglio è un follow-up.
  })

  const moveMutation = useMoveMutation<
    { selectionId: string; targetStatusId: string; currentCard: RicercaWorkerSelectionCard | undefined },
    unknown,
    RicercaWorkerSelectionColumn[]
  >({
    queryKey: boardQueryKey,
    mutationFn: async ({ selectionId, targetStatusId, currentCard }) => {
      await updateRecord("selezioni_lavoratori", selectionId, {
        stato_selezione: targetStatusId,
      })
      await invokeWorkerAvailabilityForIds(
        getSelectionAvailabilityWorkerIds(
          currentCard
            ? {
                lavoratore_id: currentCard.worker.id,
                stato_selezione: currentCard.status,
              }
            : null,
          { stato_selezione: targetStatusId },
        ),
      )
    },
    applyOptimistic: (previous, { selectionId, targetStatusId }) => {
      if (!previous) return previous
      let movedCard: RicercaWorkerSelectionCard | null = null
      const nextColumns = previous.map((column) => {
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
      if (!movedCard) return previous
      return sortWorkerSelectionColumns(
        nextColumns.map((column) =>
          column.id === targetStatusId ||
          (column.id === "__candidati__" && isCandidatiStatus(targetStatusId)) ||
          (column.id === "__da_colloquiare__" && isDaColloquiareStatus(targetStatusId)) ||
          (column.id === "__archivio__" && isArchivioStatus(targetStatusId)) ||
          (column.id === "__colloqui_prove__" && isColloquiStatus(targetStatusId))
            ? { ...column, cards: [movedCard as RicercaWorkerSelectionCard, ...column.cards] }
            : column,
        ),
      )
    },
  })

  const moveCard = React.useCallback(
    async (selectionId: string, targetStatusId: string) => {
      const currentCard = columns
        .flatMap((column) => column.cards)
        .find((card) => card.id === selectionId)
      try {
        await moveMutation.mutateAsync({ selectionId, targetStatusId, currentCard })
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato selezione lavoratore"
        toast.error(message)
      }
    },
    [columns, moveMutation],
  )

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading,
    error,
    columns,
    moveCard,
    refresh,
  }
}
