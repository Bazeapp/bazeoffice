import * as React from "react"

import {
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
  fetchVariazioniContrattuali,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import { normalizeLookupColors } from "@/features/lavoratori/lib/lookup-utils"
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
  VariazioneContrattualeRecord,
} from "@/types"

const PAGE_SIZE = 50
const SEARCH_FIELDS = ["nome_lavoratore_per_url", "cognome_nome_datore_proper", "id"]

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

export function useRapportiLavorativiData() {
  const [rapporti, setRapporti] = React.useState<RapportoLavorativoRecord[]>([])
  const [rapportiTotal, setRapportiTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [searchValue, setSearchValue] = React.useState("")
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
  const [loadingRelated, setLoadingRelated] = React.useState(false)
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const serverSearchQuery = React.useMemo(() => buildSearchQuery(searchValue), [searchValue])

  React.useEffect(() => {
    setPageIndex(0)
  }, [serverSearchQuery])

  React.useEffect(() => {
    let isActive = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchRapportiLavorativi({
          limit: PAGE_SIZE,
          offset: pageIndex * PAGE_SIZE,
          orderBy: [
            { field: "ultimo_aggiornamento", ascending: false },
            { field: "aggiornato_il", ascending: false },
          ],
          search: serverSearchQuery,
          searchFields: SEARCH_FIELDS,
        })

        if (!isActive) return

        setRapporti(response.rows)
        setRapportiTotal(response.total)
        setSelectedRapportoId((previous) => previous ?? response.rows[0]?.id ?? null)
      } catch (loadError) {
        if (!isActive) return
        setError(loadError instanceof Error ? loadError.message : "Errore nel caricamento rapporti.")
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
  }, [pageIndex, serverSearchQuery])

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
        return
      }

      setLoadingRelated(true)

      try {
        const processiFilter = buildIdsFilter(selectedRapporto.processo_res ?? [])
        const [famigliaResponse, lavoratoreResponse, processiResponse, contributiResponse, mesiResponse, variazioniResponse, chiusuraResponse] = await Promise.all([
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

        if (!isActive) return

        setSelectedFamiglia((famigliaResponse.rows[0] as FamigliaRecord | undefined) ?? null)
        setSelectedLavoratore((lavoratoreResponse.rows[0] as LavoratoreRecord | undefined) ?? null)
        setSelectedProcessi(processiResponse.rows as ProcessoMatchingRecord[])
        setSelectedContributi(contributiResponse.rows as ContributoInpsRecord[])
        setSelectedMesi(mesiResponse.rows as MeseLavoratoRecord[])
        setSelectedMesiCalendario(mesiCalendarioResponse.rows as MeseCalendarioRecord[])
        setSelectedPagamenti(pagamentiResponse.rows as PagamentoRecord[])
        setSelectedPresenze(presenzeResponse.rows as PresenzaMensileRecord[])
        setSelectedVariazioni(variazioniResponse.rows as VariazioneContrattualeRecord[])
        setSelectedChiusure(chiusuraResponse.rows as ChiusuraContrattoRecord[])
      } catch (loadError) {
        if (!isActive) return
        setError(loadError instanceof Error ? loadError.message : "Errore nel caricamento dei record collegati.")
        setSelectedProcessi([])
        setSelectedContributi([])
        setSelectedMesi([])
        setSelectedMesiCalendario([])
        setSelectedPagamenti([])
        setSelectedPresenze([])
        setSelectedVariazioni([])
        setSelectedChiusure([])
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
    loadingRelated,
    lookupColorsByDomain,
  }
}
