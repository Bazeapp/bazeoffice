import { useChiusureBoardView } from "../hooks/use-chiusure-board-view"
import { ChiusureBoardAnnullamentoDialog } from "./chiusure-board-annullamento-dialog"
import { ChiusureBoardContent } from "./chiusure-board-content"
import { ChiusureBoardHeader } from "./chiusure-board-header"
import { ChiusureDetailSheet } from "./chiusure-detail-sheet"

export function ChiusureBoardView() {
  const board = useChiusureBoardView()

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <ChiusureBoardHeader
          totalChiusure={board.totalChiusure}
          searchValue={board.searchValue}
          onSearchChange={board.setSearchValue}
          onSearchClear={() => board.setSearchValue("")}
          onOpenAnnullamento={board.openAnnullamentoDialog}
        />

        <ChiusureBoardContent
          error={board.error}
          loading={board.loading}
          columns={board.filteredColumns}
          drag={board.drag}
          onCardClick={(card) => {
            void board.selectCard(card)
          }}
        />
      </section>

      <ChiusureDetailSheet {...board.sheetProps} />
      <ChiusureBoardAnnullamentoDialog {...board.annullamentoDialogProps} />
    </>
  )
}
