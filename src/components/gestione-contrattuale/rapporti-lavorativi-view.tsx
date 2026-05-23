import { RapportiListPanel } from "@/components/gestione-contrattuale/rapporti-list-panel"
import { RapportoDetailPanel } from "@/components/gestione-contrattuale/rapporto-detail-panel"
import { useRapportiLavorativiData } from "@/hooks/use-rapporti-lavorativi-data"

type RapportiLavorativiViewProps = {
  initialSelectedRapportoId?: string | null
}

export function RapportiLavorativiView({
  initialSelectedRapportoId = null,
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
  } = useRapportiLavorativiData({ initialSelectedRapportoId })

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
      />

      <RapportoDetailPanel
        // Remount on rapporto switch so debounced inputs reset their local
        // draft (useDebouncedSave's hasUserEditedRef) instead of carrying it
        // across to a different rapporto.
        key={selectedRapportoId ?? "__empty__"}
        rapporto={selectedRapporto}
        loadingRapporto={loadingSelectedRapporto}
        famiglia={selectedFamiglia}
        lavoratore={selectedLavoratore}
        processi={selectedProcessi}
        contributi={selectedContributi}
        mesi={selectedMesi}
        mesiCalendario={selectedMesiCalendario}
        pagamenti={selectedPagamenti}
        presenze={selectedPresenze}
        variazioni={selectedVariazioni}
        chiusure={selectedChiusure}
        tickets={selectedTickets}
        richiesteAttivazione={selectedRichiesteAttivazione}
        loadingRelated={loadingRelated}
        loadingSections={loadingRelatedSections}
        lookupColorsByDomain={lookupColorsByDomain}
        onSectionActive={ensureRelatedSectionLoaded}
        onCreateTicket={createTicketForSelectedRapporto}
      />
    </section>
  )
}
