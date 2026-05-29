import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

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
  fetchRapportiLavorativiBoard,
  fetchTickets,
  fetchVariazioniContrattuali,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

// The board lists rapporti; related tables are loaded only for the selected
// detail and would cause excessive refetches if subscribed here. Detail-level
// realtime is a follow-up refinement.
const RAPPORTI_REALTIME_TABLES = ["rapporti_lavorativi"]
import { fetchRichiesteAttivazioneByProcessIds } from "@/features/richieste-attivazione/api"
import { getRapportoProcessIds } from "@/features/rapporti/rapporti-processi"
import { normalizeLookupColors } from "@/features/lavoratori/lib/lookup-utils"
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
  RichiestaAttivazioneRecord,
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

const PAGE_SIZE = 50

/**
 * Bindings between source DB/RPC columns and the card fields they populate
 * on a board row.
 *
 * The board RPC `rapporti_lavorativi_board` enriches four display-only
 * columns on top of `to_jsonb(rapporto)`:
 *   - `cognome_nome_datore_proper`  (overridden with `famiglie.cognome nome`)
 *   - `nome_lavoratore_per_url`     (overridden with `lavoratori.cognome nome`)
 *   - `data_fine_rapporto`          (joined from `chiusure_contratti`)
 *   - `stato_rapporto`              (computed: In attivazione / Attivo / Terminato / …)
 *
 * The detail loader (`fetchRapportiLavorativi`, raw SELECT *) may return these
 * columns with stale or null values (`data_fine_rapporto` and `stato_rapporto`
 * are NOT real columns on the table). When the detail loader writes back into
 * the board cache via `setQueryData`, the merged row preserves the board's
 * enriched values via the inline merge. But a subsequent realtime invalidate
 * refetches the board RPC and rebuilds the row from scratch — without
 * Pattern A, any field the refetch path doesn't return (e.g. if the RPC
 * shape ever narrows, or a partial row arrives) would be wiped from the
 * open detail panel. `preserveMissingFields` makes the board rebuild
 * symmetric to the detail merge.
 */
export const RAPPORTO_FIELD_BINDINGS: Array<
  readonly [string, keyof RapportoLavorativoRecord]
> = [
  ["cognome_nome_datore_proper", "cognome_nome_datore_proper"],
  ["nome_lavoratore_per_url", "nome_lavoratore_per_url"],
  ["data_fine_rapporto", "data_fine_rapporto"],
  ["stato_rapporto", "stato_rapporto"],
]

/**
 * For each binding, if the source column is NOT present in `row`, restore
 * the previous card's value. Mutates `card` in place. If `row` is missing
 * entirely, every bound field falls back to previous. If the column is
 * present (even with value `null`), the fresh value wins — clearing in DB
 * propagates correctly.
 */
export function preserveMissingFields<TCard extends Record<string, unknown>>(
  card: TCard,
  previousCard: TCard,
  row: Record<string, unknown> | undefined | null,
  bindings: Array<readonly [string, keyof TCard]>,
) {
  for (const [column, field] of bindings) {
    if (row && column in row) continue
    ;(card as Record<string, unknown>)[field as string] = previousCard[field]
  }
}

/**
 * Map a raw board row into a `RapportoLavorativoRecord` card, preserving
 * detail-only fields from `previousCard` when their source columns are
 * absent from the fresh `row`. The board RPC currently returns the full
 * rapporto record so most fields come straight from `row`, but Pattern A
 * keeps the open detail panel robust to RPC shape changes and concurrent
 * detail-vs-board writes.
 */
export function mapRapportoBoardRow(
  row: RapportoLavorativoRecord,
  previousCard?: RapportoLavorativoRecord,
): RapportoLavorativoRecord {
  const card: RapportoLavorativoRecord = { ...row }
  if (previousCard) {
    preserveMissingFields(
      card as unknown as Record<string, unknown>,
      previousCard as unknown as Record<string, unknown>,
      row as unknown as Record<string, unknown>,
      RAPPORTO_FIELD_BINDINGS as unknown as Array<
        readonly [string, keyof Record<string, unknown>]
      >,
    )
  }
  return card
}

