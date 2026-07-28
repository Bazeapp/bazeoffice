import * as React from "react"

import { RapportiListPanel } from "./rapporti-list-panel"
import { RapportoDetailPanel } from "./rapporto-detail-panel"
import { useRapportiLavorativiData } from "../hooks/use-rapporti-lavorativi-data"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  rapportoCommentRow,
  rapportoDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"

type RapportiLavorativiViewProps = {
  initialSelectedRapportoId?: string | null
  onSelectRapporto?: (rapportoId: string | null) => void
}

export function RapportiLavorativiView({
  initialSelectedRapportoId = null,
  onSelectRapporto,
}: RapportiLavorativiViewProps) {
  const {
    rapporti,
    rapportiTotal,
    loading,
    error,
    pageIndex,
    pageSize,
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
    rapportoAssunzioneNames,
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
  } = useRapportiLavorativiData({ initialSelectedRapportoId })

  // Riporta la selezione del board nella route (URL) così il Back del browser
  // ripristina il rapporto aperto — incluso il ritorno dal deep-link "Datore"
  // verso Assunzioni. Copre sia il click esplicito sia l'auto-select del primo.
  React.useEffect(() => {
    onSelectRapporto?.(selectedRapportoId)
  }, [selectedRapportoId, onSelectRapporto])

  const famigliaName = selectedFamiglia
    ? [selectedFamiglia.nome, selectedFamiglia.cognome].filter(Boolean).join(" ").trim() || null
    : null
  const rapportoName =
    selectedLavoratore && selectedFamiglia
      ? `${selectedLavoratore.nome ?? ""} ${selectedLavoratore.cognome ?? ""}`.trim() ||
        famigliaName ||
        null
      : selectedLavoratore
        ? `${selectedLavoratore.nome ?? ""} ${selectedLavoratore.cognome ?? ""}`.trim() || null
        : null

  const processi = selectedProcessi ?? []
  const primaryProcessId =
    selectedRapporto?.processi_matching_id ?? processi[0]?.id ?? null
  const ricercaLabel =
    processi.find((processo) => processo.id === primaryProcessId)?.titolo_annuncio ??
    processi[0]?.titolo_annuncio ??
    null

  useCommentRouteContext({
    enabled: Boolean(selectedRapportoId && selectedRapporto),
    pageFocus:
      selectedRapportoId && selectedRapporto
        ? { entityType: "rapporto", entityId: selectedRapportoId }
        : null,
    row:
      selectedRapportoId && selectedRapporto
        ? rapportoCommentRow(selectedRapportoId, selectedRapporto, {
            processId: primaryProcessId,
          })
        : {},
    sourceInterface: "rapporti_lavorativi",
    displayNames:
      selectedRapportoId && selectedRapporto
        ? rapportoDisplayNames(selectedRapportoId, {
            lavoratoreName: rapportoName,
            famigliaName: famigliaName,
            ricercaLabel,
            processId: primaryProcessId,
            rapporto: selectedRapporto,
          })
        : undefined,
  })

  return (
    <section className="ui grid h-full w-full min-w-0 min-h-0 gap-3 overflow-hidden px-4 pb-2 pt-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <RapportiListPanel
        rapporti={rapporti}
        totalCount={rapportiTotal}
        loading={loading}
        error={error}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        rapportoStatusFilter={rapportoStatusFilter}
        onRapportoStatusFilterChange={setRapportoStatusFilter}
        onRetry={retryRapporti}
        selectedRapportoId={selectedRapportoId}
        onSelect={setSelectedRapportoId}
        lookupColorsByDomain={lookupColorsByDomain}
        assunzioneNamesByRapporto={rapportoAssunzioneNames}
      />

      <div className="h-full min-h-0 overflow-hidden">
        <RapportoDetailPanel
        // Remount on rapporto switch so debounced inputs reset their local
        // draft (useDebouncedSave's hasUserEditedRef) instead of carrying it
        // across to a different rapporto.
        key={selectedRapportoId ?? "__empty__"}
        rapporto={selectedRapporto}
        loadingRapporto={loadingSelectedRapporto}
        famiglia={selectedFamiglia}
        lavoratore={selectedLavoratore}
        // Seed dai nomi già caricati per la lista così il titolo non fa flash
        // sul nome di fallback mentre il dettaglio carica le sue assunzioni.
        assunzioneNames={
          selectedAssunzioneNames ??
          (selectedRapportoId ? rapportoAssunzioneNames[selectedRapportoId] ?? null : null)
        }
        processi={processi}
        contributi={selectedContributi}
        mesi={selectedMesi}
        mesiCalendario={selectedMesiCalendario}
        pagamenti={selectedPagamenti}
        transazioni={selectedTransazioni}
        presenze={selectedPresenze}
        variazioni={selectedVariazioni}
        chiusure={selectedChiusure}
        tickets={selectedTickets}
        richiesteAttivazione={selectedRichiesteAttivazione}
        loadingRelated={loadingRelated}
        lookupColorsByDomain={lookupColorsByDomain}
        onCreateTicket={createTicketForSelectedRapporto}
        onRapportoUpdated={updateSelectedRapporto}
        />
      </div>
    </section>
  )
}
