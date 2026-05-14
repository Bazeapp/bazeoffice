import * as React from "react"

import { flattenAttachmentLinks } from "@/components/shared-next/attachment-utils"
import { normalizeLookupColors, normalizeLookupOptions } from "@/features/lavoratori/lib/lookup-utils"
import {
  fetchFamiglie,
  fetchLavoratori,
  fetchLookupValues,
  fetchProcessiMatching,
  fetchRapportiLavorativi,
  fetchSelezioniLavoratori,
  updateRecord,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

type TableRow = Record<string, unknown>

export type LookupOption = {
  label: string
  value: string
}

export type ProvaCardData = {
  id: string
  rapporto: RapportoLavorativoRecord
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  title: string
  famigliaLabel: string
  lavoratoreLabel: string
  workerAvatarUrl: string | null
}

export type ProvaColumnData = {
  id: string
  label: string
  color: string | null
  cards: ProvaCardData[]
  totalCount: number
}

export type ColloquioCalendarEvent =
  | {
      id: string
      type: "colloquio"
      title: string
      start: string
      allDay: boolean
      selection: TableRow
      process: ProcessoMatchingRecord | null
      famiglia: FamigliaRecord | null
      lavoratore: LavoratoreRecord | null
      workerAvatarUrl: string | null
      status: string | null
      tone: "ok" | "warning"
    }
  | {
      id: string
      type: "prova"
      title: string
      start: string
      allDay: boolean
      card: ProvaCardData
      status: string | null
      tone: "ok" | "warning"
    }

export type CalendarDateRange = {
  start: string
  end: string
}

const TABLE_QUERY_MAX_LIMIT = 1000
const TRIAL_STATUS_DOMAIN = "rapporti_lavorativi.prova_stato_cs"
const RAPPORTO_FIELDS = [
  "id",
  "famiglia_id",
  "lavoratore_id",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
  "data_inizio_rapporto",
  "distribuzione_ore_settimana",
  "ore_a_settimana",
  "prova_data_checkin",
  "prova_feedback_famiglia",
  "prova_feedback_lavoratore",
  "prova_note_cs_famiglia",
  "prova_note_cs_lavoratore",
  "prova_priorita_famiglia",
  "prova_ramo_d2",
  "prova_stato_cs",
  "stato_assunzione",
  "stato_rapporto",
  "aggiornato_il",
] satisfies Array<keyof RapportoLavorativoRecord>
const FAMIGLIA_FIELDS = ["id", "nome", "cognome", "email", "telefono"] satisfies Array<keyof FamigliaRecord>
const LAVORATORE_FIELDS = ["id", "nome", "cognome", "email", "telefono", "foto"] satisfies Array<keyof LavoratoreRecord>
const PROCESSO_FIELDS = [
  "id",
  "famiglia_id",
  "stato_res",
  "tipo_incontro_famiglia_lavoratore",
  "indirizzo_prova_via",
  "indirizzo_prova_civico",
  "indirizzo_prova_comune",
] satisfies Array<keyof ProcessoMatchingRecord>
const SELEZIONE_FIELDS = [
  "id",
  "processo_matching_id",
  "lavoratore_id",
  "stato_selezione",
  "colloquio_effettuato",
  "data_ora_colloquio_famiglia_lavoratore",
]

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
}

function getUniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function toDateRangeValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultCalendarRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  return {
    start: toDateRangeValue(start),
    end: toDateRangeValue(end),
  }
}

function buildTextNotBlankFilter(field: string): QueryFilterGroup {
  return {
    kind: "group",
    id: `${field}-not-blank-root`,
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: `${field}-not-blank`,
        field,
        operator: "is_not",
        value: "",
      },
    ],
  }
}

function buildDateRangeFilter(field: string, start: string, end: string): QueryFilterGroup {
  return {
    kind: "group",
    id: `${field}-range-root`,
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: `${field}-range`,
        field,
        operator: "between",
        value: start,
        valueTo: end,
      },
    ],
  }
}

