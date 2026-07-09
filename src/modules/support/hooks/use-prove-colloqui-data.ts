import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { flattenAttachmentLinks } from "@/components/shared-next/attachment-utils"
import { normalizeLookupColors, normalizeLookupOptions } from "@/modules/lavoratori/lib"
import { formatAssunzioneName, getRapportoProcessIds } from "@/modules/rapporti/lib"
import { type RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import { normalizeLookupToken, toStringValue } from "@/lib/value-utils"
import { fetchProveColloquiBoard } from "../queries/fetch-prove-colloqui-board"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const PROVE_COLLOQUI_REALTIME_TABLES = [
  "selezioni_lavoratori",
  "processi_matching",
]
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

import type {
  CalendarDateRange,
  ColloquioCalendarEvent,
  LookupOption,
  ProvaCardData,
  ProvaColumnData,
} from "../types"

const TRIAL_STATUS_DOMAIN = "rapporti_lavorativi.prova_stato_cs"

function normalizeToken(value: unknown) {
  return normalizeLookupToken(String(value ?? "")).replaceAll("_", " ")
}

function toDateRangeValue(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultCalendarRange() {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0))
  return {
    start: toDateRangeValue(start),
    end: toDateRangeValue(end),
  }
}

function formatPersonName(row: FamigliaRecord | LavoratoreRecord | null | undefined) {
  if (!row) return null
  const first = toStringValue(row.nome)
  const last = toStringValue(row.cognome)
  return [first, last].filter(Boolean).join(" ").trim() || null
}

function getRapportoFamilyLabel(
  rapporto: RapportoLavorativoRecord,
  famiglia: FamigliaRecord | null,
  assunzioneDatore?: RapportoAssunzioneNames["datore"],
) {
  return (
    formatAssunzioneName(assunzioneDatore) ??
    formatPersonName(famiglia) ??
    toStringValue(rapporto.cognome_nome_datore_proper) ??
    "Famiglia"
  )
}

function getRapportoWorkerLabel(
  rapporto: RapportoLavorativoRecord,
  lavoratore: LavoratoreRecord | null,
  assunzioneLavoratore?: RapportoAssunzioneNames["lavoratore"],
) {
  return (
    formatAssunzioneName(assunzioneLavoratore) ??
    formatPersonName(lavoratore) ??
    toStringValue(rapporto.nome_lavoratore_per_url) ??
    "Lavoratore"
  )
}

function getWorkerAvatarUrl(lavoratore: LavoratoreRecord | null) {
  if (!lavoratore) return null
  const permalink = toStringValue(lavoratore.permalink_foto)
  if (permalink) return permalink
  return flattenAttachmentLinks(lavoratore.foto, "Foto lavoratore")[0]?.url ?? null
}

