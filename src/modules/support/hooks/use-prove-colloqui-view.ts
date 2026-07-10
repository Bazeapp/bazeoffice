import * as React from "react"

import type { ProcessoMatchingRecord, RapportoLavorativoRecord } from "@/types"

import { getWeekVisibleRange } from "../lib"
import { TRIAL_STATUS_DOMAIN } from "../lib/prove-colloqui-data.utils"
import type { ProveColloquiViewTab } from "../lib/prove-colloqui-view.constants"
import type { CalendarDateRange, ColloquioCalendarEvent, ProvaCardData } from "../types"
import { useProveColloquiData } from "./use-prove-colloqui-data"

export type ProveColloquiViewProps = {
  onOpenRicercaDetail: (processId: string) => void
}

export function useProveColloquiView({ onOpenRicercaDetail }: ProveColloquiViewProps) {
  const [calendarRange, setCalendarRange] = React.useState<CalendarDateRange>(() =>
    getWeekVisibleRange(new Date()),
  )
  const {
    loading,
    error,
    reload,
    provaColumns,
    provaCards,
    calendarEvents,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    patchRapporto,
    patchProcess,
  } = useProveColloquiData(calendarRange)
  const [activeTab, setActiveTab] = React.useState<ProveColloquiViewTab>("prove")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [selectedColloquio, setSelectedColloquio] = React.useState<
    Extract<ColloquioCalendarEvent, { type: "colloquio" }> | null
  >(null)

  const selectedCard = React.useMemo(
    () => provaCards.find((card) => card.id === selectedCardId) ?? null,
    [provaCards, selectedCardId],
  )
  const statusOptions = lookupOptionsByDomain.get(TRIAL_STATUS_DOMAIN) ?? []
  const feedbackFamigliaOptions =
    lookupOptionsByDomain.get("rapporti_lavorativi.prova_feedback_famiglia") ?? []
  const feedbackLavoratoreOptions =
    lookupOptionsByDomain.get("rapporti_lavorativi.prova_feedback_lavoratore") ?? []
  const ramoD2Options = lookupOptionsByDomain.get("rapporti_lavorativi.prova_ramo_d2") ?? []
  const tipoIncontroOptions =
    lookupOptionsByDomain.get("processi_matching.tipo_incontro_famiglia_lavoratore") ?? []
  const totalProve = provaColumns.reduce((sum, column) => sum + column.totalCount, 0)

  const handleVisibleRangeChange = React.useCallback((nextRange: CalendarDateRange) => {
    setCalendarRange((currentRange) =>
      currentRange.start === nextRange.start && currentRange.end === nextRange.end
        ? currentRange
        : nextRange,
    )
  }, [])

  const handleCardClick = React.useCallback((card: ProvaCardData) => {
    setSelectedCardId(card.id)
  }, [])

  const handleEventClick = React.useCallback((event: ColloquioCalendarEvent) => {
    if (event.type === "prova") {
      setSelectedCardId(event.card.id)
      return
    }
    setSelectedColloquio(event)
  }, [])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    error,
    reload,
    header: {
      badgeLabel:
        activeTab === "prove" ? `${totalProve} prove` : `${calendarEvents.length} eventi`,
      showRetry: Boolean(error),
    },
    kanban: {
      columns: provaColumns,
      searchQuery,
      loading,
      onCardClick: handleCardClick,
    },
    calendar: {
      events: calendarEvents,
      searchQuery,
      onVisibleRangeChange: handleVisibleRangeChange,
      onEventClick: handleEventClick,
    },
    provaSheet: {
      selectedCardId,
      card: selectedCard,
      statusOptions,
      feedbackFamigliaOptions,
      feedbackLavoratoreOptions,
      ramoD2Options,
      lookupColorsByDomain,
      open: Boolean(selectedCard),
      onOpenChange: (open: boolean) => {
        if (!open) setSelectedCardId(null)
      },
      patchRapporto: patchRapporto as (
        rapportoId: string,
        patch: Partial<RapportoLavorativoRecord>,
      ) => Promise<RapportoLavorativoRecord>,
    },
    colloquioSheet: {
      event: selectedColloquio,
      tipoIncontroOptions,
      open: Boolean(selectedColloquio),
      onOpenChange: (open: boolean) => {
        if (!open) setSelectedColloquio(null)
      },
      onOpenRicercaDetail,
      patchProcess: patchProcess as (
        processId: string,
        patch: Partial<ProcessoMatchingRecord>,
      ) => Promise<ProcessoMatchingRecord>,
    },
  }
}
