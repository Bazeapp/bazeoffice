import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createRecord,
  fetchAssunzioniNamesByRapportoIds,
  fetchChiusureByIds,
  fetchContributiInpsByRapporto,
  fetchFamiglieByIds,
  fetchFamiglieByName,
  fetchLavoratoriByIds,
  fetchLavoratoriByName,
  fetchLookupValues,
  fetchMesiCalendarioByIds,
  fetchMesiLavoratiByRapporto,
  fetchPagamentiByTransazioneIds,
  fetchProcessiMatchingByIds,
  fetchPresenzeByIds,
  fetchRapportiLavorativiByIds,
  fetchRapportiLavorativiBoard,
  fetchTicketByRapporto,
  fetchTransazioniByMeseLavoratoIds,
  fetchVariazioniByRapporto,
  type RapportoAssunzioneNames,
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
  TransazioneFinanziariaRecord,
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
  const normalizedValue = value.trim().replace(/\s+/g, " ")
  if (!normalizedValue) return undefined

  // La RPC `rapporti_lavorativi_board` tokenizza la query e richiede che ogni
  // parola compaia nel testo di ricerca (AND). Passiamo quindi la frase intera
  // così funzionano anche i nomi completi multi-parola (inclusi i nominativi
  // delle assunzioni), non solo un singolo token.
  return normalizedValue
}

function splitNameLabel(label: string | null | undefined) {
  const full = label?.trim().replace(/\s+/g, " ")
  if (!full) return null
  const [firstPart, ...restParts] = full.split(" ")
  const restPart = restParts.join(" ").trim()
  return { full, first: firstPart || null, rest: restPart || null }
}

async function fetchUniqueFamigliaByLabel(label: string | null | undefined) {
  const parts = splitNameLabel(label)
  if (!parts?.first || !parts.rest) return null

  const response = await fetchFamiglieByName(parts.first, parts.rest)
  return response.rows.length === 1 ? (response.rows[0] as FamigliaRecord) : null
}