function getInitials(value: string) {
  const parts = value.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

function hasDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function getCalendarDateKey(value: string | null | undefined) {
  if (!value) return null
  const directDate = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
  if (directDate) return directDate[1]
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : toDateRangeValue(date)
}

function getProvaDedupKeys(card: ProvaCardData) {
  const dateKey = getCalendarDateKey(card.rapporto.data_inizio_rapporto)
  const workerId = toStringValue(card.rapporto.lavoratore_id) ?? toStringValue(card.lavoratore?.id)
  if (!dateKey || !workerId) return []

  const keys = getRapportoProcessIds(card.rapporto).map(
    (processId) => `process:${processId}:worker:${workerId}:date:${dateKey}`,
  )
  const familyId = toStringValue(card.rapporto.famiglia_id) ?? toStringValue(card.famiglia?.id)
  if (familyId) {
    keys.push(`family:${familyId}:worker:${workerId}:date:${dateKey}`)
  }

  return keys
}

function getColloquioDedupKeys(event: Extract<ColloquioCalendarEvent, { type: "colloquio" }>) {
  const dateKey = getCalendarDateKey(event.start)
  const workerId = toStringValue(event.selection.lavoratore_id) ?? toStringValue(event.lavoratore?.id)
  if (!dateKey || !workerId) return []

  const keys: string[] = []
  const processId = toStringValue(event.selection.processo_matching_id) ?? toStringValue(event.process?.id)
  if (processId) {
    keys.push(`process:${processId}:worker:${workerId}:date:${dateKey}`)
  }
  const familyId = toStringValue(event.process?.famiglia_id) ?? toStringValue(event.famiglia?.id)
  if (familyId) {
    keys.push(`family:${familyId}:worker:${workerId}:date:${dateKey}`)
  }

  return keys
}

function isPastDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

function isNegativeStatus(value: string | null | undefined) {
  const token = normalizeToken(value)
  return (
    token.includes("no match") ||
    token.includes("negativ") ||
    token.includes("critic") ||
    token.includes("chius") ||
    token.includes("concluso") ||
    token.includes("annull") ||
    token.includes("non interessato") ||
    token.includes("out of target")
  )
}

function isOpenStatus(value: string | null | undefined) {
  const token = normalizeToken(value)
  return Boolean(token) && !isNegativeStatus(token)
}

function getLookupOptions(optionsByDomain: Map<string, LookupOption[]>, domain: string) {
  return optionsByDomain.get(domain) ?? []
}

function getLookupColorByValue(
  colorsByDomain: Map<string, string>,
  domain: string,
  value: string | null | undefined,
) {
  if (!value) return null
  return colorsByDomain.get(`${domain}:${normalizeToken(value)}`) ?? null
}

function buildProvaCard(
  rapporto: RapportoLavorativoRecord,
  famiglia: FamigliaRecord | null,
  lavoratore: LavoratoreRecord | null,
  assunzioneNames: RapportoAssunzioneNames | null = null,
): ProvaCardData {
  const famigliaLabel = getRapportoFamilyLabel(rapporto, famiglia, assunzioneNames?.datore)
  const lavoratoreLabel = getRapportoWorkerLabel(rapporto, lavoratore, assunzioneNames?.lavoratore)

  return {
    id: rapporto.id,
    rapporto,
    famiglia,
    lavoratore,
    title: `${famigliaLabel} — ${lavoratoreLabel}`,
    famigliaLabel,
    lavoratoreLabel,
    workerAvatarUrl: getWorkerAvatarUrl(lavoratore),
  }
}

type BoardData = {
  provaColumns: ProvaColumnData[]
  provaCards: ProvaCardData[]
  calendarEvents: ColloquioCalendarEvent[]
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
}

async function fetchProveColloquiData(
  calendarRangeStart?: string,
  calendarRangeEnd?: string,
): Promise<BoardData> {
  const effectiveCalendarRange =
    calendarRangeStart && calendarRangeEnd
      ? { start: calendarRangeStart, end: calendarRangeEnd }
      : getDefaultCalendarRange()
  const [lookupResponse, boardResponse] = await Promise.all([
    fetchLookupValues(),
    fetchProveColloquiBoard(effectiveCalendarRange.start, effectiveCalendarRange.end),
  ])

  const optionsByDomain = normalizeLookupOptions(lookupResponse.rows)
  const colorsByDomain = normalizeLookupColors(lookupResponse.rows)
  const rapporti = boardResponse.rapporti.map((entry) => entry.rapporto)
  const selections = boardResponse.selezioni.map((entry) => entry.selezione as Record<string, unknown>)

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto). In fase
  // di prova/colloquio l'assunzione di solito non esiste ancora → fallback.
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    rapporti.map((rapporto) => rapporto.id).filter((id): id is string => Boolean(id)),
  )

  const familiesById = new Map<string, FamigliaRecord>()
  const workersById = new Map<string, LavoratoreRecord>()
  for (const entry of boardResponse.rapporti) {
    if (entry.famiglia) familiesById.set(entry.famiglia.id, entry.famiglia)
    if (entry.lavoratore) workersById.set(entry.lavoratore.id, entry.lavoratore)
  }
  const processesById = new Map<string, ProcessoMatchingRecord>()
  const selectionWorkersById = new Map<string, LavoratoreRecord>()
  const processFamiliesById = new Map<string, FamigliaRecord>()
  for (const entry of boardResponse.selezioni) {
    if (entry.processo) processesById.set(entry.processo.id, entry.processo)
    if (entry.lavoratore) selectionWorkersById.set(entry.lavoratore.id, entry.lavoratore)
    if (entry.processoFamiglia) processFamiliesById.set(entry.processoFamiglia.id, entry.processoFamiglia)
  }

  const cards = rapporti.map((rapporto) =>
    buildProvaCard(
      rapporto,
      rapporto.famiglia_id ? familiesById.get(rapporto.famiglia_id) ?? null : null,
      rapporto.lavoratore_id ? workersById.get(rapporto.lavoratore_id) ?? null : null,
      assunzioneNamesByRapporto[rapporto.id] ?? null,
    ),
  )

  const statusOptions = getLookupOptions(optionsByDomain, TRIAL_STATUS_DOMAIN)
  const columns = statusOptions.map((status) => {
    const statusToken = normalizeToken(status.value || status.label)
    const columnCards = cards.filter((card) => normalizeToken(card.rapporto.prova_stato_cs) === statusToken)
    const color =
      colorsByDomain.get(`${TRIAL_STATUS_DOMAIN}:${normalizeToken(status.value)}`) ??
      colorsByDomain.get(`${TRIAL_STATUS_DOMAIN}:${normalizeToken(status.label)}`) ??
      null

    return {
      id: status.value,
      label: status.label,
      color,
      cards: columnCards,
      totalCount: columnCards.length,
    }
  })

  const knownStatusTokens = new Set(statusOptions.map((option) => normalizeToken(option.value || option.label)))
  const adHocStatuses = Array.from(
    new Set(
      cards
        .map((card) => card.rapporto.prova_stato_cs)
        .filter((status): status is string => Boolean(status && !knownStatusTokens.has(normalizeToken(status)))),
    ),
  )
  const dynamicColumns = adHocStatuses.map((status) => {
    const columnCards = cards.filter((card) => normalizeToken(card.rapporto.prova_stato_cs) === normalizeToken(status))
    return {
      id: status,
      label: status,
      color: getLookupColorByValue(colorsByDomain, TRIAL_STATUS_DOMAIN, status),
      cards: columnCards,
      totalCount: columnCards.length,
    }
  })

  const colloquioEvents: Array<Extract<ColloquioCalendarEvent, { type: "colloquio" }>> = selections
    .map((selection) => {
      const start = toStringValue(selection.data_ora_colloquio_famiglia_lavoratore)
      const processId = toStringValue(selection.processo_matching_id)
      const workerId = toStringValue(selection.lavoratore_id)
      const process = processId ? processesById.get(processId) ?? null : null
      const famiglia = process?.famiglia_id ? processFamiliesById.get(process.famiglia_id) ?? null : null
      const lavoratore = workerId ? selectionWorkersById.get(workerId) ?? null : null
      if (!start) return null

      const familyLabel = formatPersonName(famiglia) ?? "Famiglia"
      const workerLabel = formatPersonName(lavoratore) ?? "Lavoratore"
      const status = toStringValue(selection.stato_selezione) ?? process?.stato_res ?? null
      const tone: "ok" | "warning" =
        isNegativeStatus(status) || (isPastDate(start) && !isOpenStatus(status))
          ? "warning"
          : "ok"

      return {
        id: `colloquio-${toStringValue(selection.id) ?? start}`,
        type: "colloquio" as const,
        title: `${familyLabel} · ${workerLabel}`,
        start,
        allDay: hasDateOnly(start),
        selection,
        process,
        famiglia,
        lavoratore,
        workerAvatarUrl: getWorkerAvatarUrl(lavoratore),
        status,
        tone,
      }
    })
    .filter((event): event is Extract<ColloquioCalendarEvent, { type: "colloquio" }> => event !== null)

  const provaEvents: Array<Extract<ColloquioCalendarEvent, { type: "prova" }>> = cards
    .filter((card) => Boolean(card.rapporto.data_inizio_rapporto))
    .map((card) => {
      const start = card.rapporto.data_inizio_rapporto ?? ""
      const status = card.rapporto.prova_stato_cs
      return {
        id: `prova-${card.id}`,
        type: "prova" as const,
        title: card.title,
        start,
        allDay: true,
        card,
        status,
        tone: isNegativeStatus(status) || (isPastDate(start) && !isOpenStatus(status)) ? "warning" : "ok",
      }
    })
  const provaDedupKeys = new Set(provaEvents.flatMap((event) => getProvaDedupKeys(event.card)))
  const dedupedColloquioEvents = colloquioEvents.filter((event) => {
    const keys = getColloquioDedupKeys(event)
    return !keys.some((key) => provaDedupKeys.has(key))
  })

  return {
    provaColumns: [...columns, ...dynamicColumns],
    provaCards: cards,
    calendarEvents: [...dedupedColloquioEvents, ...provaEvents],
    lookupOptionsByDomain: optionsByDomain,
    lookupColorsByDomain: colorsByDomain,
  }
}

