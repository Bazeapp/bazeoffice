import * as React from "react"

import {
  createRecord,
  fetchChiusureContratti,
  fetchContributiInps,
  fetchFamiglie,
  fetchLavoratori,
  fetchLookupValues,
  fetchMesiCalendario,
  fetchMesiLavorati,
  fetchPagamenti,
  fetchProcessiMatching,
  fetchPresenzeMensili,
  fetchRapportiLavorativi,
  fetchTickets,
  fetchVariazioniContrattuali,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import { normalizeLookupColors } from "@/features/lavoratori/lib/lookup-utils"
import { formatPersonName } from "@/features/rapporti/rapporti-labels"
import { resolveRapportoStatus } from "@/features/rapporti/rapporti-status"
import type {
  SupportTicketMetadata,
  SupportTicketTag,
  SupportTicketType,
  SupportTicketUrgency,
} from "@/components/support/support-ticket-config"
import type {
  ChiusuraContrattoRecord,
  ContributoInpsRecord,
  FamigliaRecord,
  LavoratoreRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  TicketRecord,
  VariazioneContrattualeRecord,
} from "@/types"

type CreateRapportoTicketInput = {
  tipo: SupportTicketType
  rapportoId: string
  tag: SupportTicketTag
  urgenza: SupportTicketUrgency
  causale: string
  note: string
}

type PersonNameRecord = Pick<FamigliaRecord, "id" | "nome" | "cognome">

const PAGE_SIZE = 50
const TABLE_QUERY_MAX_LIMIT = 500
const RELATED_IDS_BATCH_SIZE = 100
const TABLE_QUERY_RETRY_DELAYS_MS = [1000, 3000, 5000] as const
const RAPPORTO_STATUS_SORT_ORDER: RapportoStatusFilter[] = [
  "In attivazione",
  "Attivo",
  "Terminato",
  "Sconosciuto",
  "Errore",
]
const RAPPORTO_STATUS_WEIGHT = new Map<string, number>(
  RAPPORTO_STATUS_SORT_ORDER.map((status, index) => [status, index]),
)
const ACTIVATION_HIRING_STATUSES = [
  "Avviare pratica",
  "Inviata richiesta dati",
  "In attesa di dati famiglia",
  "In attesa di dati lavoratore",
  "Dati pronti per assunzione",
]
const ACTIVE_OR_TERMINATED_HIRING_STATUSES = [
  "Assunzione fatta",
  "Documenti assunzione inviati",
  "Contratto firmato",
]
const KNOWN_HIRING_STATUSES = [
  ...ACTIVATION_HIRING_STATUSES,
  ...ACTIVE_OR_TERMINATED_HIRING_STATUSES,
  "Non assume con Baze",
]

export type RapportoStatusFilter =
  | "all"
  | "In attivazione"
  | "Attivo"
  | "Terminato"
  | "Sconosciuto"
  | "Errore"

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isTransientTableQueryError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /503|temporarily unavailable|SUPABASE_EDGE_RUNTIME_ERROR|edge function/i.test(message)
}

function getRapportiLoadErrorMessage(error: unknown) {
  if (isTransientTableQueryError(error)) {
    return "Impossibile caricare i rapporti lavorativi. Riprova tra qualche secondo."
  }

  return "Errore nel caricamento rapporti lavorativi. Riprova tra qualche secondo."
}

function getStatusWeight(value: string | null | undefined) {
  return RAPPORTO_STATUS_WEIGHT.get(value ?? "") ?? RAPPORTO_STATUS_SORT_ORDER.length
}

function getTimeValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

function sortRapportiByOperationalStatus(items: RapportoLavorativoRecord[]) {
  return [...items].sort((left, right) => {
    const statusDelta =
      getStatusWeight(resolveRapportoStatus(left)) -
      getStatusWeight(resolveRapportoStatus(right))
    if (statusDelta !== 0) return statusDelta

    const dateDelta =
      getTimeValue(right.data_inizio_rapporto) -
      getTimeValue(left.data_inizio_rapporto)
    if (dateDelta !== 0) return dateDelta

    const familyDelta = String(left.cognome_nome_datore_proper ?? "").localeCompare(
      String(right.cognome_nome_datore_proper ?? ""),
      "it",
    )
    if (familyDelta !== 0) return familyDelta

    return String(left.id).localeCompare(String(right.id))
  })
}

