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
  fetchRapportiLavorativiBoard,
  fetchTickets,
  fetchVariazioniContrattuali,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
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
  const [rapporti, setRapporti] = React.useState<RapportoLavorativoRecord[]>([])
  const [rapportiTotal, setRapportiTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [searchValue, setSearchValue] = React.useState("")
  const [rapportoStatusFilter, setRapportoStatusFilter] =
    React.useState<RapportoStatusFilter>("all")
  const [selectedRapportoId, setSelectedRapportoId] = React.useState<string | null>(
    initialSelectedRapportoId
  )
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
        const response = await fetchRapportiLavorativiBoard({
          limit: PAGE_SIZE,
          offset: pageIndex * PAGE_SIZE,
          search: serverSearchQuery,
          statusFilter: rapportoStatusFilter,
        })

        if (!isActive) return

        setRapporti(response.rows)
        setRapportiTotal(response.total)
        setSelectedRapportoId((previous) => previous ?? response.rows[0]?.id ?? null)
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
  }, [pageIndex, rapportoStatusFilter, reloadToken, serverSearchQuery])

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
    if (!initialSelectedRapportoId) return
    setSelectedRapportoId(initialSelectedRapportoId)
  }, [initialSelectedRapportoId])

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
        setSelectedRichiesteAttivazione([])
      } finally {
        if (isActive) setLoadingRelated(false)
      }
    }

    void loadRelatedRecords()

    return () => {
      isActive = false
    }
  }, [selectedRapporto])

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
        setError("Errore nel caricamento dei record collegati. Riprova tra qualche secondo.")
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
    selectedRichiesteAttivazione,
    loadingRelated,
    loadingRelatedSections,
    ensureRelatedSectionLoaded,
    lookupColorsByDomain,
    createTicketForSelectedRapporto,
  }
}
