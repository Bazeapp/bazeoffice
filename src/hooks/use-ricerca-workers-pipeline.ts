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
  toAvatarUrl,
} from "@/features/lavoratori/lib/base-utils"
import {
  isBlacklistValue,
  normalizeLookupColors,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils"
import {
  fetchIndirizzi,
  fetchLavoratori,
  fetchLookupValues,
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
}

const SELEZIONI_PAGE_SIZE = 500
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
  colloquioFatto: "colloquio fatto",
  provaConCliente: "prova con cliente",
  match: "match",
} as const

function isColloquiStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioSchedulato) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioFatto) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaConCliente) ||
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

function formatAddressLabel(address: GenericRow | undefined) {
  if (!address) return null

  const note = toStringValue(address.note)
  const citta = toStringValue(address.citta)
  const cap = toStringValue(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [shortNote, citta, cap]
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
    immagineUrl: toAvatarUrl(worker) ?? getDefaultWorkerAvatar(workerId),
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
    isDisponibile,
    isQualified: statusFlags.isQualified,
    isIdoneo: statusFlags.isIdoneo,
    isCertificato: statusFlags.isCertificato,
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
        "cap",
        "citta",
        "note",
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

  const [workerRows, addressesByWorkerId] = await Promise.all([
    fetchWorkersByIds(workerIds),
    fetchWorkerAddressesByIds(workerIds),
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
    const statusRaw = toStringValue(selection.stato_selezione)
    const workerId = toStringValue(selection.lavoratore_id)
    if (!id || !statusRaw || !workerId) continue

    const stage =
      stageMetadata.aliases.get(normalizeLookupToken(statusRaw)) ?? statusRaw
    const worker = workerById.get(workerId)

    const workerCard = worker
      ? buildWorkerListItem(worker, lookupColorsByDomain, addressesByWorkerId)
      : {
          id: workerId,
          nomeCompleto: workerId,
          immagineUrl: getDefaultWorkerAvatar(workerId),
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
          isDisponibile: null,
          isQualified: false,
          isIdoneo: false,
          isCertificato: false,
        }

    const card: RicercaWorkerSelectionCard = {
      id,
      status: stage,
      punteggio: toStringValue(selection.punteggio) ?? "-",
      worker: workerCard,
    }

    const knownColumn = cardsByStageId.get(stage)
    if (knownColumn) {
      knownColumn.push(card)
      continue
    }

    if (!unknownStages.has(stage)) {
      unknownStages.set(stage, {
        id: stage,
        label: stage,
        color: null,
        cards: [],
      })
    }
    unknownStages.get(stage)?.cards.push(card)
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
  processId: string
): UseRicercaWorkersPipelineState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<RicercaWorkerSelectionColumn[]>([])

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
        const data = await fetchWorkersPipelineData(processId)
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
  }, [processId])

  return {
    loading,
    error,
    columns,
    moveCard,
  }
}