function buildSearchQuery(value: string) {
  const normalizedValue = value.trim()
  if (!normalizedValue) return undefined

  const tokens = normalizedValue
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)

  if (tokens.length === 0) return undefined

  // Use the longest token on the server query to avoid missing inverted names
  // like "Jacquet Coline" when the stored value is "Coline Jacquet".
  return tokens.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  )
}

async function resolveRelatedSearchIds(value: string): Promise<{
  famigliaIds: string[]
  lavoratoreIds: string[]
}> {
  const search = buildSearchQuery(value)
  if (!search) return { famigliaIds: [], lavoratoreIds: [] }

  const [famiglieResponse, lavoratoriResponse] = await Promise.all([
    fetchFamiglie({
      limit: 100,
      offset: 0,
      search,
      searchFields: ["nome", "cognome", "email", "telefono"],
      includeSchema: false,
    }),
    fetchLavoratori({
      limit: 100,
      offset: 0,
      search,
      searchFields: ["nome", "cognome", "email", "telefono"],
      includeSchema: false,
    }),
  ])

  return {
    famigliaIds: famiglieResponse.rows
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string" && Boolean(id)),
    lavoratoreIds: lavoratoriResponse.rows
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string" && Boolean(id)),
  }
}

function buildRapportiSearchFilter(
  value: string,
  famigliaIds: string[],
  lavoratoreIds: string[],
): QueryFilterGroup | undefined {
  const search = buildSearchQuery(value)
  if (!search) return undefined

  const nodes: QueryFilterGroup["nodes"] = [
    {
      kind: "condition",
      id: "rapporti-search-family-label",
      field: "cognome_nome_datore_proper",
      operator: "has",
      value: search,
    },
    {
      kind: "condition",
      id: "rapporti-search-worker-label",
      field: "nome_lavoratore_per_url",
      operator: "has",
      value: search,
    },
    {
      kind: "condition",
      id: "rapporti-search-external-id",
      field: "id_rapporto",
      operator: "has",
      value: search,
    },
  ]

  if (famigliaIds.length > 0) {
    nodes.push({
      kind: "condition",
      id: "rapporti-search-family-id",
      field: "famiglia_id",
      operator: "in",
      value: famigliaIds.join(","),
    })
  }

  if (lavoratoreIds.length > 0) {
    nodes.push({
      kind: "condition",
      id: "rapporti-search-worker-id",
      field: "lavoratore_id",
      operator: "in",
      value: lavoratoreIds.join(","),
    })
  }

  return {
    kind: "group",
    id: "rapporti-search-root",
    logic: "or",
    nodes,
  }
}

function buildEqualsFilter(field: string, value: string): QueryFilterGroup {
  return {
    kind: "group",
    id: `${field}-eq-root`,
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: `${field}-eq-condition`,
        field,
        operator: "is",
        value,
      },
    ],
  }
}

function buildIdsFilter(ids: string[]): QueryFilterGroup | undefined {
  const normalizedIds = Array.from(new Set(ids.filter(Boolean)))
  if (normalizedIds.length === 0) return undefined

  return {
    kind: "group",
    id: "ids-root",
    logic: "or",
    nodes: normalizedIds.map((id, index) => ({
      kind: "condition" as const,
      id: `id-${index}`,
      field: "id",
      operator: "is" as const,
      value: id,
    })),
  }
}

function buildAnyOfFilter(field: string, values: string[]): QueryFilterGroup | undefined {
  const normalizedValues = Array.from(new Set(values.filter(Boolean)))
  if (normalizedValues.length === 0) return undefined

  return {
    kind: "group",
    id: `${field}-any-of-root`,
    logic: "or",
    nodes: normalizedValues.map((value, index) => ({
      kind: "condition",
      id: `${field}-any-of-${index}`,
      field,
      operator: "is",
      value,
    })),
  }
}

function buildInFilter(field: string, values: string[]): QueryFilterGroup | undefined {
  const normalizedValues = Array.from(new Set(values.filter(Boolean)))
  if (normalizedValues.length === 0) return undefined

  return {
    kind: "group",
    id: `${field}-in-root`,
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: `${field}-in-condition`,
        field,
        operator: "in",
        value: normalizedValues.join(","),
      },
    ],
  }
}

function getUniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

async function fetchFamiglieByIds(ids: string[]) {
  const rows: PersonNameRecord[] = []

  for (let index = 0; index < ids.length; index += RELATED_IDS_BATCH_SIZE) {
    const batch = ids.slice(index, index + RELATED_IDS_BATCH_SIZE)
    const response = await fetchFamiglie({
      limit: batch.length,
      offset: 0,
      select: ["id", "nome", "cognome"],
      filters: buildInFilter("id", batch),
    })
    rows.push(...response.rows as PersonNameRecord[])
  }

  return new Map(rows.map((row) => [row.id, row]))
}

async function fetchLavoratoriByIds(ids: string[]) {
  const rows: PersonNameRecord[] = []

  for (let index = 0; index < ids.length; index += RELATED_IDS_BATCH_SIZE) {
    const batch = ids.slice(index, index + RELATED_IDS_BATCH_SIZE)
    const response = await fetchLavoratori({
      limit: batch.length,
      offset: 0,
      select: ["id", "nome", "cognome"],
      filters: buildInFilter("id", batch),
    })
    rows.push(...response.rows as PersonNameRecord[])
  }

  return new Map(rows.map((row) => [row.id, row]))
}

async function fetchChiusureEndDatesByIds(ids: string[]) {
  const rows: ChiusuraContrattoRecord[] = []

  for (let index = 0; index < ids.length; index += RELATED_IDS_BATCH_SIZE) {
    const batch = ids.slice(index, index + RELATED_IDS_BATCH_SIZE)
    const response = await fetchChiusureContratti({
      limit: batch.length,
      offset: 0,
      select: ["id", "data_fine_rapporto"],
      filters: buildInFilter("id", batch),
    })
    rows.push(...response.rows)
  }

  return new Map(rows.map((row) => [row.id, row.data_fine_rapporto]))
}

function hydrateRapportoLabels(
  rapporto: RapportoLavorativoRecord,
  familiesById: Map<string, PersonNameRecord>,
  workersById: Map<string, PersonNameRecord>,
) {
  const famiglia = rapporto.famiglia_id ? familiesById.get(rapporto.famiglia_id) ?? null : null
  const lavoratore = rapporto.lavoratore_id ? workersById.get(rapporto.lavoratore_id) ?? null : null

  return {
    ...rapporto,
    cognome_nome_datore_proper:
      formatPersonName(famiglia) ?? rapporto.cognome_nome_datore_proper,
    nome_lavoratore_per_url:
      formatPersonName(lavoratore) ?? rapporto.nome_lavoratore_per_url,
  }
}

function combineFilterGroups(
  ...groups: Array<QueryFilterGroup | undefined>
): QueryFilterGroup | undefined {
  const nodes = groups.filter((group): group is QueryFilterGroup => Boolean(group))
  if (nodes.length === 0) return undefined
  if (nodes.length === 1) return nodes[0]

  return {
    kind: "group",
    id: "rapporti-combined-filter-root",
    logic: "and",
    nodes,
  }
}

function buildHiringStatusFilterForRapportoStatus(
  status: RapportoStatusFilter,
): QueryFilterGroup | undefined {
  if (status === "all") return undefined

  if (status === "In attivazione") {
    return {
      kind: "group",
      id: "rapporti-status-activation-root",
      logic: "or",
      nodes: ACTIVATION_HIRING_STATUSES.map((value, index) => ({
        kind: "condition",
        id: `status-activation-${index}`,
        field: "stato_assunzione",
        operator: "is",
        value,
      })),
    }
  }

  if (status === "Attivo" || status === "Terminato") {
    return {
      kind: "group",
      id: "rapporti-status-active-or-ended-root",
      logic: "or",
      nodes: ACTIVE_OR_TERMINATED_HIRING_STATUSES.map((value, index) => ({
        kind: "condition",
        id: `status-active-or-ended-${index}`,
        field: "stato_assunzione",
        operator: "is",
        value,
      })),
    }
  }

  if (status === "Sconosciuto") {
    return buildEqualsFilter("stato_assunzione", "Non assume con Baze")
  }

  return {
    kind: "group",
    id: "rapporti-status-error-root",
    logic: "and",
    nodes: KNOWN_HIRING_STATUSES.map((value, index) => ({
      kind: "condition",
      id: `status-error-${index}`,
      field: "stato_assunzione",
      operator: "is_not",
      value,
    })),
  }
}

