import { useChiusureBoardView } from "../hooks/use-chiusure-board-view"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  chiusuraCommentRow,
  chiusuraDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { ChiusureBoardAnnullamentoDialog } from "./chiusure-board-annullamento-dialog"
import { ChiusureBoardContent } from "./chiusure-board-content"
import { ChiusureBoardHeader } from "./chiusure-board-header"
import { ChiusureDetailSheet } from "./chiusure-detail-sheet"

export function ChiusureBoardView() {
  const board = useChiusureBoardView()
  const selectedCard = board.sheetProps.card

  useCommentRouteContext({
    enabled: board.sheetProps.open && Boolean(selectedCard),
    pageFocus: selectedCard
      ? { entityType: "chiusura", entityId: selectedCard.id }
      : null,
    row: selectedCard ? chiusuraCommentRow(selectedCard) : {},
    sourceInterface: "chiusure",
    displayNames: selectedCard ? chiusuraDisplayNames(selectedCard) : undefined,
  })

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