export type RapportoStatusFilter =
  | "all"
  | "In attivazione"
  | "Attivo"
  | "Terminato"
  | "Sconosciuto"
  | "Errore"

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

type UseRapportiLavorativiDataOptions = {
  initialSelectedRapportoId?: string | null
}

export function useRapportiLavorativiData(
  options: UseRapportiLavorativiDataOptions = {}
) {
  const { initialSelectedRapportoId = null } = options
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = React.useState(0)
  const [detailError, setDetailError] = React.useState<string | null>(null)
  const [detailRetryToken, setDetailRetryToken] = React.useState(0)
  const [searchValue, setSearchValue] = React.useState("")
  const [rapportoStatusFilter, setRapportoStatusFilter] =
    React.useState<RapportoStatusFilter>("all")
  const [selectedRapportoId, setSelectedRapportoId] = React.useState<string | null>(
    initialSelectedRapportoId
  )
  const [selectedRapporto, setSelectedRapporto] = React.useState<RapportoLavorativoRecord | null>(
    null
  )
  const [loadingSelectedRapporto, setLoadingSelectedRapporto] = React.useState(false)
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
  const [selectedRichiesteAttivazione, setSelectedRichiesteAttivazione] = React.useState<
    RichiestaAttivazioneRecord[]
  >([])
  const [loadingRelated, setLoadingRelated] = React.useState(false)
  const [loadingRelatedSections, setLoadingRelatedSections] = React.useState<
    Partial<Record<string, boolean>>
  >({})
  const loadedRelatedSectionsRef = React.useRef<Set<string>>(new Set())
  const selectedRapportoIdRef = React.useRef<string | null>(selectedRapportoId)
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const serverSearchQuery = React.useMemo(() => buildSearchQuery(searchValue), [searchValue])

  React.useEffect(() => {
    selectedRapportoIdRef.current = selectedRapportoId
  }, [selectedRapportoId])

  const boardQueryKey = React.useMemo(
    () =>
      [
        "rapporti-lavorativi-board",
        pageIndex,
        rapportoStatusFilter,
        serverSearchQuery,
      ] as const,
    [pageIndex, rapportoStatusFilter, serverSearchQuery],
  )

  const {
    data: boardData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: async () => {
      const result = await fetchRapportiLavorativiBoard({
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE,
        search: serverSearchQuery,
        statusFilter: rapportoStatusFilter,
      })

      // Read the latest cached rows at mapping-time (after the fetch) so any
      // concurrent setQueryData (e.g. loadSelectedRapporto resolving
      // mid-fetch) is observed and we never reinstate a stale snapshot.
      const getPreviousCard = (id: string): RapportoLavorativoRecord | undefined => {
        const latest = queryClient.getQueryData<typeof result>(boardQueryKey)
        return latest?.rows.find((rapporto) => rapporto.id === id)
      }

      return {
        ...result,
        rows: result.rows.map((row) =>
          mapRapportoBoardRow(row, row.id ? getPreviousCard(row.id) : undefined),
        ),
      }
    },
  })

  const rapporti = React.useMemo(() => boardData?.rows ?? [], [boardData?.rows])
  const rapportiTotal = boardData?.total ?? 0
  const error =
    queryError instanceof Error
      ? getRapportiLoadErrorMessage(queryError)
      : null

  const retryRapporti = React.useCallback(() => {
    setDetailError(null)
    setDetailRetryToken((current) => current + 1)
    void refetch()
  }, [refetch])

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["rapporti-lavorativi-board"] })
  }, [queryClient])

  /**
   * Apply a freshly-saved rapporto row to local state.
   *
   * Called by `RapportoDetailPanel` after its own `updateRecord` calls so
   * that `selectedRapporto` and the board cache don't lag behind the DB.
   * Without this, the detail panel's locally-cached row would diverge from
   * the prop the parent sends down, and any draft resync against that prop
   * (the realtime-bug-class pattern) would wipe just-saved values from the
   * UI. Mirrors the merge already done in `loadSelectedRapporto` so the
   * four board-enriched columns (`cognome_nome_datore_proper`,
   * `nome_lavoratore_per_url`, `data_fine_rapporto`, `stato_rapporto`)
   * survive — they aren't real columns on `rapporti_lavorativi`, so the
   * edge function's `response.row` doesn't return resolved values.
   */
  const updateSelectedRapporto = React.useCallback(
    (updatedRow: RapportoLavorativoRecord) => {
      if (!updatedRow?.id) return

      setSelectedRapporto((previous) => {
        if (!previous || previous.id !== updatedRow.id) return updatedRow
        return {
          ...previous,
          ...updatedRow,
          cognome_nome_datore_proper:
            updatedRow.cognome_nome_datore_proper ?? previous.cognome_nome_datore_proper,
          nome_lavoratore_per_url:
            updatedRow.nome_lavoratore_per_url ?? previous.nome_lavoratore_per_url,
          data_fine_rapporto:
            updatedRow.data_fine_rapporto ?? previous.data_fine_rapporto,
          stato_rapporto: updatedRow.stato_rapporto ?? previous.stato_rapporto,
        }
      })

      queryClient.setQueryData(boardQueryKey, (previous: typeof boardData | undefined) => {
        if (!previous) return previous
        return {
          ...previous,
          rows: previous.rows.map((row) =>
            row.id === updatedRow.id
              ? {
                  ...row,
                  ...updatedRow,
                  cognome_nome_datore_proper:
                    updatedRow.cognome_nome_datore_proper ?? row.cognome_nome_datore_proper,
                  nome_lavoratore_per_url:
                    updatedRow.nome_lavoratore_per_url ?? row.nome_lavoratore_per_url,
                }
              : row,
          ),
        }
      })
    },
    [queryClient, boardQueryKey],
  )

  useRealtimeBoardSync({
    tables: RAPPORTI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

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

  // Auto-select the first rapporto once the board loads (if nothing selected yet).
  React.useEffect(() => {
    if (!selectedRapportoId && rapporti.length > 0) {
      setSelectedRapportoId(rapporti[0].id)
    }
  }, [rapporti, selectedRapportoId])

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

  React.useEffect(() => {
    setSelectedRapportoId((previous) => {
      if (previous && rapporti.some((rapporto) => rapporto.id === previous)) {
        return previous
      }
      return rapporti[0]?.id ?? null
    })
  }, [rapporti])

  React.useEffect(() => {
    if (!initialSelectedRapportoId) return
    setSelectedRapportoId(initialSelectedRapportoId)
  }, [initialSelectedRapportoId])

  React.useEffect(() => {
    let isActive = true

    async function loadSelectedRapporto() {
      if (!selectedRapportoId) {
        setLoadingSelectedRapporto(false)
        setSelectedRapporto(null)
        return
      }

      setLoadingSelectedRapporto(true)
      const fallbackRapporto =
        rapporti.find((rapporto) => rapporto.id === selectedRapportoId) ?? null
      setSelectedRapporto(fallbackRapporto)

      try {
        const response = await fetchRapportiLavorativi({
          limit: 1,
          offset: 0,
          filters: buildEqualsFilter("id", selectedRapportoId),
        })
        if (!isActive) return

        const freshRapporto = (response.rows[0] as RapportoLavorativoRecord | undefined) ?? null
        // La RPC board arricchisce alcune proprietà non presenti (o non risolte) nella
        // tabella grezza: i nomi visualizzati ("cognome_nome_datore_proper" /
        // "nome_lavoratore_per_url") sovrascritti con i nomi reali di famiglia/lavoratore,
        // e i campi derivati "data_fine_rapporto" (da chiusure_contratti) e
        // "stato_rapporto". La fetch grezza qui sotto non li ha, quindi li preserviamo dal
        // board per non declassare card, titolo e badge di stato.
        const mergedRapporto =
          freshRapporto && fallbackRapporto
            ? {
                ...freshRapporto,
                cognome_nome_datore_proper:
                  fallbackRapporto.cognome_nome_datore_proper ??
                  freshRapporto.cognome_nome_datore_proper,
                nome_lavoratore_per_url:
                  fallbackRapporto.nome_lavoratore_per_url ??
                  freshRapporto.nome_lavoratore_per_url,
                data_fine_rapporto:
                  fallbackRapporto.data_fine_rapporto ?? freshRapporto.data_fine_rapporto,
                stato_rapporto: fallbackRapporto.stato_rapporto ?? freshRapporto.stato_rapporto,
              }
            : freshRapporto
        setSelectedRapporto(mergedRapporto)

        if (mergedRapporto) {
          queryClient.setQueryData(boardQueryKey, (previous: typeof boardData | undefined) => {
            if (!previous) return previous
            return {
              ...previous,
              rows: previous.rows.map((rapporto) =>
                rapporto.id === mergedRapporto.id
                  ? {
                      ...mergedRapporto,
                      cognome_nome_datore_proper:
                        mergedRapporto.cognome_nome_datore_proper ??
                        rapporto.cognome_nome_datore_proper,
                      nome_lavoratore_per_url:
                        mergedRapporto.nome_lavoratore_per_url ??
                        rapporto.nome_lavoratore_per_url,
                    }
                  : rapporto,
              ),
            }
          })
        }
      } catch (loadError) {
        if (!isActive) return
        console.error("Errore caricando dettaglio rapporto", loadError)
        setDetailError("Errore nel caricamento del rapporto selezionato. Riprova tra qualche secondo.")
      } finally {
        if (isActive) {
          setLoadingSelectedRapporto(false)
        }
      }
    }

    void loadSelectedRapporto()

    return () => {
      isActive = false
    }
    // Only re-fetch detail when the selected id changes or retry is triggered.
    // Re-running on every board re-render (rapporti object identity change)
    // would be wasteful; the merged-detail patch inside this effect handles
    // board cache sync via setQueryData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailRetryToken, selectedRapportoId])

  React.useEffect(() => {
    let isActive = true

    async function loadRelatedRecords() {
      if (!selectedRapporto) {
        setLoadingRelated(false)
        setLoadingRelatedSections({})
        loadedRelatedSectionsRef.current = new Set()
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
        setSelectedRichiesteAttivazione([])
        return
      }

      setLoadingRelated(true)
      setLoadingRelatedSections({})
      loadedRelatedSectionsRef.current = new Set()
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
      setSelectedRichiesteAttivazione([])

      try {
        const processIds = getRapportoProcessIds(selectedRapporto)
        const processiFilter = buildIdsFilter(processIds)
        const [famigliaResponse, lavoratoreResponse, processiResponse, chiusuraResponse] = await Promise.all([
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
          selectedRapporto.fine_rapporto_lavorativo_id
            ? fetchChiusureContratti({
                limit: 1,
                offset: 0,
                orderBy: [{ field: "data_fine_rapporto", ascending: false }],
                filters: buildEqualsFilter("id", selectedRapporto.fine_rapporto_lavorativo_id),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ])

        const processiRows = processiResponse.rows as ProcessoMatchingRecord[]
        const richiesteByProcessId = await fetchRichiesteAttivazioneByProcessIds(processIds)
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
        setSelectedChiusure(chiusuraResponse.rows as ChiusuraContrattoRecord[])
        setSelectedRichiesteAttivazione(Array.from(richiesteByProcessId.values()))
        loadedRelatedSectionsRef.current.add("preventivo")
        loadedRelatedSectionsRef.current.add("gestione")
        loadedRelatedSectionsRef.current.add("chiusure")
      } catch (loadError) {
        if (!isActive) return
        console.error("Errore caricando record collegati al rapporto", loadError)
        setDetailError("Errore nel caricamento dei record collegati. Riprova tra qualche secondo.")
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedPresenze([])
        setSelectedVariazioni([])
        setSelectedChiusure([])
        setSelectedTickets([])
        setSelectedRichiesteAttivazione([])
      } finally {
        if (isActive) setLoadingRelated(false)
      }
    }

    void loadRelatedRecords()

    return () => {
      isActive = false
    }
    // Depend on `selectedRapporto?.id`, NOT on the object reference. The
    // detail panel's onRapportoUpdated callback calls setSelectedRapporto
    // with a merged copy of the saved row after every save — same id, new
    // reference. If we depended on the reference, every save would re-fire
    // this effect, which starts by nulling out famiglia/lavoratore and
    // refetching them: while the refetch is in flight the title falls back
    // to "Famiglia senza nome – Lavoratore non associato" and flashes the
    // user. famiglia_id / lavoratore_id / fine_rapporto_lavorativo_id and
    // the proper-name fields the body reads are stable for a given
    // rapporto-id (they are not changed by the detail-panel patches), so
    // pinning the dep to the id is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRapporto?.id])

  const ensureRelatedSectionLoaded = React.useCallback(
    async (sectionId: string) => {
      const rapporto = selectedRapporto
      if (!rapporto) return
      if (!["tickets", "cedolini", "contributi", "variazioni"].includes(sectionId)) return
      if (loadedRelatedSectionsRef.current.has(sectionId) || loadingRelatedSections[sectionId]) return

      setLoadingRelatedSections((current) => ({ ...current, [sectionId]: true }))

      try {
        if (sectionId === "tickets") {
          const response = await fetchTickets({
            limit: 100,
            offset: 0,
            orderBy: [{ field: "data_apertura", ascending: false }],
            filters: buildEqualsFilter("rapporto_id", rapporto.id),
          })
          if (selectedRapportoIdRef.current !== rapporto.id) return
          setSelectedTickets(response.rows as TicketRecord[])
        }

        if (sectionId === "contributi") {
          const response = await fetchContributiInps({
            limit: 200,
            offset: 0,
            orderBy: [{ field: "data_ora_creazione", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          })
          if (selectedRapportoIdRef.current !== rapporto.id) return
          setSelectedContributi(response.rows as ContributoInpsRecord[])
        }

        if (sectionId === "variazioni") {
          const response = await fetchVariazioniContrattuali({
            limit: 200,
            offset: 0,
            orderBy: [{ field: "data_variazione", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          })
          if (selectedRapportoIdRef.current !== rapporto.id) return
          setSelectedVariazioni(response.rows as VariazioneContrattualeRecord[])
        }

        if (sectionId === "cedolini") {
          const mesiResponse = await fetchMesiLavorati({
            limit: 500,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          })
          const mesiRows = mesiResponse.rows as MeseLavoratoRecord[]
          const meseIds = mesiRows
            .map((mese) => mese.mese_id)
            .filter((meseId): meseId is string => Boolean(meseId))
          const ticketIds = mesiRows
            .map((mese) => mese.ticket_id)
            .filter((ticketId): ticketId is string => Boolean(ticketId))
          const presenzaIds = mesiRows.flatMap((mese) =>
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

          if (selectedRapportoIdRef.current !== rapporto.id) return
          setSelectedMesi(mesiRows)
          setSelectedMesiCalendario(mesiCalendarioResponse.rows as MeseCalendarioRecord[])
          setSelectedPagamenti(pagamentiResponse.rows as PagamentoRecord[])
          setSelectedPresenze(presenzeResponse.rows as PresenzaMensileRecord[])
        }

        loadedRelatedSectionsRef.current.add(sectionId)
      } catch (loadError) {
        console.error(`Errore caricando sezione rapporto ${sectionId}`, loadError)
        setDetailError("Errore nel caricamento dei record collegati. Riprova tra qualche secondo.")
      } finally {
        setLoadingRelatedSections((current) => ({ ...current, [sectionId]: false }))
      }
    },
    [loadingRelatedSections, selectedRapporto],
  )

  return {
    rapporti,
    rapportiTotal,
    loading,
    error: error ?? detailError,
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
    loadingSelectedRapporto,
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
    selectedRichiesteAttivazione,
    loadingRelated,
    loadingRelatedSections,
    ensureRelatedSectionLoaded,
    lookupColorsByDomain,
    createTicketForSelectedRapporto,
    updateSelectedRapporto,
  }
}