function buildNamePartsFilter(
  label: string | null | undefined,
  mode: "family" | "worker"
): QueryFilterGroup | undefined {
  const normalizedLabel = label?.trim().replace(/\s+/g, " ")
  if (!normalizedLabel) return undefined

  const [firstPart, ...restParts] = normalizedLabel.split(" ")
  const restPart = restParts.join(" ").trim()
  const nodes: QueryFilterGroup["nodes"] = []

  if (firstPart && restPart) {
    nodes.push(
      {
        kind: "group",
        id: `${mode}-surname-first`,
        logic: "and",
        nodes: [
          { kind: "condition", id: `${mode}-surname-first-cognome`, field: "cognome", operator: "is", value: firstPart },
          { kind: "condition", id: `${mode}-surname-first-nome`, field: "nome", operator: "is", value: restPart },
        ],
      },
      {
        kind: "group",
        id: `${mode}-name-first`,
        logic: "and",
        nodes: [
          { kind: "condition", id: `${mode}-name-first-nome`, field: "nome", operator: "is", value: firstPart },
          { kind: "condition", id: `${mode}-name-first-cognome`, field: "cognome", operator: "is", value: restPart },
        ],
      }
    )
  }

  if (mode === "worker") {
    nodes.push({
      kind: "condition",
      id: "worker-full-name-as-nome",
      field: "nome",
      operator: "is",
      value: normalizedLabel,
    })
  }

  if (nodes.length === 0) return undefined

  return {
    kind: "group",
    id: `${mode}-name-fallback-root`,
    logic: "or",
    nodes,
  }
}

async function fetchUniqueFamigliaByLabel(label: string | null | undefined) {
  const filters = buildNamePartsFilter(label, "family")
  if (!filters) return null

  const response = await fetchFamiglie({ limit: 2, offset: 0, filters })
  return response.rows.length === 1 ? (response.rows[0] as FamigliaRecord) : null
}

async function fetchUniqueLavoratoreByLabel(label: string | null | undefined) {
  const filters = buildNamePartsFilter(label, "worker")
  if (!filters) return null

  const response = await fetchLavoratori({ limit: 2, offset: 0, filters })
  return response.rows.length === 1 ? (response.rows[0] as LavoratoreRecord) : null
}

