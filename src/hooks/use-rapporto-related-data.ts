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
  fetchPresenzeMensili,
  fetchProcessiMatching,
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
import { fetchVariazioniContrattuali } from "@/lib/anagrafiche-api"

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

type UseRapportoRelatedDataState = {
  famiglia: FamigliaRecord | null
  lavoratore: LavoratoreRecord | null
  processi: ProcessoMatchingRecord[]
  contributi: ContributoInpsRecord[]
  mesi: MeseLavoratoRecord[]
  mesiCalendario: MeseCalendarioRecord[]
  pagamenti: PagamentoRecord[]
  presenze: PresenzaMensileRecord[]
  variazioni: VariazioneContrattualeRecord[]
  chiusure: ChiusuraContrattoRecord[]
  loadingRelated: boolean
  lookupColorsByDomain: Map<string, string>
  error: string | null
}

export function useRapportoRelatedData(
  rapporto: RapportoLavorativoRecord | null
): UseRapportoRelatedDataState {
  const [famiglia, setFamiglia] = React.useState<FamigliaRecord | null>(null)
  const [lavoratore, setLavoratore] = React.useState<LavoratoreRecord | null>(null)
  const [processi, setProcessi] = React.useState<ProcessoMatchingRecord[]>([])
  const [contributi, setContributi] = React.useState<ContributoInpsRecord[]>([])
  const [mesi, setMesi] = React.useState<MeseLavoratoRecord[]>([])
  const [mesiCalendario, setMesiCalendario] = React.useState<MeseCalendarioRecord[]>([])
  const [pagamenti, setPagamenti] = React.useState<PagamentoRecord[]>([])
  const [presenze, setPresenze] = React.useState<PresenzaMensileRecord[]>([])
  const [variazioni, setVariazioni] = React.useState<VariazioneContrattualeRecord[]>([])
  const [chiusure, setChiusure] = React.useState<ChiusuraContrattoRecord[]>([])
  const [loadingRelated, setLoadingRelated] = React.useState(false)
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<Map<string, string>>(
    new Map()
  )
  const [error, setError] = React.useState<string | null>(null)

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
    let isActive = true

    async function loadRelatedRecords() {
      if (!rapporto) {
        setLoadingRelated(false)
        setError(null)
        setFamiglia(null)
        setLavoratore(null)
        setProcessi([])
        setContributi([])
        setMesi([])
        setMesiCalendario([])
        setPagamenti([])
        setPresenze([])
        setVariazioni([])
        setChiusure([])
        return
      }

      setLoadingRelated(true)
      setError(null)

      try {
        const processiFilter = buildIdsFilter(rapporto.processo_res ?? [])
        const [
          famigliaResponse,
          lavoratoreResponse,
          processiResponse,
          contributiResponse,
          mesiResponse,
          variazioniResponse,
          chiusuraResponse,
        ] = await Promise.all([
          rapporto.famiglia_id
            ? fetchFamiglie({
                limit: 1,
                offset: 0,
                filters: buildEqualsFilter("id", rapporto.famiglia_id),
              })
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
          rapporto.lavoratore_id
            ? fetchLavoratori({
                limit: 1,
                offset: 0,
                filters: buildEqualsFilter("id", rapporto.lavoratore_id),
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
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          }),
          fetchMesiLavorati({
            limit: 500,
            offset: 0,
            orderBy: [{ field: "creato_il", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          }),
          fetchVariazioniContrattuali({
            limit: 200,
            offset: 0,
            orderBy: [{ field: "data_variazione", ascending: false }],
            filters: buildEqualsFilter("rapporto_lavorativo_id", rapporto.id),
          }),
          rapporto.fine_rapporto_lavorativo_id
            ? fetchChiusureContratti({
                limit: 1,
                offset: 0,
                orderBy: [{ field: "data_fine_rapporto", ascending: false }],
                filters: buildEqualsFilter("id", rapporto.fine_rapporto_lavorativo_id),
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

        setFamiglia((famigliaResponse.rows[0] as FamigliaRecord | undefined) ?? null)
        setLavoratore((lavoratoreResponse.rows[0] as LavoratoreRecord | undefined) ?? null)
        setProcessi(processiResponse.rows as ProcessoMatchingRecord[])
        setContributi(contributiResponse.rows as ContributoInpsRecord[])
        setMesi(mesiResponse.rows as MeseLavoratoRecord[])
        setMesiCalendario(mesiCalendarioResponse.rows as MeseCalendarioRecord[])
        setPagamenti(pagamentiResponse.rows as PagamentoRecord[])
        setPresenze(presenzeResponse.rows as PresenzaMensileRecord[])
        setVariazioni(variazioniResponse.rows as VariazioneContrattualeRecord[])
        setChiusure(chiusuraResponse.rows as ChiusuraContrattoRecord[])
      } catch (loadError) {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Errore nel caricamento dei record collegati."
        )
        setFamiglia(null)
        setLavoratore(null)
        setProcessi([])
        setContributi([])
        setMesi([])
        setMesiCalendario([])
        setPagamenti([])
        setPresenze([])
        setVariazioni([])
        setChiusure([])
      } finally {
        if (isActive) setLoadingRelated(false)
      }
    }

    void loadRelatedRecords()

    return () => {
      isActive = false
    }
  }, [rapporto])

  return {
    famiglia,
    lavoratore,
    processi,
    contributi,
    mesi,
    mesiCalendario,
    pagamenti,
    presenze,
    variazioni,
    chiusure,
    loadingRelated,
    lookupColorsByDomain,
    error,
  }
}
