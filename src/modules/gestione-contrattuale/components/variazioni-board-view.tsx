import { useVariazioniBoardView } from "../hooks/use-variazioni-board-view"
import { VariazioniBoardContent } from "./variazioni-board-content"
import { VariazioniBoardHeader } from "./variazioni-board-header"
import { VariazioniCreateDialog } from "./variazioni-create-dialog"
import { VariazioniDetailSheet } from "./variazioni-detail-sheet"

export function VariazioniBoardView() {
  const board = useVariazioniBoardView()

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <VariazioniBoardHeader
          totalVariazioni={board.totalVariazioni}
          searchValue={board.searchValue}
          onSearchChange={board.setSearchValue}
          onSearchClear={() => board.setSearchValue("")}
          onOpenCreate={board.openCreateDialog}
        />

        <VariazioniBoardContent
          error={board.error}
          loading={board.loading}
          columns={board.filteredColumns}
          drag={board.drag}
          onCardClick={(card) => {
            void board.selectCard(card)
          }}
        />
      </section>

      <VariazioniDetailSheet {...board.sheetProps} />
      <VariazioniCreateDialog {...board.createDialogProps} />
    </>
  )
}