export function useRapportiLavorativiData() {
  const [rapporti, setRapporti] = React.useState<RapportoLavorativoRecord[]>([])
  const [rapportiTotal, setRapportiTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [searchValue, setSearchValue] = React.useState("")
  const [rapportoStatusFilter, setRapportoStatusFilter] =
    React.useState<RapportoStatusFilter>("all")
  const [selectedRapportoId, setSelectedRapportoId] = React.useState<string | null>(null)
  const [selectedFamiglia, setSelectedFamiglia] = React.useState<FamigliaRecord | null>(null)
  const [selectedLavoratore, setSelectedLavoratore] = React.useState<LavoratoreRecord | null>(null)
  const [selectedProcessi, setSelectedProcessi] = React.useState<ProcessoMatchingRecord[]>([])
  const [selectedContributi, setSelectedContributi] = React.useState<ContributoInpsRecord[]>([])
  const [selectedMesi, setSelectedMesi] = React.useState<MeseLavoratoRecord[]>([])
  const [selectedMesiCalendario, setSelectedMesiCalendario] = React.useState<MeseCalendarioRecord[]>([])
  const [selectedPagamenti, setSelectedPagamenti] = React.useState<PagamentoRecord[]>([])
  const [selectedPresenze, setSelectedPresenze] = React.useState<PresenzaMensileRecord[]>([])
  const [selectedVariazioni, setSelectedVariazioni] = React.useState<VariazioneContrattualeRecord[]>([])
  const [selectedChiusure, setSelectedChiusure] = React.useState<ChiusuraContrattoRecord[]>([])
  const [selectedTickets, setSelectedTickets] = React.useState<TicketRecord[]>([])
  const [loadingRelated, setLoadingRelated] = React.useState(false)
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const serverSearchQuery = React.useMemo(() => buildSearchQuery(searchValue), [searchValue])

  const retryRapporti = React.useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  const createTicketForSelectedRapporto = React.useCallback(
    async (input: CreateRapportoTicketInput) => {
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
        stato: "aperto",
        tipo: input.tipo,
        urgenza: input.urgenza,
        metadati_migrazione: metadata,
      })

      setSelectedTickets((current) => [response.row as TicketRecord, ...current])
    },
    []
  )

  React.useEffect(() => {
    setPageIndex(0)
  }, [rapportoStatusFilter, serverSearchQuery])

  React.useEffect(() => {
    let isActive = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const relatedSearchIds = serverSearchQuery
          ? await resolveRelatedSearchIds(searchValue)
          : { famigliaIds: [] as string[], lavoratoreIds: [] as string[] }
        const searchFilter = buildRapportiSearchFilter(
          searchValue,
          relatedSearchIds.famigliaIds,
          relatedSearchIds.lavoratoreIds,
        )
        const statusPrefilter =
          buildHiringStatusFilterForRapportoStatus(rapportoStatusFilter)
        const filters = combineFilterGroups(searchFilter, statusPrefilter)
        const allRows: RapportoLavorativoRecord[] = []
        let totalRows = 0

        for (let offset = 0; ; offset += TABLE_QUERY_MAX_LIMIT) {
          let response: Awaited<ReturnType<typeof fetchRapportiLavorativi>> | null = null

          for (let attempt = 0; attempt <= TABLE_QUERY_RETRY_DELAYS_MS.length; attempt += 1) {
            try {
              response = await fetchRapportiLavorativi({
                limit: TABLE_QUERY_MAX_LIMIT,
                offset,
                orderBy: [
                  { field: "data_inizio_rapporto", ascending: false },
                  { field: "ultimo_aggiornamento", ascending: false },
                  { field: "aggiornato_il", ascending: false },
                ],
                filters,
              })
              break
            } catch (caughtError) {
              const shouldRetry =
                isTransientTableQueryError(caughtError) &&
                attempt < TABLE_QUERY_RETRY_DELAYS_MS.length

              if (!shouldRetry) throw caughtError

              await wait(TABLE_QUERY_RETRY_DELAYS_MS[attempt])
              if (!isActive) return
            }
          }

          if (!response) return
          allRows.push(...response.rows)
          totalRows = response.total

          if (allRows.length >= totalRows || response.rows.length < TABLE_QUERY_MAX_LIMIT) break
        }

        if (!isActive) return

        const familyIds = getUniqueIds(allRows.map((rapporto) => rapporto.famiglia_id))
        const workerIds = getUniqueIds(allRows.map((rapporto) => rapporto.lavoratore_id))
        const chiusuraIds = getUniqueIds(allRows.map((rapporto) => rapporto.fine_rapporto_lavorativo_id))
        const [familiesById, workersById, chiusureById] = await Promise.all([
          fetchFamiglieByIds(familyIds),
          fetchLavoratoriByIds(workerIds),
          fetchChiusureEndDatesByIds(chiusuraIds),
        ])

        if (!isActive) return

        const rapportiWithFineDate = allRows.map((rapporto) => {
          const hydratedRapporto = hydrateRapportoLabels(rapporto, familiesById, workersById)

          return {
            ...hydratedRapporto,
            data_fine_rapporto: hydratedRapporto.fine_rapporto_lavorativo_id
              ? chiusureById.get(hydratedRapporto.fine_rapporto_lavorativo_id) ?? null
              : null,
          }
        })
        const resolvedRapporti =
          rapportoStatusFilter === "all"
            ? rapportiWithFineDate
            : rapportiWithFineDate.filter(
                (rapporto) => resolveRapportoStatus(rapporto) === rapportoStatusFilter,
              )
        const sortedRapporti = sortRapportiByOperationalStatus(resolvedRapporti)
        const visibleRapporti = sortedRapporti.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)

        setRapporti(visibleRapporti)
        setRapportiTotal(sortedRapporti.length)
        setSelectedRapportoId((previous) => previous ?? visibleRapporti[0]?.id ?? null)
      } catch (loadError) {
        if (!isActive) return
        console.error("Errore caricando rapporti lavorativi", loadError)
        setError(getRapportiLoadErrorMessage(loadError))
        setRapporti([])
        setRapportiTotal(0)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    void load()

    return () => {
      isActive = false
    }
  }, [pageIndex, rapportoStatusFilter, reloadToken, searchValue, serverSearchQuery])

  React.useEffect(() => {
    let isActive = true

    async function loadLookupColors() {
      try {
        const response = await fetchLookupValues()
        if (!isActive) return
        setLookupColorsByDomain(normalizeLookupColors(response.rows))
      } catch {
        if (!isActive) return
        setLookupColorsByDomain(new Map())
      }
    }

    void loadLookupColors()

    return () => {
      isActive = false
    }
  }, [])

  const selectedRapporto = React.useMemo(
    () => rapporti.find((rapporto) => rapporto.id === selectedRapportoId) ?? null,
    [rapporti, selectedRapportoId]
  )

  React.useEffect(() => {
    setSelectedRapportoId((previous) => {
      if (previous && rapporti.some((rapporto) => rapporto.id === previous)) {
        return previous
      }
      return rapporti[0]?.id ?? null
    })
  }, [rapporti])

  React.useEffect(() => {
    let isActive = true

    async function loadRelatedRecords() {
      if (!selectedRapporto) {
        setLoadingRelated(false)
        setSelectedFamiglia(null)
        setSelectedLavoratore(null)
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedPresenze([])
        setSelectedVariazioni([])
        setSelectedChiusure([])
        setSelectedTickets([])
        return
      }

      setLoadingRelated(true)
      setSelectedFamiglia(null)
      setSelectedLavoratore(null)
      setSelectedProcessi([])
      setSelectedContributi([])
      setSelectedMesi([])
      setSelectedMesiCalendario([])
      setSelectedPagamenti([])
      setSelectedPresenze([])
      setSelectedVariazioni([])
      setSelectedChiusure([])
      setSelectedTickets([])

      try {
        const processiFilter = buildIdsFilter(selectedRapporto.processo_res ?? [])
        const [famigliaResponse, lavoratoreResponse, processiResponse, contributiResponse, mesiResponse, variazioniResponse, chiusuraResponse, ticketsResponse] = await Promise.all([
          selectedRapporto.famiglia_id
            ? fetchFamiglie({
                limit: 1,
                offset: 0,
                filters: buildEqualsFilter("id", selectedRapporto.famiglia_id),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          selectedRapporto.lavoratore_id
            ? fetchLavoratori({
                limit: 1,
                offset: 0,
                filters: buildEqualsFilter("id", selectedRapporto.lavoratore_id),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          processiFilter
            ? fetchProcessiMatching({
                limit: 10,
                offset: 0,
                filters: processiFilter,
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          fetchContributiInps({
            limit: 200,
            offset: 0,
            orderBy: [{ field: "data_ora_creazione", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", selectedRapporto.id),
          }),
          fetchMesiLavorati({
            limit: 500,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", selectedRapporto.id),
          }),
          fetchVariazioniContrattuali({
            limit: 200,
            offset: 0,
            orderBy: [{ field: "data_variazione", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", selectedRapporto.id),
          }),
          selectedRapporto.fine_rapporto_lavorativo_id
            ? fetchChiusureContratti({
                limit: 1,
                offset: 0,
                orderBy: [{ field: "data_fine_rapporto", ascending: false }],
                filters: buildEqualsFilter("id", selectedRapporto.fine_rapporto_lavorativo_id),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          fetchTickets({
            limit: 100,
            offset: 0,
            orderBy: [{ field: "data_apertura", ascending: false }],
            filters: buildEqualsFilter("rapporto_id", selectedRapporto.id),
          }),
        ])

        const meseIds = mesiResponse.rows
          .map((mese) => mese.mese_id)
          .filter((meseId): meseId is string => Boolean(meseId))
        const ticketIds = mesiResponse.rows
          .map((mese) => mese.ticket_id)
          .filter((ticketId): ticketId is string => Boolean(ticketId))
        const presenzaIds = mesiResponse.rows.flatMap((mese) =>
          [mese.presenze_id, mese.presenze_regolare_id].filter(
            (presenzaId): presenzaId is string => Boolean(presenzaId)
          )
        )

        const [mesiCalendarioResponse, pagamentiResponse, presenzeResponse] = await Promise.all([
          meseIds.length > 0
            ? fetchMesiCalendario({
                limit: 200,
                offset: 0,
                orderBy: [{ field: "data_inizio", ascending: false }],
                filters: buildAnyOfFilter("id", meseIds),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          ticketIds.length > 0
            ? fetchPagamenti({
                limit: 500,
                offset: 0,
                orderBy: [{ field: "data_ora_di_pagamento", ascending: false }],
                filters: buildAnyOfFilter("ticket_id", ticketIds),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          presenzaIds.length > 0
            ? fetchPresenzeMensili({
                limit: 500,
                offset: 0,
                orderBy: [{ field: "creato_il", ascending: false }],
                filters: buildAnyOfFilter("id", presenzaIds),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ])

        const processiRows = processiResponse.rows as ProcessoMatchingRecord[]
        let nextFamiglia = (famigliaResponse.rows[0] as FamigliaRecord | undefined) ?? null
        let nextLavoratore = (lavoratoreResponse.rows[0] as LavoratoreRecord | undefined) ?? null

        if (!nextFamiglia) {
          const fallbackFamigliaIds = Array.from(
            new Set(
              processiRows
                .map((processo) => processo.famiglia_id)
                .filter((famigliaId): famigliaId is string => Boolean(famigliaId))
            )
          )

          if (fallbackFamigliaIds.length > 0) {
            const fallbackFamiglieResponse = await fetchFamiglie({
              limit: 1,
              offset: 0,
              filters: buildAnyOfFilter("id", fallbackFamigliaIds),
            })
            nextFamiglia = (fallbackFamiglieResponse.rows[0] as FamigliaRecord | undefined) ?? null
          }
        }

        if (!nextFamiglia) {
          nextFamiglia = await fetchUniqueFamigliaByLabel(
            selectedRapporto.cognome_nome_datore_proper
          )
        }

        if (!nextLavoratore) {
          nextLavoratore = await fetchUniqueLavoratoreByLabel(
            selectedRapporto.nome_lavoratore_per_url
          )
        }

        if (!isActive) return

        setSelectedFamiglia(nextFamiglia)
        setSelectedLavoratore(nextLavoratore)
        setSelectedProcessi(processiRows)
        setSelectedContributi(contributiResponse.rows as ContributoInpsRecord[])
        setSelectedMesi(mesiResponse.rows as MeseLavoratoRecord[])
        setSelectedMesiCalendario(mesiCalendarioResponse.rows as MeseCalendarioRecord[])
        setSelectedPagamenti(pagamentiResponse.rows as PagamentoRecord[])
        setSelectedPresenze(presenzeResponse.rows as PresenzaMensileRecord[])
        setSelectedVariazioni(variazioniResponse.rows as VariazioneContrattualeRecord[])
        setSelectedChiusure(chiusuraResponse.rows as ChiusuraContrattoRecord[])
        setSelectedTickets(ticketsResponse.rows as TicketRecord[])
      } catch (loadError) {
        if (!isActive) return
        console.error("Errore caricando record collegati al rapporto", loadError)
        setError("Errore nel caricamento dei record collegati. Riprova tra qualche secondo.")
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedPresenze([])
        setSelectedVariazioni([])
        setSelectedChiusure([])
        setSelectedTickets([])
      } finally {
        if (isActive) setLoadingRelated(false)
      }
    }

    void loadRelatedRecords()

    return () => {
      isActive = false
    }
  }, [selectedRapporto])

  return {
    rapporti,
    rapportiTotal,
    loading,
    error,
    pageIndex,
    pageSize: PAGE_SIZE,
    setPageIndex,
    searchValue,
    setSearchValue,
    rapportoStatusFilter,
    setRapportoStatusFilter,
    retryRapporti,
    selectedRapportoId,
    setSelectedRapportoId,
    selectedRapporto,
    selectedFamiglia,
    selectedLavoratore,
    selectedProcessi,
    selectedContributi,
    selectedMesi,
    selectedMesiCalendario,
    selectedPagamenti,
    selectedPresenze,
    selectedVariazioni,
    selectedChiusure,
    selectedTickets,
    loadingRelated,
    lookupColorsByDomain,
    createTicketForSelectedRapporto,
  }
}