export function useProveColloquiData(calendarRange?: CalendarDateRange) {
  const calendarRangeStart = calendarRange?.start
  const calendarRangeEnd = calendarRange?.end

  const boardQueryKey = React.useMemo(
    () => ["prove-colloqui-board", calendarRangeStart ?? "", calendarRangeEnd ?? ""] as const,
    [calendarRangeStart, calendarRangeEnd],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () => fetchProveColloquiData(calendarRangeStart, calendarRangeEnd),
  })

  const provaColumns = data?.provaColumns ?? []
  const provaCards = data?.provaCards ?? []
  const calendarEvents = data?.calendarEvents ?? []
  const lookupOptionsByDomain = data?.lookupOptionsByDomain ?? new Map()
  const lookupColorsByDomain = data?.lookupColorsByDomain ?? new Map()

  const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardData>(boardQueryKey)
  const reload = invalidateBoard

  useRealtimeBoardSync({
    tables: PROVE_COLLOQUI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const patchRapporto = React.useCallback(async (rapportoId: string, patch: Partial<RapportoLavorativoRecord>) => {
    const response = await updateRecord("rapporti_lavorativi", rapportoId, patch)
    const updated = response.row as RapportoLavorativoRecord

    setBoardData((previous) => {
      if (!previous) return previous
      return {
        ...previous,
        provaCards: previous.provaCards.map((card) =>
          card.id === rapportoId ? { ...card, rapporto: { ...card.rapporto, ...updated } } : card,
        ),
        provaColumns: previous.provaColumns.map((column) => ({
          ...column,
          cards: column.cards.map((card) =>
            card.id === rapportoId ? { ...card, rapporto: { ...card.rapporto, ...updated } } : card,
          ),
        })),
        calendarEvents: previous.calendarEvents.map((event) =>
          event.type === "prova" && event.card.id === rapportoId
            ? { ...event, card: { ...event.card, rapporto: { ...event.card.rapporto, ...updated } } }
            : event,
        ),
      }
    })

    if ("prova_stato_cs" in patch) {
      reload()
    }

    return updated
  }, [setBoardData, reload])

  const patchProcess = React.useCallback(async (processId: string, patch: Partial<ProcessoMatchingRecord>) => {
    const response = await updateRecord("processi_matching", processId, patch)
    const updated = response.row as ProcessoMatchingRecord

    setBoardData((previous) => {
      if (!previous) return previous
      return {
        ...previous,
        calendarEvents: previous.calendarEvents.map((event) =>
          event.type === "colloquio" && event.process?.id === processId
            ? { ...event, process: { ...event.process, ...updated } }
            : event,
        ),
      }
    })

    return updated
  }, [setBoardData])

  const error =
    queryError instanceof Error ? queryError.message : null

  return {
    loading: isLoading,
    error,
    reload,
    provaColumns,
    provaCards,
    calendarEvents,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    patchRapporto,
    patchProcess,
    getInitials,
  }
}
