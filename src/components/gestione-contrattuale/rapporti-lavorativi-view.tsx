import { RapportiListPanel } from "@/components/gestione-contrattuale/rapporti-list-panel"
import { RapportoDetailPanel } from "@/components/gestione-contrattuale/rapporto-detail-panel"
import { useRapportiLavorativiData } from "@/hooks/use-rapporti-lavorativi-data"

export function RapportiLavorativiView() {
  const {
    rapporti,
    rapportiTotal,
    loading,
    error,
    pageIndex,
    pageSize,
    setPageIndex,
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
  } = useRapportiLavorativiData()

  return (
    <section className="grid h-[calc(100vh-6.5rem)] min-h-0 gap-3 overflow-hidden xl:grid-cols-[22rem_minmax(0,1fr)]">
      <RapportiListPanel
        rapporti={rapporti}
        totalCount={rapportiTotal}
        loading={loading}
        error={error}
        pageIndex={pageIndex}
        pageSize={pageSize}
        onPageChange={setPageIndex}
        selectedRapportoId={selectedRapportoId}
        onSelect={setSelectedRapportoId}
        lookupColorsByDomain={lookupColorsByDomain}
      />

      <RapportoDetailPanel
        rapporto={selectedRapporto}
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
        loadingRelated={loadingRelated}
        lookupColorsByDomain={lookupColorsByDomain}
      />
    </section>
  )
}
