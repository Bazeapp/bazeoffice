import { SectionHeader } from "@/components/shared-next/section-header"
import { SearchInput } from "@/components/ui/search-input"

import { useRiattivazioniBoardView } from "../hooks/use-riattivazioni-board-view"
import { RiattivazioniBoardKanban } from "./riattivazioni-board-kanban"
import { RiattivazioniDetailSheet } from "./riattivazioni-detail-sheet"

export function RiattivazioniBoardView() {
  const view = useRiattivazioniBoardView()

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <SectionHeader>
          <SectionHeader.Title
            subtitle={`${view.header.totalRiattivazioni} ${
              view.header.totalRiattivazioni === 1 ? "chiusura" : "chiusure"
            }`}
          >
            Riattivazioni
          </SectionHeader.Title>
          <SectionHeader.Toolbar>
            <SearchInput
              className="md:max-w-sm"
              data-testid="riattivazioni-search-input"
              placeholder="Cerca per famiglia, lavoratore, email, motivazione..."
              value={view.header.searchValue}
              onChange={(event) => view.header.setSearchValue(event.target.value)}
              onClear={() => view.header.setSearchValue("")}
            />
          </SectionHeader.Toolbar>
        </SectionHeader>

        {view.error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento riattivazioni: {view.error}
          </div>
        ) : null}

        <RiattivazioniBoardKanban {...view.kanban} />
      </section>

      <RiattivazioniDetailSheet
        key={view.detailSheet.selectedCardId ?? "__empty__"}
        card={view.detailSheet.card}
        columns={view.detailSheet.columns}
        open={view.detailSheet.open}
        onOpenChange={view.detailSheet.onOpenChange}
        onStatusChange={view.detailSheet.onStatusChange}
        onCardChange={view.detailSheet.onCardChange}
      />
    </>
  )
}
