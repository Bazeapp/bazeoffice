import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { normalizeLookupColors, normalizeLookupOptions } from "@/modules/lavoratori/lib"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

import {
  buildColloquioCalendarEvents,
  buildProvaCalendarEvents,
  buildProvaCard,
  buildProvaColumns,
  getDefaultProveColloquiCalendarRange,
  mergeProveColloquiCalendarEvents,
  TRIAL_STATUS_DOMAIN,
} from "../lib/prove-colloqui-data.utils"
import { fetchProveColloquiBoard } from "../queries/fetch-prove-colloqui-board"
import type {
  CalendarDateRange,
  ColloquioCalendarEvent,
  LookupOption,
  ProvaCardData,
  ProvaColumnData,
} from "../types"

const PROVE_COLLOQUI_REALTIME_TABLES = [
  "selezioni_lavoratori",
  "processi_matching",
]

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
      : getDefaultProveColloquiCalendarRange()
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

  const statusOptions = optionsByDomain.get(TRIAL_STATUS_DOMAIN) ?? []
  const colloquioEvents = buildColloquioCalendarEvents({
    selections,
    processesById,
    selectionWorkersById,
    processFamiliesById,
  })
  const provaEvents = buildProvaCalendarEvents(cards)

  return {
    provaColumns: buildProvaColumns(cards, statusOptions, colorsByDomain),
    provaCards: cards,
    calendarEvents: mergeProveColloquiCalendarEvents(colloquioEvents, provaEvents),
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

  const { setBoardData, invalidateBoard } = useBoardQueryCache<BoardData>(
    boardQueryKey,
    "prove-colloqui-board",
  )
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
  }
}