async function fetchUniqueLavoratoreByLabel(label: string | null | undefined) {
  const parts = splitNameLabel(label)
  if (!parts) return null

  const response = await fetchLavoratoriByName(parts.first, parts.rest, parts.full)
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
  const [selectedAssunzioneNames, setSelectedAssunzioneNames] =
    React.useState<RapportoAssunzioneNames | null>(null)
  const [selectedProcessi, setSelectedProcessi] = React.useState<ProcessoMatchingRecord[]>([])
  const [selectedContributi, setSelectedContributi] = React.useState<ContributoInpsRecord[]>([])
  const [selectedMesi, setSelectedMesi] = React.useState<MeseLavoratoRecord[]>([])
  const [selectedMesiCalendario, setSelectedMesiCalendario] = React.useState<MeseCalendarioRecord[]>([])
  const [selectedPagamenti, setSelectedPagamenti] = React.useState<PagamentoRecord[]>([])
  const [selectedTransazioni, setSelectedTransazioni] = React.useState<TransazioneFinanziariaRecord[]>([])
  const [selectedPresenze, setSelectedPresenze] = React.useState<PresenzaMensileRecord[]>([])
  const [selectedVariazioni, setSelectedVariazioni] = React.useState<VariazioneContrattualeRecord[]>([])
  const [selectedChiusure, setSelectedChiusure] = React.useState<ChiusuraContrattoRecord[]>([])
  const [selectedTickets, setSelectedTickets] = React.useState<TicketRecord[]>([])
  const [selectedRichiesteAttivazione, setSelectedRichiesteAttivazione] = React.useState<
    RichiestaAttivazioneRecord[]
  >([])
  const [loadingRelated, setLoadingRelated] = React.useState(false)
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const serverSearchQuery = React.useMemo(() => buildSearchQuery(searchValue), [searchValue])

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

      // Nomi dalle assunzioni collegate (priorità sul nome del rapporto) per la
      // pagina corrente della lista.
      const assunzioneNames = await fetchAssunzioniNamesByRapportoIds(
        result.rows
          .map((row) => row.id)
          .filter((id): id is string => Boolean(id)),
      )

      return {
        ...result,
        rows: result.rows.map((row) =>
          mapRapportoBoardRow(row, row.id ? getPreviousCard(row.id) : undefined),
        ),
        assunzioneNames,
      }
    },
  })

  const rapporti = React.useMemo(() => boardData?.rows ?? [], [boardData?.rows])
  const rapportoAssunzioneNames = React.useMemo(
    () => boardData?.assunzioneNames ?? {},
    [boardData?.assunzioneNames],
  )
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
        const response = await fetchRapportiLavorativiByIds([selectedRapportoId])
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
        setSelectedFamiglia(null)
        setSelectedLavoratore(null)
        setSelectedAssunzioneNames(null)
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedTransazioni([])
        setSelectedPresenze([])
        setSelectedVariazioni([])
        setSelectedChiusure([])
        setSelectedTickets([])
        setSelectedRichiesteAttivazione([])
        return
      }

      setLoadingRelated(true)
      setSelectedFamiglia(null)
      setSelectedLavoratore(null)
      setSelectedAssunzioneNames(null)
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
        // Tutte le sezioni collegate del rapporto sono caricate eager
        // all'apertura della scheda. Prima erano lazy (caricate solo quando
        // l'IntersectionObserver del pannello marcava la sezione "attiva"
        // durante lo scroll): con rootMargin -60% in basso le sezioni in coda
        // non raggiungevano mai la fascia attiva e restavano vuote anche con
        // dati collegati. Sono tutte query leggere, quindi le prendiamo qui.
        const [
          famigliaResponse,
          lavoratoreResponse,
          processiResponse,
          chiusuraResponse,
          ticketResponse,
          contributiResponse,
          variazioniResponse,
          mesiResponse,
        ] = await Promise.all([
          selectedRapporto.famiglia_id
            ? fetchFamiglieByIds([selectedRapporto.famiglia_id])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          selectedRapporto.lavoratore_id
            ? fetchLavoratoriByIds([selectedRapporto.lavoratore_id])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          processIds.length > 0
            ? fetchProcessiMatchingByIds({ ids: processIds })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          selectedRapporto.fine_rapporto_lavorativo_id
            ? fetchChiusureByIds([selectedRapporto.fine_rapporto_lavorativo_id])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          fetchTicketByRapporto(selectedRapporto.id),
          fetchContributiInpsByRapporto(selectedRapporto.id),
          fetchVariazioniByRapporto(selectedRapporto.id),
          fetchMesiLavoratiByRapporto(selectedRapporto.id),
        ])

        // Cedolini: i mesi lavorati guidano le fetch dipendenti (calendario,
        // presenze, transazioni) tramite gli id referenziati.
        const mesiRows = mesiResponse.rows as MeseLavoratoRecord[]
        const meseIds = mesiRows
          .map((mese) => mese.mese_id)
          .filter((meseId): meseId is string => Boolean(meseId))
        const presenzaIds = mesiRows.flatMap((mese) =>
          [mese.presenze_id, mese.presenze_regolare_id].filter(
            (presenzaId): presenzaId is string => Boolean(presenzaId)
          )
        )

        // La transazione (link pagamento) si lega al mese lavorato via
        // `mese_lavorativo_id` = id del mese lavorato, non al ticket.
        const meseLavoratoIds = mesiRows
          .map((mese) => mese.id)
          .filter((id): id is string => Boolean(id))

        const [mesiCalendarioResponse, presenzeResponse, transazioniResponse, assunzioneNamesResponse] =
          await Promise.all([
            fetchMesiCalendarioByIds(meseIds),
            fetchPresenzeByIds(presenzaIds),
            fetchTransazioniByMeseLavoratoIds(meseLavoratoIds),
            fetchAssunzioniNamesByRapportoIds([selectedRapporto.id]),
          ])

        // Il pagamento si collega al cedolino tramite la transazione
        // (pagamento.transazione_id), non tramite il ticket: stesso percorso
        // della RPC cedolini_board della pagina cedolini.
        const transazioniRows = transazioniResponse.rows as TransazioneFinanziariaRecord[]
        const transazioneIds = transazioniRows
          .map((transazione) => transazione.id)
          .filter((id): id is string => Boolean(id))
        const pagamentiResponse = await fetchPagamentiByTransazioneIds(transazioneIds)

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
            const fallbackFamiglieResponse = await fetchFamiglieByIds(fallbackFamigliaIds)
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
        setSelectedAssunzioneNames(assunzioneNamesResponse[selectedRapporto.id] ?? null)
        setSelectedProcessi(processiRows)
        setSelectedChiusure(chiusuraResponse.rows as ChiusuraContrattoRecord[])
        setSelectedTickets(ticketResponse.rows as TicketRecord[])
        setSelectedContributi(contributiResponse.rows as ContributoInpsRecord[])
        setSelectedVariazioni(variazioniResponse.rows as VariazioneContrattualeRecord[])
        setSelectedMesi(mesiRows)
        setSelectedMesiCalendario(mesiCalendarioResponse.rows as MeseCalendarioRecord[])
        setSelectedPagamenti(pagamentiResponse.rows as PagamentoRecord[])
        setSelectedTransazioni(transazioniResponse.rows as TransazioneFinanziariaRecord[])
        setSelectedPresenze(presenzeResponse.rows as PresenzaMensileRecord[])
        setSelectedRichiesteAttivazione(Array.from(richiesteByProcessId.values()))
      } catch (loadError) {
        if (!isActive) return
        console.error("Errore caricando record collegati al rapporto", loadError)
        setDetailError("Errore nel caricamento dei record collegati. Riprova tra qualche secondo.")
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedTransazioni([])
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

  return {
    rapporti,
    rapportoAssunzioneNames,
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
    selectedAssunzioneNames,
    selectedProcessi,
    selectedContributi,
    selectedMesi,
    selectedMesiCalendario,
    selectedPagamenti,
    selectedTransazioni,
    selectedPresenze,
    selectedVariazioni,
    selectedChiusure,
    selectedTickets,
    selectedRichiesteAttivazione,
    loadingRelated,
    lookupColorsByDomain,
    createTicketForSelectedRapporto,
    updateSelectedRapporto,
  }
}