function buildInFilter(field: string, values: string[]): QueryFilterGroup {
  return {
    kind: "group",
    id: `${field}-in-root`,
    logic: "and",
    nodes: [{
      kind: "condition",
      id: `${field}-in`,
      field,
      operator: "in",
      value: values.join(","),
    }],
  }
}

function formatPersonName(row: FamigliaRecord | LavoratoreRecord | null | undefined) {
  if (!row) return null
  const first = toStringValue(row.nome)
  const last = toStringValue(row.cognome)
  return [first, last].filter(Boolean).join(" ").trim() || null
}

function getRapportoFamilyLabel(rapporto: RapportoLavorativoRecord, famiglia: FamigliaRecord | null) {
  return formatPersonName(famiglia) ?? toStringValue(rapporto.cognome_nome_datore_proper) ?? "Famiglia"
}

function getRapportoWorkerLabel(rapporto: RapportoLavorativoRecord, lavoratore: LavoratoreRecord | null) {
  return formatPersonName(lavoratore) ?? toStringValue(rapporto.nome_lavoratore_per_url) ?? "Lavoratore"
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

function isPastDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
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

async function fetchRowsByIds<TRecord>(
  ids: string[],
  fetcher: typeof fetchFamiglie | typeof fetchLavoratori | typeof fetchProcessiMatching,
  select: string[],
) {
  if (ids.length === 0) return new Map<string, TRecord>()

  const response = await fetcher({
    limit: Math.max(ids.length, 1),
    offset: 0,
    select,
    includeSchema: false,
    filters: buildInFilter("id", ids),
  })

  return new Map(
    response.rows
      .map((row) => [toStringValue((row as TableRow).id), row as TRecord] as const)
      .filter((entry): entry is readonly [string, TRecord] => Boolean(entry[0])),
  )
}

function buildProvaCard(
  rapporto: RapportoLavorativoRecord,
  famiglia: FamigliaRecord | null,
  lavoratore: LavoratoreRecord | null,
): ProvaCardData {
  const famigliaLabel = getRapportoFamilyLabel(rapporto, famiglia)
  const lavoratoreLabel = getRapportoWorkerLabel(rapporto, lavoratore)

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

export function useProveColloquiData(calendarRange?: CalendarDateRange) {
  const calendarRangeStart = calendarRange?.start
  const calendarRangeEnd = calendarRange?.end
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)
  const [provaColumns, setProvaColumns] = React.useState<ProvaColumnData[]>([])
  const [provaCards, setProvaCards] = React.useState<ProvaCardData[]>([])
  const [calendarEvents, setCalendarEvents] = React.useState<ColloquioCalendarEvent[]>([])
  const [lookupOptionsByDomain, setLookupOptionsByDomain] = React.useState<Map<string, LookupOption[]>>(new Map())
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(new Map())

  const reload = React.useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  const patchRapporto = React.useCallback(async (rapportoId: string, patch: Partial<RapportoLavorativoRecord>) => {
    const response = await updateRecord("rapporti_lavorativi", rapportoId, patch)
    const updated = response.row as RapportoLavorativoRecord

    setProvaCards((current) =>
      current.map((card) =>
        card.id === rapportoId ? { ...card, rapporto: { ...card.rapporto, ...updated } } : card,
      ),
    )
    setProvaColumns((current) =>
      current.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === rapportoId ? { ...card, rapporto: { ...card.rapporto, ...updated } } : card,
        ),
      })),
    )
    setCalendarEvents((current) =>
      current.map((event) =>
        event.type === "prova" && event.card.id === rapportoId
          ? { ...event, card: { ...event.card, rapporto: { ...event.card.rapporto, ...updated } } }
          : event,
      ),
    )

    if ("prova_stato_cs" in patch) {
      reload()
    }

    return updated
  }, [reload])

  React.useEffect(() => {
    let isActive = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const effectiveCalendarRange =
          calendarRangeStart && calendarRangeEnd
            ? { start: calendarRangeStart, end: calendarRangeEnd }
            : getDefaultCalendarRange()
        const [lookupResponse, rapportiResponse, selezioniResponse] = await Promise.all([
          fetchLookupValues(),
          fetchRapportiLavorativi({
            limit: TABLE_QUERY_MAX_LIMIT,
            offset: 0,
            select: RAPPORTO_FIELDS,
            includeSchema: false,
            orderBy: [
              { field: "data_inizio_rapporto", ascending: true },
              { field: "aggiornato_il", ascending: false },
            ],
            filters: buildTextNotBlankFilter("prova_stato_cs"),
          }),
          fetchSelezioniLavoratori({
            limit: TABLE_QUERY_MAX_LIMIT,
            offset: 0,
            select: SELEZIONE_FIELDS,
            includeSchema: false,
            orderBy: [{ field: "data_ora_colloquio_famiglia_lavoratore", ascending: true }],
            filters: buildDateRangeFilter(
              "data_ora_colloquio_famiglia_lavoratore",
              effectiveCalendarRange.start,
              effectiveCalendarRange.end,
            ),
          }),
        ])

        const optionsByDomain = normalizeLookupOptions(lookupResponse.rows)
        const colorsByDomain = normalizeLookupColors(lookupResponse.rows)
        const rapporti = rapportiResponse.rows
        const selections = selezioniResponse.rows

        const rapportoFamilyIds = getUniqueIds(rapporti.map((rapporto) => rapporto.famiglia_id))
        const rapportoWorkerIds = getUniqueIds(rapporti.map((rapporto) => rapporto.lavoratore_id))
        const processIds = getUniqueIds(selections.map((selection) => toStringValue(selection.processo_matching_id)))
        const selectionWorkerIds = getUniqueIds(selections.map((selection) => toStringValue(selection.lavoratore_id)))

        const [familiesById, workersById, processesById, selectionWorkersById] = await Promise.all([
          fetchRowsByIds<FamigliaRecord>(rapportoFamilyIds, fetchFamiglie, FAMIGLIA_FIELDS),
          fetchRowsByIds<LavoratoreRecord>(rapportoWorkerIds, fetchLavoratori, LAVORATORE_FIELDS),
          fetchRowsByIds<ProcessoMatchingRecord>(processIds, fetchProcessiMatching, PROCESSO_FIELDS),
          fetchRowsByIds<LavoratoreRecord>(selectionWorkerIds, fetchLavoratori, LAVORATORE_FIELDS),
        ])

        const processFamilyIds = getUniqueIds(
          Array.from(processesById.values()).map((process) => process.famiglia_id),
        )
        const processFamiliesById = await fetchRowsByIds<FamigliaRecord>(processFamilyIds, fetchFamiglie, FAMIGLIA_FIELDS)

        if (!isActive) return

        const cards = rapporti.map((rapporto) =>
          buildProvaCard(
            rapporto,
            rapporto.famiglia_id ? familiesById.get(rapporto.famiglia_id) ?? null : null,
            rapporto.lavoratore_id ? workersById.get(rapporto.lavoratore_id) ?? null : null,
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

        const colloquioEvents: ColloquioCalendarEvent[] = selections
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

        const provaEvents: ColloquioCalendarEvent[] = cards
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

        setLookupOptionsByDomain(optionsByDomain)
        setLookupColorsByDomain(colorsByDomain)
        setProvaCards(cards)
        setProvaColumns([...columns, ...dynamicColumns])
        setCalendarEvents([...colloquioEvents, ...provaEvents])
      } catch (caughtError) {
        if (!isActive) return
        console.error("Errore caricando prove e colloqui", caughtError)
        setError(caughtError instanceof Error ? caughtError.message : "Errore caricando prove e colloqui")
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [calendarRangeEnd, calendarRangeStart, reloadToken])

  return {
    loading,
    error,
    reload,
    provaColumns,
    provaCards,
    calendarEvents,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    patchRapporto,
    getInitials,
  }
}
